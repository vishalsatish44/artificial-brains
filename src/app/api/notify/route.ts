import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const SP_URL = 'https://api.sagepilot.ai/send-whatsapp-template';

function cleanPhone(phone: string) {
  return String(phone ?? '').replace(/\D/g, '');
}

function spHeaders() {
  return {
    Authorization: `Bearer ${process.env.SAGEPILOT_API_KEY}`,
    'X-SP-Workspace-Id': process.env.SAGEPILOT_WORKSPACE_ID ?? '',
    'Content-Type': 'application/json',
  };
}

function spPayload(phone: string, name: string, templateName: string, variables: string[]) {
  return {
    customer_phone: cleanPhone(phone),
    customer_name: name || 'Parent',
    message_type: 'template',
    channel_id: process.env.SAGEPILOT_CHANNEL_ID,
    template_name: templateName,
    parameter_type: 'list',
    parameters: [
      {
        type: 'body',
        parameters: variables.map((v) => ({ type: 'text', text: String(v ?? '') })),
      },
    ],
  };
}

async function logNotification(demoBookingId: string | undefined, notificationId: string | undefined, channel: string, status: string) {
  if (notificationId) {
    await supabase.from('notifications_log').update({ status }).eq('id', notificationId);
  } else if (demoBookingId) {
    await supabase
      .from('notifications_log')
      .update({ status })
      .eq('demo_booking_id', demoBookingId)
      .eq('channel', channel)
      .eq('status', 'pending');
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    notificationId,
    demoBookingId,
    channel = 'whatsapp',
    // WhatsApp via Sagepilot
    phone,
    name,
    templateName,
    variables = [],
    // Slack (team alerts — unchanged)
    recipient,
    message,
  } = body;

  // ── Slack path ─────────────────────────────────────────────────────────────
  if (channel === 'slack') {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl.includes('...')) {
      return NextResponse.json({ ok: false, error: 'SLACK_WEBHOOK_URL not configured' }, { status: 400 });
    }
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });
      const sent = res.ok;
      await logNotification(demoBookingId, notificationId, 'slack', sent ? 'sent' : 'failed');
      return NextResponse.json({ ok: sent, error: sent ? undefined : `Slack ${res.status}` });
    } catch (e) {
      await logNotification(demoBookingId, notificationId, 'slack', 'failed');
      return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
  }

  // ── WhatsApp via Sagepilot ─────────────────────────────────────────────────
  const toPhone = phone || recipient;
  if (!process.env.SAGEPILOT_API_KEY) {
    return NextResponse.json({ ok: false, error: 'SAGEPILOT_API_KEY not configured' }, { status: 400 });
  }
  if (!toPhone) {
    return NextResponse.json({ ok: false, error: 'phone is required' }, { status: 400 });
  }
  if (!templateName) {
    return NextResponse.json({ ok: false, error: 'templateName is required' }, { status: 400 });
  }

  try {
    const payload = spPayload(toPhone, name ?? '', templateName, variables);
    const res = await fetch(SP_URL, {
      method: 'POST',
      headers: spHeaders(),
      body: JSON.stringify(payload),
    });
    const sent = res.status === 200 || res.status === 201;
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();

    await logNotification(demoBookingId, notificationId, 'whatsapp', sent ? 'sent' : 'failed');
    return NextResponse.json({ ok: sent, data, error: sent ? undefined : data });
  } catch (e) {
    await logNotification(demoBookingId, notificationId, 'whatsapp', 'failed');
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
