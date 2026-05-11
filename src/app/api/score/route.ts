import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { computeScore, buildParentReminderMessage, buildTeamAlertMessage, type ScoreInput } from '@/lib/score';

/**
 * POST /api/score
 * Body: { demoBokingId: string }
 * Re-scores a single booking and returns the result.
 * Also queues notifications if duplicate detected.
 */
export async function POST(req: NextRequest) {
  const { demoBookingId } = await req.json();
  if (!demoBookingId) {
    return NextResponse.json({ ok: false, error: 'demoBookingId required' }, { status: 400 });
  }

  // Fetch the booking
  const { data: booking, error: bErr } = await supabase
    .from('demo_bookings')
    .select('*')
    .eq('id', demoBookingId)
    .single();

  if (bErr || !booking) {
    return NextResponse.json({ ok: false, error: 'Booking not found' }, { status: 404 });
  }

  // Count previous demos for same student
  const { count: prevCount } = await supabase
    .from('demo_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', booking.student_id)
    .neq('id', booking.id);

  // Check purchase history
  const { count: purchaseCount } = await supabase
    .from('after_sales')
    .select('id', { count: 'exact', head: true })
    .eq('demo_booking_id', booking.id);

  // Fetch previous bookings for context
  const { data: prevBookings } = await supabase
    .from('demo_bookings')
    .select('id, demo_datetime_cx, demo_subject, presales_agent_name')
    .eq('student_id', booking.student_id)
    .neq('id', booking.id)
    .order('demo_datetime_cx', { ascending: false })
    .limit(3);

  const input: ScoreInput = {
    priorBooking:       booking.prior_booking === 'Yes',
    reschedulingDemo:   booking.rescheduling_demo === 'Yes',
    trialClassesTaken:  booking.trial_classes_already_taken ?? 0,
    leadSource:         booking.lead_source ?? '',
    previousDemoCount:  prevCount ?? 0,
    hasPurchased:       (purchaseCount ?? 0) > 0,
    reasonNotBought:    booking.reason_not_bought_before ?? [],
    saleWithoutDemo:    booking.sale_without_demo ?? false,
    competitiveExam:    booking.competitive_exam ?? false,
    qualityOfData:      booking.quality_of_data ?? '',
  };

  const scored = computeScore(input);

  // Upsert score — add 1 for prior_booking so min_demos filter catches it
  const effectiveDemoCount = (prevCount ?? 0) + 1 + (input.priorBooking ? 1 : 0);
  const { error: scoreErr } = await supabase.from('ai_lead_scores').upsert({
    demo_booking_id:     booking.id,
    student_id:          booking.student_id,
    score:               scored.score,
    score_label:         scored.label,
    duplicate_detected:  scored.duplicateDetected,
    demo_count:          effectiveDemoCount,
    total_demos_claimed: booking.trial_classes_already_taken ?? 0,
    previous_demo_dates: (prevBookings ?? []).map((b) => b.demo_datetime_cx).filter(Boolean),
    flags:               scored.flags,
    scored_at:           new Date().toISOString(),
  }, { onConflict: 'demo_booking_id' });

  if (scoreErr) return NextResponse.json({ ok: false, error: scoreErr.message }, { status: 500 });

  // Build notification messages if duplicate
  let parentMessage: string | null = null;
  let teamMessage: string | null = null;

  if (scored.duplicateDetected && prevBookings && prevBookings.length > 0) {
    const lastDemo = prevBookings[0];

    parentMessage = buildParentReminderMessage({
      guardianName:    booking.guardian_name ?? 'Sir/Ma\'am',
      previousDemoDate: lastDemo.demo_datetime_cx
        ? new Date(lastDemo.demo_datetime_cx).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'a previous date',
      teacherName:     'our teacher',
      previousPackage: 'previously discussed package',
    });

    teamMessage = buildTeamAlertMessage({
      guardianName:    booking.guardian_name ?? 'Unknown',
      studentName:     booking.student_name ?? 'Unknown',
      phone:           booking.student_contact ?? booking.whatsapp_contact ?? 'N/A',
      demoCount:       (prevCount ?? 0) + 1,
      lastDemoDate:    lastDemo.demo_datetime_cx
        ? new Date(lastDemo.demo_datetime_cx).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Unknown',
      previousTeacher: 'N/A',
      previousPackage: 'Previously discussed',
      score:           scored.score,
      flags:           scored.flags,
    });

    // Log notification (actual sending wired later via WhatsApp/Slack API)
    await supabase.from('notifications_log').insert([
      {
        demo_booking_id:   booking.id,
        student_id:        booking.student_id,
        notification_type: 'team_alert',
        channel:           'slack',
        recipient:         '#presales-alerts',
        message_body:      teamMessage,
        status:            'pending',
      },
      {
        demo_booking_id:   booking.id,
        student_id:        booking.student_id,
        notification_type: 'parent_reminder',
        channel:           'whatsapp',
        recipient:         booking.whatsapp_contact ?? booking.student_contact ?? '',
        message_body:      parentMessage,
        status:            'pending',
      },
    ]);
  }

  return NextResponse.json({
    ok: true,
    score: scored.score,
    label: scored.label,
    flags: scored.flags,
    duplicateDetected: scored.duplicateDetected,
    parentMessage,
    teamMessage,
  });
}
