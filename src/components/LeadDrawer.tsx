'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, Phone, Mail, MapPin, User, Calendar, BookOpen,
  AlertTriangle, CheckCircle2, Clock, Copy, Send,
  ShieldCheck, IndianRupee, MessageSquare,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';

type Props = {
  bookingId: string | null;
  onClose: () => void;
};

type ApiData = {
  ok: boolean;
  booking: Record<string, unknown>;
  history: unknown[];
  agentName: string;
  parentMessage: string | null;
  teamMessage: string | null;
  parentTemplateVars: string[] | null;
  reminderTemplateVars: string[];
  referralTemplateVars: string[];
  enrollmentInfo: {
    subjectEnrolled: string | null;
    enrollmentDate: string | null;
    paymentAmount: number | null;
    currency: string | null;
    collectionInr: number | null;
    salesPerson: string | null;
    typeOfEnrollment: string | null;
    classesIncluded: number | null;
    isReferral: boolean;
  } | null;
  meetingLink: string;
};

const ScoreBadge = ({ score, label }: { score: number; label: string }) => {
  const cfg =
    label === 'High'     ? { bg: '#ecfdf5', color: '#10b981', Icon: CheckCircle2 } :
    label === 'Repeated' ? { bg: '#fef2f2', color: '#ef4444', Icon: AlertTriangle } :
                           { bg: '#fffbeb', color: '#f59e0b', Icon: Clock };
  const { bg, color, Icon } = cfg;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color, padding: '0.375rem 0.75rem', borderRadius: 999, fontWeight: 700, fontSize: '0.85rem' }}>
      <Icon size={15} /> {label} · {score}/100
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

