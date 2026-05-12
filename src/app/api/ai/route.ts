import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_BASE, oneShot, multiTurn } from '@/lib/gemini';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// Words that are never names — filter these out before doing a lead lookup
const STOP_WORDS = new Set([
  'how','many','what','when','where','which','who','why','the','and','has','have',
  'does','did','was','were','from','for','that','this','with','are','been','being',
  'take','took','give','show','tell','demos','leads','lead','demo','score','grade',
  'subject','total','count','number','list','all','any','about','their','last','most',
  'least','top','bottom','more','less','than','show','can','you','tell','me','find',
  'search','look','get','give','our','your','its','his','her','they','them','best',
  'worst','high','low','good','bad','repeated','moderate','quality','agent','agents',
  'student','students','parent','parents','booked','booking','bookings','enrolled',
]);

// Search demo_bookings for leads whose name contains any of the query words
async function findLeadsByName(question: string): Promise<string> {
  const words = question
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  if (words.length === 0) return '';

  const seen = new Set<string>();
  const results: Record<string, unknown>[] = [];

  for (const word of words.slice(0, 5)) {
    const { data } = await supabase
      .from('demo_bookings')
      .select(`
        id, student_name, guardian_name, student_contact, demo_subject,
        grade, country, city, lead_source, form_filled_at, presales_agent_name,
        ai_lead_scores ( score, score_label, demo_count, duplicate_detected )
      `)
      .or(`student_name.ilike.%${word}%,guardian_name.ilike.%${word}%`)
      .order('form_filled_at', { ascending: false })
      .limit(10);

    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      if (!seen.has(r.id as string)) {
        seen.add(r.id as string);
        results.push(r);
      }
    }
  }

  if (results.length === 0) return '';

  const lines = ['\nMatching lead records from the database:'];
  for (const r of results.slice(0, 15)) {
    const scores = r.ai_lead_scores as Array<Record<string, unknown>> | null;
    const sc = scores?.[0];
    lines.push(
      `- Student: ${r.student_name ?? '—'} | Guardian: ${r.guardian_name ?? '—'} | ` +
      `Subject: ${r.demo_subject ?? '—'} | Grade: ${r.grade ?? '—'} | ` +
      `Country: ${r.country ?? '—'} | Demo count: ${sc?.demo_count ?? 1} | ` +
      `AI score: ${sc?.score_label ?? 'Unscored'} (${sc?.score ?? '—'}/100) | ` +
      `Agent: ${(r.presales_agent_name as string[])?.[0] ?? '—'} | ` +
      `Duplicate: ${sc?.duplicate_detected ? 'Yes' : 'No'}`
    );
  }
  return lines.join('\n');
}

export const maxDuration = 60;

function noKey() {
  return NextResponse.json({ ok: false, error: 'GEMINI_API_KEY not configured' }, { status: 503 });
}

