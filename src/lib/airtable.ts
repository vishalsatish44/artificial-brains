/**
 * Airtable fetch helpers.
 * Uses the REST API directly (no SDK needed server-side) so we keep the
 * bundle small and avoid credential leaks to the browser.
 */

const API_KEY  = process.env.VITE_AIRTABLE_API_KEY  ?? '';
const BASE_ID  = process.env.VITE_AIRTABLE_BASE_ID  ?? '';
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

export const TABLE_DEMO_BOOKING = process.env.VITE_AIRTABLE_TABLE_DEMO_BOOKING ?? 'Demo Booking Form';
export const TABLE_AFTER_SALES  = process.env.VITE_AIRTABLE_TABLE_AFTER_SALES  ?? 'After Sales Form';
export const TABLE_TEACHERS     = 'Teachers';

export type AirtableRecord<T = Record<string, unknown>> = {
  id: string;
  createdTime: string;
  fields: T;
};

/** Fetch all records from a table, handling pagination automatically */
export async function fetchAllRecords<T = Record<string, unknown>>(
  tableName: string,
  opts: { filterByFormula?: string; sort?: Array<{ field: string; direction?: 'asc' | 'desc' }> } = {}
): Promise<AirtableRecord<T>[]> {
  const records: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (opts.filterByFormula) params.set('filterByFormula', opts.filterByFormula);
    if (opts.sort) {
      opts.sort.forEach((s, i) => {
        params.set(`sort[${i}][field]`, s.field);
        params.set(`sort[${i}][direction]`, s.direction ?? 'asc');
      });
    }
    if (offset) params.set('offset', offset);

    const res = await fetch(
      `${BASE_URL}/${encodeURIComponent(tableName)}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable fetch error [${tableName}]: ${res.status} ${err}`);
    }

    const data = await res.json() as { records: AirtableRecord<T>[]; offset?: string };
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

/** Fetch records modified since a given ISO date — uses Airtable's LAST_MODIFIED_TIME() */
export async function fetchRecordsSince<T = Record<string, unknown>>(
  tableName: string,
  since: string
): Promise<AirtableRecord<T>[]> {
  return fetchAllRecords<T>(tableName, {
    filterByFormula: `IS_AFTER(LAST_MODIFIED_TIME(), "${since}")`,
  });
}

// ---------------------------------------------------------------------------
// Typed field extractors — map raw Airtable fields to our domain model
// ---------------------------------------------------------------------------

export type DemoBookingFields = {
  'Student Name'?: string;
  'Student Email ID'?: string;
  'Student Contact Number'?: string;
  'Whatsapp Contact Number'?: string;
  'Guardian Name'?: string;
  "Guardian's relation"?: string;
  'Country'?: string;
  'City'?: string;
  'Country Code'?: string;
  'School'?: string;
  "Student's Year"?: string;
  'Student Time Zone'?: string;
  'Pre sales agent name'?: string[];
  'PS Email ID'?: string;
  'Lead source'?: string;
  'Prior booking'?: string;
  'Rescheduling Demo'?: string;
  'Sale w/o Demo'?: string;
  'Quality of data'?: string;
  'Whatsapp ?'?: boolean;
  'Competitive exam'?: string;
  'Select Exams'?: string[];
  'Marketing Source'?: string;
  'Campaign Name'?: string;
  'Sheet URL'?: string;
  'Channel Name'?: string[];
  'No. of trial classes already taken'?: number;
  'Experience of previous trial class'?: string;
  'Reason for not buying it before'?: string[];
  'Demo Session Subject'?: string;
  'Demo Class Date and time (CX TZ)'?: string;
  'Demo Class Date and Time (IST Time Zone)'?: string;
  'Preferred topic for demo session'?: string;
  'Mention your conversation with parents in detail'?: string;
  'Form filling time'?: string;
  'Sent to DST'?: boolean;
  'Student ID'?: string;
  'Demo booking ID'?: string;
};

export type AfterSalesFields = {
  'Batch ID'?: string;
  'Subject Enrolled for'?: string;
  'Your Name'?: string;
  'Lead Channel'?: string;
  'Lead source'?: string;
  'Enrollment Date'?: string;
  'Type of enrollment'?: string;
  'No of classes included in payment'?: number;
  'No of classes sold monthly'?: string;
  'Payment Amount in Customer\'s Currency'?: number;
  'Currency'?: string;
  'Mode of payment'?: string;
  'Payment Option'?: string;
  'Collection in INR'?: number;
  'Payment ID'?: string;
  'Is this a referral lead'?: string;
  'Referral Channel'?: string[];
  'Whatsapp Group Name'?: string;
  'Onboarding Message Sent'?: boolean;
  'Onboarding Mail Sent'?: boolean;
  'Onboarding Date and Time'?: string;
  'Siblings Already enrolled'?: string;
  'Student ID'?: string[];  // linked records
};

export type TeacherFields = {
  "Teacher's Name"?: string;
  "Teacher's Email ID"?: string;
  "Teacher's contact number"?: string;
  'Subject 1'?: string;
  'Subject 2'?: string;
  'Subject 3'?: string;
  'Subject 4'?: string;
  'Subject 5'?: string;
  'Subject 6'?: string;
  'Subject 7'?: string;
  'Teacher ID'?: string;
  'Status'?: string;
};