// Sends via Sagepilot template (WhatsApp) or Slack
const MessageBox = ({
  title, body, icon: Icon, color,
  channel, phone, name, templateName, variables, slackMessage, demoBookingId,
}: {
  title: string; body: string; icon: React.ElementType; color: string;
  channel: 'slack' | 'whatsapp';
  phone?: string; name?: string;
  templateName?: string; variables?: string[];
  slackMessage?: string;
  demoBookingId: string;
}) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const copy = () => navigator.clipboard.writeText(body);

  const send = useCallback(async () => {
    setStatus('sending');
    try {
      const payload = channel === 'slack'
        ? { channel, message: slackMessage || body, demoBookingId }
        : { channel, phone, name, templateName, variables, demoBookingId };

      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }, [body, channel, phone, name, templateName, variables, slackMessage, demoBookingId]);

  return (
    <div style={{ border: `1px solid ${color}30`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: `${color}10`, padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8rem', color }}>
          <Icon size={14} /> {title}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {status === 'sent'  && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>✓ Sent</span>}
          {status === 'error' && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>Failed</span>}
          <button onClick={copy} className="icon-btn" style={{ width: 28, height: 28, borderRadius: 7 }}><Copy size={12} /></button>
          <button
            onClick={send}
            disabled={status === 'sending' || status === 'sent'}
            className="btn-primary"
            style={{ padding: '0.25rem 0.625rem', fontSize: '0.72rem', borderRadius: 7, gap: 4, opacity: status === 'sent' ? 0.6 : 1 }}
          >
            <Send size={11} />
            {status === 'sending' ? '…' : status === 'sent' ? 'Sent' : 'Send'}
          </button>
        </div>
      </div>
      <pre style={{ margin: 0, padding: '0.875rem', fontFamily: 'inherit', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--foreground)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto' }}>
        {body}
      </pre>
    </div>
  );
};

export const LeadDrawer = ({ bookingId, onClose }: Props) => {
  const { data, loading } = useApi<ApiData>(bookingId ? `/api/lead?id=${bookingId}` : '');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!bookingId) return null;

  const b       = (data?.booking ?? {}) as Record<string, unknown>;
  const score   = (b.ai_lead_scores as Array<Record<string, unknown>>)?.[0];
  const history = (data?.history ?? []) as Array<Record<string, unknown>>;
  const enroll  = data?.enrollmentInfo;
  const phone   = String(b.whatsapp_contact ?? b.student_contact ?? '');

  return (
    <>
      <div ref={overlayRef} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)', zIndex: 200 }} />

      <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 201, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(15,23,42,0.08)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{loading ? '—' : String(b.guardian_name ?? b.student_name ?? 'Lead Detail')}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Student: {loading ? '—' : String(b.student_name ?? '—')}</p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="close"><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', color: 'var(--muted-foreground)', fontSize: '0.875rem', textAlign: 'center' }}>Loading lead data…</div>
        ) : (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* AI Score */}
            {score && (
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={16} color="var(--primary)" /> AI Quality Score
                  </div>
                  <ScoreBadge score={Number(score.score)} label={String(score.score_label)} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {((score.flags ?? []) as string[]).map((f) => (
                    <span key={f} className="chip" style={{ background: '#f1f5f9', color: 'var(--muted)', fontSize: '0.7rem' }}>{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
                {Boolean(score.duplicate_detected) && (
                  <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.75rem', background: '#fef2f2', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
                    <AlertTriangle size={14} /> Repeat demo seeker — {Number(score.demo_count)} demo(s) detected
                  </div>
                )}
              </div>
            )}

            {/* Contact Info */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem' }}>Contact Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <InfoItem label="Phone" value={String(b.student_contact ?? b.whatsapp_contact ?? '—')} />
                <InfoItem label="Email" value={String(b.student_email ?? '—')} />
                <InfoItem label="Grade" value={String(b.grade ?? '—')} />
                <InfoItem label="Country" value={[b.city, b.country].filter(Boolean).join(', ') || '—'} />
                <InfoItem label="Lead Source" value={String(b.lead_source ?? '—')} />
                <InfoItem label="Subject" value={String(b.demo_subject ?? '—')} />
                <InfoItem label="Agent" value={data?.agentName ?? '—'} />
                {data?.meetingLink && data.meetingLink !== 'N/A' && (
                  <InfoItem label="Meeting Link" value={data.meetingLink} />
                )}
              </div>
            </div>

            {/* Enrollment Info */}
            {enroll && (
              <div className="card" style={{ padding: '1rem', background: '#ecfdf5', border: '1px solid #d1fae5' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                  <CheckCircle2 size={16} /> Enrolled
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <InfoItem label="Subject" value={String(enroll.subjectEnrolled ?? '—')} />
                  <InfoItem label="Enrollment Date" value={enroll.enrollmentDate ? new Date(enroll.enrollmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                  <InfoItem label="Payment" value={enroll.paymentAmount ? `${enroll.currency ?? ''} ${enroll.paymentAmount}`.trim() : '—'} />
                  <InfoItem label="Collection (INR)" value={enroll.collectionInr ? `₹${enroll.collectionInr.toLocaleString()}` : '—'} />
                  <InfoItem label="Plan" value={String(enroll.typeOfEnrollment ?? '—')} />
                  <InfoItem label="Classes" value={enroll.classesIncluded ? String(enroll.classesIncluded) : '—'} />
                  <InfoItem label="Sales Person" value={String(enroll.salesPerson ?? '—')} />
                  <InfoItem label="Referral" value={enroll.isReferral ? 'Yes' : 'No'} />
                </div>
              </div>
            )}

            {/* Demo History */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={15} color="var(--primary)" /> Demo History ({history.length + 1} total)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <HistoryRow
                  label="Current booking"
                  date={b.form_filled_at ? new Date(String(b.form_filled_at)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  subject={String(b.demo_subject ?? '—')}
                  status="Current" statusColor="#3b82f6"
                />
                {history.map((h, i) => {
                  const schedule = (h.demo_schedules as Array<Record<string, unknown>>)?.[0];
                  const sale     = (h.after_sales as Array<Record<string, unknown>>)?.[0];
                  const teacherName = (schedule?.teachers as Record<string, unknown>)?.teacher_name as string | undefined;
                  const completed   = String(schedule?.demo_completed ?? '');
                  return (
                    <HistoryRow key={i}
                      label={`Demo ${history.length - i}`}
                      date={h.demo_datetime_cx ? new Date(String(h.demo_datetime_cx)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      subject={String(h.demo_subject ?? '—')}
                      teacher={teacherName}
                      status={completed || (sale ? 'Enrolled' : 'No Purchase')}
                      statusColor={sale ? '#10b981' : completed === 'Yes' ? '#f59e0b' : '#ef4444'}
                      pkg={sale ? `${sale.currency ?? ''} ${sale.payment_amount ?? ''}`.trim() : undefined}
                    />
                  );
                })}
              </div>
            </div>

            {/* WhatsApp Messages */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={15} color="var(--primary)" /> WhatsApp Messages
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Demo Reminder — always visible */}
                {data?.parentMessage && data.parentTemplateVars && (
                  <MessageBox
                    title="Repeat Demo Alert (WhatsApp)"
                    body={data.parentMessage}
                    icon={AlertTriangle}
                    color="#ef4444"
                    channel="whatsapp"
                    phone={phone}
                    name={String(b.guardian_name ?? b.student_name ?? '')}
                    templateName={process.env.NEXT_PUBLIC_TPL_REPEAT_DEMO ?? 'parent_repeat_demo_notice'}
                    variables={data.parentTemplateVars}
                    demoBookingId={String(b.id ?? '')}
                  />
                )}

                {/* General demo reminder */}
                <MessageBox
                  title="Demo Reminder (WhatsApp)"
                  body={buildReminderPreview(data?.reminderTemplateVars ?? [])}
                  icon={Send}
                  color="#3b82f6"
                  channel="whatsapp"
                  phone={phone}
                  name={String(b.guardian_name ?? b.student_name ?? '')}
                  templateName={process.env.NEXT_PUBLIC_TPL_DEMO_REMINDER ?? 'parent_demo_reminder'}
                  variables={data?.reminderTemplateVars ?? []}
                  demoBookingId={String(b.id ?? '')}
                />

                {/* Referral — shown to enrolled customers */}
                {enroll && (
                  <MessageBox
                    title="Feedback & Referral Request (WhatsApp)"
                    body={buildReferralPreview(data?.referralTemplateVars ?? [])}
                    icon={CheckCircle2}
                    color="#10b981"
                    channel="whatsapp"
                    phone={phone}
                    name={String(b.guardian_name ?? b.student_name ?? '')}
                    templateName={process.env.NEXT_PUBLIC_TPL_REFERRAL ?? 'parent_feedback_referral'}
                    variables={data?.referralTemplateVars ?? []}
                    demoBookingId={String(b.id ?? '')}
                  />
                )}

                {/* Team Slack alert */}
                {data?.teamMessage && (
                  <MessageBox
                    title="Team Alert (Slack)"
                    body={data.teamMessage}
                    icon={AlertTriangle}
                    color="#6366f1"
                    channel="slack"
                    slackMessage={data.teamMessage}
                    demoBookingId={String(b.id ?? '')}
                    phone=""
                  />
                )}
              </div>
            </div>

          </div>
        )}
      </aside>
    </>
  );
};

function buildReminderPreview(vars: string[]) {
  const [guardian, student, date, time, link, agent] = vars;
  return (
    `Hello ${guardian || 'Sir/Ma\'am'},\n\n` +
    `This is a reminder that ${student || 'your child'} has a demo session scheduled with Super Sheldon.\n\n` +
    `📅 Date: ${date || 'TBD'}\n` +
    `🕐 Time: ${time || 'TBD'}\n` +
    `🔗 Meeting Link: ${link || 'N/A'}\n\n` +
    `We look forward to seeing you! — ${agent || 'Super Sheldon Team'}`
  );
}

function buildReferralPreview(vars: string[]) {
  const [guardian, student, agent] = vars;
  return (
    `Hi ${guardian || 'Sir/Ma\'am'},\n\n` +
    `Thank you for choosing Super Sheldon for ${student || 'your child'}! 🌟\n\n` +
    `We hope the experience has been wonderful. We would love to hear your feedback to help us improve.\n\n` +
    `Also, if you know any friends or family who may benefit from our programmes, we would truly appreciate a referral. Referral rewards may also be available for you! 🎁\n\n` +
    `Simply reply to share your feedback or a referral.\n\n` +
    `Thank you for your support 💙 — ${agent || 'Super Sheldon Team'}`
  );
}

const HistoryRow = ({ label, date, subject, teacher, status, statusColor, pkg }: {
  label: string; date: string; subject: string; teacher?: string;
  status: string; statusColor: string; pkg?: string;
}) => (
  <div className="card" style={{ padding: '0.75rem 0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
    <div style={{ width: 8, height: 8, borderRadius: 999, background: statusColor, flexShrink: 0, marginTop: 6 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{label}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: statusColor, background: `${statusColor}15`, padding: '0.15rem 0.5rem', borderRadius: 999 }}>{status}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />{date}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={11} />{subject}</span>
        {teacher && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} />{teacher}</span>}
        {pkg && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IndianRupee size={11} />{pkg}</span>}
      </div>
    </div>
  </div>
);

export default LeadDrawer;
