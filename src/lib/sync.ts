/**
 * Airtable → Supabase Sync Service  (batched edition)
 *
 * Key design:
 *  - All Supabase writes are batched (100 rows per API call) not 1-by-1
 *  - Student dedup is done in-memory after a single bulk SELECT
 *  - After-sales linkage resolved with a single bulk SELECT
 *  - Scoring runs in parallel batches of 50
 *
 * Result: ~100 API calls total instead of 12,000+
 */

import { supabaseAdmin as supabase } from './supabase';
import {
  fetchAllRecords,
  fetchRecordsSince,
  TABLE_DEMO_BOOKING,
  TABLE_AFTER_SALES,
  TABLE_TEACHERS,
  type DemoBookingFields,
  type AfterSalesFields,
  type TeacherFields,
} from './airtable';
import { computeScore, type ScoreInput } from './score';

const BATCH = 100;

export type SyncResult = {
  demoBookings: { fetched: number; upserted: number };
  afterSales:   { fetched: number; upserted: number };
  teachers:     { fetched: number; upserted: number };
  scored:       number;
  errors:       string[];
};

async function batchUpsert(
  table: string,
  rows: Record<string, unknown>[],
  conflictCol: string,
  errors: string[]
): Promise<number> {
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictCol });
    if (error) errors.push(`${table} batch[${i}]: ${error.message}`);
    else upserted += chunk.length;
  }
  return upserted;
}

