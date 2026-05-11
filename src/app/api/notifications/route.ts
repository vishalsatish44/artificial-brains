import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit  = parseInt(searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  let query = supabase
    .from('notifications_log')
    .select(`
      id,
      demo_booking_id,
      notification_type,
      channel,
      recipient,
      message_body,
      status,
      created_at,
      demo_bookings (
        student_name,
        guardian_name,
        student_contact
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [], count });
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ ok: false, error: 'id and status required' }, { status: 400 });

  const { error } = await supabase
    .from('notifications_log')
    .update({ status })
    .eq('id', id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
