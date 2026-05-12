import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = 'gemini-2.5-flash';

export const SYSTEM_BASE = `You are an AI assistant embedded inside Super Sheldon's Demo AI Console — a lead management and analytics platform for an online tutoring company.

Key data concepts:
- demo_bookings: A parent/guardian books a free demo class for their child. Fields include student name, guardian name, phone, grade, subject, lead source, presales agent, booking date, AI quality score.
- ai_lead_scores: Each booking gets scored High (new, likely to buy), Moderate (somewhat engaged), or Repeated (came for free demos multiple times, low conversion intent).
- duplicate_detected: true when a lead has booked 2+ demos without purchasing — a "repeat demo seeker".
- demo_count: how many times this parent has booked a demo.
- after_sales / enrolled: leads that converted into paying students.
- Presales agents are the team members who handle lead follow-up.

Always be concise, direct, and business-focused. Use bullet points for lists. Never make up specific data values — only reason from data explicitly provided in the user's message.`;

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
  }
  return _client;
}

// Single-shot generation (insights, explain, filter, recommend)
export async function oneShot(prompt: string, maxTokens = 512): Promise<string> {
  const res = await getClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { maxOutputTokens: maxTokens },
  });
  return res.text ?? '';
}

// Multi-turn chat — history is user+assistant turns, system prompt passed separately
export async function multiTurn(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemInstruction: string
): Promise<string> {
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await getClient().models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction },
  });
  return res.text ?? '';
}