// ── POST /api/ai ──────────────────────────────────────────────────────────────
//
// action: 'ask'       → streaming SSE chat (global assistant)
// action: 'insights'  → JSON — 3 dashboard insight bullets
// action: 'explain'   → JSON — plain-English score explanation for a lead
// action: 'filter'    → JSON — parse NL query → FilterState object
// action: 'recommend' → JSON — next-best-action for a duplicate lead
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return noKey();

  const body = await req.json();
  const { action } = body;

  // ── 1. Global AI Chat ─────────────────────────────────────────────────────
  if (action === 'ask') {
    const history: { role: 'user' | 'assistant'; content: string }[] = body.messages ?? [];
    const pageContext: string = body.context ?? '';

    const systemPrompt = `${SYSTEM_BASE}

Current page the user is viewing: ${pageContext || 'No specific page context provided.'}

Answer concisely, under 150 words unless detail is specifically requested.`;

    // Drop leading assistant messages (e.g. the UI welcome message) so history starts with 'user'
    const firstUserIdx = history.findIndex((m) => m.role === 'user');
    const cleanHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : history;

    // Search the database for any lead names mentioned in the latest user question
    const latestQuestion = cleanHistory.filter((m) => m.role === 'user').slice(-1)[0]?.content ?? '';
    const leadData = await findLeadsByName(latestQuestion);

    const finalPrompt = leadData
      ? `${systemPrompt}\n${leadData}`
      : systemPrompt;

    const text = await multiTurn(cleanHistory, finalPrompt);
    return NextResponse.json({ ok: true, text });
  }

  // ── 2. Dashboard Insights ─────────────────────────────────────────────────
  if (action === 'insights') {
    const stats = body.stats ?? {};
    const prompt = `Given this lead analytics snapshot for Super Sheldon's presales team:

${JSON.stringify(stats, null, 2)}

Generate exactly 3 sharp, actionable business insights as a JSON array of strings. Each insight should be 1-2 sentences, data-driven, and include a concrete recommendation. Focus on: conversion opportunities, agent performance patterns, lead quality trends, or risk signals.

Respond ONLY with a valid JSON array of 3 strings. No markdown, no explanation outside the JSON.`;

    const raw = await oneShot(prompt, 600);
    let insights: string[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      insights = match ? JSON.parse(match[0]) : [raw];
    } catch {
      insights = [raw];
    }
    return NextResponse.json({ ok: true, insights });
  }

  // ── 3. Lead Score Explainer ───────────────────────────────────────────────
  if (action === 'explain') {
    const lead = body.lead ?? {};
    const prompt = `Explain this lead's AI quality score in plain English for a presales agent:

Lead data:
- Name: ${lead.name ?? 'Unknown'}
- Score: ${lead.score ?? '—'}/100 (${lead.label ?? 'Unknown'})
- Demo count: ${lead.demoCount ?? 1}
- Duplicate detected: ${lead.duplicateDetected ? 'Yes' : 'No'}
- Lead source: ${lead.source ?? '—'}
- Grade: ${lead.grade ?? '—'}
- Subject: ${lead.subject ?? '—'}
- Agent: ${lead.agent ?? '—'}
- Flags: ${(lead.flags ?? []).join(', ') || 'none'}

Write 2-3 short paragraphs:
1. Why this score was given (reference the flags and data points)
2. What this means for conversion likelihood
3. Recommended next action for the agent

Keep it under 200 words, conversational, and actionable.`;

    const text = await oneShot(prompt, 400);
    return NextResponse.json({ ok: true, text });
  }

  // ── 4. Natural Language → Filter Parser ───────────────────────────────────
  if (action === 'filter') {
    const { query, options } = body;
    const prompt = `The user typed this natural language filter query for a lead database:
"${query}"

Available filter options:
- countries: ${JSON.stringify(options?.countries?.slice(0, 20) ?? [])}
- grades: ${JSON.stringify(options?.grades?.slice(0, 20) ?? [])}
- subjects: ${JSON.stringify(options?.subjects?.slice(0, 20) ?? [])}
- sources: ${JSON.stringify(options?.sources?.slice(0, 20) ?? [])}
- agents: ${JSON.stringify(options?.agents?.slice(0, 20) ?? [])}

Parse the query and return a JSON object with ONLY these keys (leave blank string "" for fields not mentioned):
{ "country": "", "grade": "", "demo_subject": "", "lead_source": "", "agent": "", "date_from": "", "date_to": "" }

For date fields use ISO format (YYYY-MM-DD). Match values to the closest available option (case-insensitive). For dates like "last week", "this month", compute relative to today: ${new Date().toISOString().slice(0, 10)}.

Respond ONLY with the JSON object. No markdown, no explanation.`;

    const raw = await oneShot(prompt, 200);
    let filterState = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      filterState = match ? JSON.parse(match[0]) : {};
    } catch {
      filterState = {};
    }
    return NextResponse.json({ ok: true, filterState });
  }

  // ── 5. Duplicate Lead Action Recommender ──────────────────────────────────
  if (action === 'recommend') {
    const lead = body.lead ?? {};
    const prompt = `A lead in our tutoring company's CRM is flagged as a repeat demo seeker. Give a single, direct recommended action for the presales agent.

Lead profile:
- Parent: ${lead.name ?? 'Unknown'}
- Subject: ${lead.subject ?? '—'}
- Grade: ${lead.grade ?? '—'}
- Demo count: ${lead.demoCount ?? '—'}
- Last demo date: ${lead.lastDemo ?? '—'}
- Lead source: ${lead.source ?? '—'}
- AI score: ${lead.score ?? '—'}/100 (${lead.label ?? 'Repeated'})
- Alerts sent: ${lead.alertsSent ?? 'none'}

Respond in 1-2 sentences starting with an action verb (e.g., "Offer...", "Call...", "Send..."). Be specific and business-focused. No preamble.`;

    const text = await oneShot(prompt, 120);
    return NextResponse.json({ ok: true, text });
  }

  return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
}