export async function runFullSync(since?: string): Promise<SyncResult> {
  const result: SyncResult = {
    demoBookings: { fetched: 0, upserted: 0 },
    afterSales:   { fetched: 0, upserted: 0 },
    teachers:     { fetched: 0, upserted: 0 },
    scored: 0,
    errors: [],
  };
  const startedAt = new Date().toISOString();

  // ── 1. Teachers ────────────────────────────────────────────────────────────
  try {
    const records = since
      ? await fetchRecordsSince<TeacherFields>(TABLE_TEACHERS, since)
      : await fetchAllRecords<TeacherFields>(TABLE_TEACHERS);

    result.teachers.fetched = records.length;

    const rows = records.map((r) => {
      const f = r.fields;
      const subjects = ['Subject 1','Subject 2','Subject 3','Subject 4','Subject 5','Subject 6','Subject 7']
        .map((k) => f[k as keyof TeacherFields] as string | undefined)
        .filter(Boolean) as string[];
      return {
        airtable_record_id: r.id,
        teacher_id_code:    f['Teacher ID'] ?? null,
        teacher_name:       f["Teacher's Name"] ?? 'Unknown',
        teacher_email:      f["Teacher's Email ID"] ?? null,
        teacher_contact:    f["Teacher's contact number"] ?? null,
        subjects,
        status:             f['Status'] ?? null,
        airtable_synced_at: new Date().toISOString(),
      };
    });

    result.teachers.upserted = await batchUpsert('teachers', rows, 'airtable_record_id', result.errors);
  } catch (e: unknown) {
    result.errors.push(`Teachers: ${(e as Error).message}`);
  }

  // ── 2. Demo Bookings ───────────────────────────────────────────────────────
  // Strip everything except digits for phone comparison — catches (778) 922-1060 vs 7789221060
  const normPhone = (v: unknown) => String(v ?? '').replace(/\D/g, '');

  let demoRecords: Awaited<ReturnType<typeof fetchAllRecords<DemoBookingFields>>> = [];
  try {
    demoRecords = since
      ? await fetchRecordsSince<DemoBookingFields>(TABLE_DEMO_BOOKING, since)
      : await fetchAllRecords<DemoBookingFields>(TABLE_DEMO_BOOKING, {
          sort: [{ field: 'Form filling time', direction: 'asc' }],
        });

    result.demoBookings.fetched = demoRecords.length;

    // ── Build student rows (dedup in-memory) ──────────────────────────────
    // Step A: collect unique contacts & emails from all records
    const contactSet = new Set<string>();
    const emailSet   = new Set<string>();
    for (const r of demoRecords) {
      const c = normPhone(r.fields['Student Contact Number']);
      const e = String(r.fields['Student Email ID'] ?? '').toLowerCase().trim();
      if (c) contactSet.add(c);
      if (e) emailSet.add(e);
    }

    // Step B: fetch existing students in bulk
    const existingMap = new Map<string, string>(); // contact|email → student uuid
    if (contactSet.size > 0 || emailSet.size > 0) {
      const contacts = [...contactSet];
      const emails   = [...emailSet];
      // Supabase .in() supports arrays — do two queries and merge
      const [byContact, byEmail] = await Promise.all([
        contacts.length
          ? supabase.from('students').select('id, student_contact, whatsapp_contact, student_email')
              .in('student_contact', contacts)
          : Promise.resolve({ data: [] }),
        emails.length
          ? supabase.from('students').select('id, student_contact, whatsapp_contact, student_email')
              .in('student_email', emails)
          : Promise.resolve({ data: [] }),
      ]);
      for (const row of [...(byContact.data ?? []), ...(byEmail.data ?? [])]) {
        if (row.student_contact) existingMap.set(row.student_contact, row.id);
        if (row.whatsapp_contact) existingMap.set(row.whatsapp_contact, row.id);
        if (row.student_email)   existingMap.set(row.student_email, row.id);
      }
    }

    // Step C: build new student rows (skip those already in DB)
    const newStudentRows: Record<string, unknown>[] = [];
    // airtable_record_id → student uuid (for newly inserted ones)
    const newStudentMap = new Map<string, string>();

    for (const r of demoRecords) {
      const f = r.fields;
      const contact = normPhone(f['Student Contact Number']);
      const email   = String(f['Student Email ID'] ?? '').toLowerCase().trim();
      const key     = contact || email;
      if (!key) continue;
      if (existingMap.has(contact) || existingMap.has(email)) continue;
      // Not in DB yet — queue for insert (avoid dupes within this batch)
      if (newStudentRows.some((s) => s.airtable_record_id === r.id)) continue;
      newStudentRows.push({
        airtable_record_id: r.id,
        student_id_formula: f['Student ID'] ?? null,
        student_name:       String(f['Student Name'] ?? '').trim() || null,
        student_email:      email || null,
        student_contact:    contact || null,
        whatsapp_contact:   String(f['Whatsapp Contact Number'] ?? '').replace(/\s+/g, '') || null,
        guardian_name:      f['Guardian Name'] ?? null,
        guardian_relation:  f["Guardian's relation"] ?? null,
        country:            f['Country'] ?? null,
        city:               f['City'] ?? null,
        country_code:       f['Country Code'] ?? null,
        school:             f['School'] ?? null,
        grade:              f["Student's Year"] ?? null,
        airtable_synced_at: new Date().toISOString(),
      });
    }

    // Step D: batch upsert students (safe for re-runs)
    for (let i = 0; i < newStudentRows.length; i += BATCH) {
      const chunk = newStudentRows.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from('students')
        .upsert(chunk, { onConflict: 'airtable_record_id' })
        .select('id, student_contact, student_email, airtable_record_id');
      if (error) {
        result.errors.push(`students upsert batch[${i}]: ${error.message}`);
      } else {
        for (const row of data ?? []) {
          if (row.student_contact) existingMap.set(row.student_contact, row.id);
          if (row.student_email)   existingMap.set(row.student_email, row.id);
          newStudentMap.set(row.airtable_record_id, row.id);
        }
      }
    }

    // Step E: build demo_booking rows
    const bookingRows = demoRecords.map((r) => {
      const f = r.fields;
      const contact = normPhone(f['Student Contact Number']);
      const email   = String(f['Student Email ID'] ?? '').toLowerCase().trim();
      const studentId =
        existingMap.get(contact) ??
        existingMap.get(email) ??
        newStudentMap.get(r.id) ??
        null;

      return {
        airtable_record_id:          r.id,
        student_id:                  studentId,
        student_name:                String(f['Student Name'] ?? '').trim() || null,
        student_email:               email || null,
        student_contact:             contact || null,
        whatsapp_contact:            String(f['Whatsapp Contact Number'] ?? '').replace(/\s+/g, '') || null,
        guardian_name:               f['Guardian Name'] ?? null,
        guardian_relation:           f["Guardian's relation"] ?? null,
        country:                     f['Country'] ?? null,
        city:                        f['City'] ?? null,
        country_code:                f['Country Code'] ?? null,
        school:                      f['School'] ?? null,
        grade:                       f["Student's Year"] ?? null,
        student_timezone:            f['Student Time Zone'] ?? null,
        presales_agent_name:         f['Pre sales agent name'] ?? [],
        ps_email:                    f['PS Email ID'] ?? null,
        lead_source:                 f['Lead source'] ?? null,
        prior_booking:               f['Prior booking'] ?? null,
        rescheduling_demo:           f['Rescheduling Demo'] ?? null,
        sale_without_demo:           String(f['Sale w/o Demo'] ?? '').trim().toLowerCase() === 'yes',
        quality_of_data:             f['Quality of data'] ?? null,
        whatsapp_enabled:            f['Whatsapp ?'] ?? false,
        competitive_exam:            f['Competitive exam'] === 'Yes',
        select_exams:                f['Select Exams'] ?? [],
        marketing_source:            f['Marketing Source'] ?? null,
        campaign_name:               f['Campaign Name'] ?? null,
        sheet_url:                   f['Sheet URL'] ?? null,
        channel_name:                f['Channel Name'] ?? [],
        trial_classes_already_taken: f['No. of trial classes already taken'] ?? 0,
        previous_experience:         f['Experience of previous trial class'] ?? null,
        reason_not_bought_before:    f['Reason for not buying it before'] ?? [],
        demo_subject:                f['Demo Session Subject'] ?? null,
        demo_datetime_cx:            f['Demo Class Date and time (CX TZ)'] ?? null,
        demo_datetime_ist:           f['Demo Class Date and Time (IST Time Zone)'] ?? null,
        preferred_topic:             f['Preferred topic for demo session'] ?? null,
        conversation_notes:          f['Mention your conversation with parents in detail'] ?? null,
        form_filled_at:              f['Form filling time'] ?? null,
        sent_to_dst:                 f['Sent to DST'] ?? false,
        airtable_synced_at:          new Date().toISOString(),
      };
    });

    result.demoBookings.upserted = await batchUpsert(
      'demo_bookings', bookingRows, 'airtable_record_id', result.errors
    );
  } catch (e: unknown) {
    result.errors.push(`DemoBookings: ${(e as Error).message}`);
  }

  // ── 3. After Sales ─────────────────────────────────────────────────────────
  try {
    const asRecords = since
      ? await fetchRecordsSince<AfterSalesFields>(TABLE_AFTER_SALES, since)
      : await fetchAllRecords<AfterSalesFields>(TABLE_AFTER_SALES);

    result.afterSales.fetched = asRecords.length;

    // Collect all linked student (demo booking) airtable IDs
    const linkedIds = new Set<string>();
    for (const r of asRecords) {
      const ids = (r.fields['Student ID'] as unknown as string[] | undefined) ?? [];
      ids.forEach((id) => linkedIds.add(id));
    }

    // Bulk resolve linked airtable_record_ids → supabase UUIDs
    const linkedMap = new Map<string, string>(); // airtable_record_id → uuid
    if (linkedIds.size > 0) {
      const { data } = await supabase
        .from('demo_bookings')
        .select('id, airtable_record_id')
        .in('airtable_record_id', [...linkedIds]);
      for (const row of data ?? []) {
        linkedMap.set(row.airtable_record_id, row.id);
      }
    }

    const asRows = asRecords.map((r) => {
      const f = r.fields;
      const linkedAirtableIds = (f['Student ID'] as unknown as string[] | undefined) ?? [];
      const demoBId = linkedAirtableIds.length ? (linkedMap.get(linkedAirtableIds[0]) ?? null) : null;

      return {
        airtable_record_id:      r.id,
        demo_booking_id:         demoBId,
        batch_id:                f['Batch ID'] ?? null,
        subject_enrolled:        f['Subject Enrolled for'] ?? null,
        sales_person_name:       f['Your Name'] ?? null,
        lead_channel:            f['Lead Channel'] ?? null,
        lead_source:             f['Lead source'] ?? null,
        enrollment_date:         f['Enrollment Date'] ?? null,
        type_of_enrollment:      f['Type of enrollment'] ?? null,
        classes_included:        f['No of classes included in payment'] ?? null,
        classes_sold_monthly:    f['No of classes sold monthly'] ?? null,
        payment_amount:          f["Payment Amount in Customer's Currency"] ?? null,
        currency:                f['Currency'] ?? null,
        mode_of_payment:         f['Mode of payment'] ?? null,
        payment_option:          f['Payment Option'] ?? null,
        collection_inr:          f['Collection in INR'] ?? null,
        payment_id:              f['Payment ID'] ?? null,
        is_referral:             f['Is this a referral lead'] === 'Yes',
        referral_channel:        f['Referral Channel'] ?? [],
        whatsapp_group_name:     f['Whatsapp Group Name'] ?? null,
        onboarding_message_sent: f['Onboarding Message Sent'] ?? false,
        onboarding_mail_sent:    f['Onboarding Mail Sent'] ?? false,
        onboarding_datetime:     f['Onboarding Date and Time'] ?? null,
        siblings_enrolled:       f['Siblings Already enrolled'] === 'Yes',
        airtable_synced_at:      new Date().toISOString(),
      };
    });

    result.afterSales.upserted = await batchUpsert(
      'after_sales', asRows, 'airtable_record_id', result.errors
    );
  } catch (e: unknown) {
    result.errors.push(`AfterSales: ${(e as Error).message}`);
  }

  // ── 4. Score all synced bookings (batched) ─────────────────────────────────
  try {
    // Paginate past Supabase's 1000-row server cap
    const PAGE = 1000;
    const allBookings: Array<{
      id: string; student_id: string; prior_booking: string; rescheduling_demo: string;
      trial_classes_already_taken: number; lead_source: string; sale_without_demo: boolean;
      competitive_exam: boolean; quality_of_data: string;
    }> = [];
    for (let page = 0; ; page++) {
      const { data, error } = await supabase
        .from('demo_bookings')
        .select('id, student_id, prior_booking, rescheduling_demo, trial_classes_already_taken, lead_source, sale_without_demo, competitive_exam, quality_of_data')
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (error || !data || data.length === 0) break;
      allBookings.push(...data);
      if (data.length < PAGE) break;
    }

    if (allBookings.length > 0) {
      // Get demo count per student (paginated)
      const studentIds = [...new Set(allBookings.map((b) => b.student_id).filter(Boolean))];
      const demoCountRows: Array<{ student_id: string }> = [];
      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from('demo_bookings')
          .select('student_id')
          .in('student_id', studentIds)
          .range(page * PAGE, (page + 1) * PAGE - 1);
        if (error || !data || data.length === 0) break;
        demoCountRows.push(...data);
        if (data.length < PAGE) break;
      }

      const demoCountMap = new Map<string, number>();
      for (const row of demoCountRows) {
        demoCountMap.set(row.student_id, (demoCountMap.get(row.student_id) ?? 0) + 1);
      }

      // Get purchased students in one query
      const { data: purchasedRows } = await supabase
        .from('after_sales')
        .select('demo_booking_id');
      const purchasedSet = new Set((purchasedRows ?? []).map((r) => r.demo_booking_id).filter(Boolean));

      // Build score rows
      const scoreRows = allBookings.map((booking) => {
        const totalDemos = demoCountMap.get(booking.student_id) ?? 1;
        const priorVal = String(booking.prior_booking ?? '').trim().toLowerCase();
        const reschedVal = String(booking.rescheduling_demo ?? '').trim().toLowerCase();
        const input: ScoreInput = {
          priorBooking:       priorVal === 'yes' || priorVal === 'true',
          reschedulingDemo:   reschedVal === 'yes' || reschedVal === 'true',
          trialClassesTaken:  booking.trial_classes_already_taken ?? 0,
          leadSource:         booking.lead_source ?? '',
          previousDemoCount:  Math.max(0, totalDemos - 1),
          hasPurchased:       purchasedSet.has(booking.id),
          reasonNotBought:    [],
          saleWithoutDemo:    booking.sale_without_demo ?? false,
          competitiveExam:    booking.competitive_exam ?? false,
          qualityOfData:      booking.quality_of_data ?? '',
        };
        const scored = computeScore(input);
        // Add 1 for prior_booking so the min_demos filter (>= 2) catches these records
        const effectiveDemoCount = totalDemos + (input.priorBooking ? 1 : 0);
        return {
          demo_booking_id:     booking.id,
          student_id:          booking.student_id,
          score:               scored.score,
          score_label:         scored.label,
          duplicate_detected:  scored.duplicateDetected,
          demo_count:          effectiveDemoCount,
          total_demos_claimed: booking.trial_classes_already_taken ?? 0,
          flags:               scored.flags,
          scored_at:           new Date().toISOString(),
        };
      });

      result.scored = await batchUpsert(
        'ai_lead_scores', scoreRows, 'demo_booking_id', result.errors
      );
    }
  } catch (e: unknown) {
    result.errors.push(`Scoring: ${(e as Error).message}`);
  }

  // ── 5. Write sync_log ─────────────────────────────────────────────────────
  await supabase.from('sync_logs').insert({
    airtable_table_name: 'full_sync',
    records_fetched:     result.demoBookings.fetched + result.afterSales.fetched,
    records_upserted:    result.demoBookings.upserted + result.afterSales.upserted,
    status:              result.errors.length === 0 ? 'success' : 'partial',
    error_message:       result.errors.length > 0 ? result.errors.slice(0, 3).join('\n') : null,
    started_at:          startedAt,
    completed_at:        new Date().toISOString(),
  });

  return result;
}
