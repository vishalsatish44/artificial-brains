import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { buildParentReminderMessage, buildTeamAlertMessage } from '@/lib/score';

// GET /api/lead?id=<demo_booking_uuid>
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  // Fetch booking + score
  const { data: booking, error } = await supabase
    .from('demo_bookings')
    .select(`
      *,
      ai_lead_scores(*),
      demo_schedules(*, teachers(teacher_name, teacher_email)),
      after_sales(batch_id, subject_enrolled, enrollment_date, payment_amount, currency, type_of_enrollment)
    `)
    .eq('id', id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  // Fetch ALL previous demo bookings for the same student (history)
  const { data: history } = await supabase
    .from('demo_bookings')
    .select(`
      id, form_filled_at, demo_subject, demo_datetime_cx, lead_source,
      presales_agent_name,
      demo_schedules(demo_completed, final_demo_datetime, teachers(teacher_name)),
      after_sales(subject_enrolled, enrollment_date, payment_amount, currency)
    `)
    .eq('student_id', booking.student_id)
    .neq('id', id)
    .order('form_filled_at', { ascending: false });

  // Build notification messages
  const score    = booking.ai_lead_scores?.[0];
  const lastDemo = history?.[0];
  const lastTeacher = (lastDemo?.demo_schedules as Array<{ teachers?: { teacher_name?: string } }>)?.[0]?.teachers?.teacher_name ?? 'our teacher';
  const lastDate = lastDemo?.demo_datetime_cx
    ? new Date(lastDemo.demo_datetime_cx).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'a previous date';
  const lastSaleArr = lastDemo
    ? (lastDemo.after_sales as Array<{ payment_amount?: number; currency?: string }> | undefined)
    : undefined;
  const lastPkg = lastSaleArr?.[0]
    ? `${lastSaleArr[0].currency ?? ''} ${lastSaleArr[0].payment_amount ?? ''}`.trim()
    : 'previously discussed package';

  const parentMessage = score?.duplicate_detected
    ? buildParentReminderMessage({
        guardianName:    booking.guardian_name ?? 'Sir/Ma\'am',
        previousDemoDate: lastDate,
        teacherName:     lastTeacher,
        previousPackage: lastPkg,
      })
    : null;

  const teamMessage = score?.duplicate_detected
    ? buildTeamAlertMessage({
        guardianName:    booking.guardian_name ?? 'Unknown',
        studentName:     booking.student_name ?? 'Unknown',
        phone:           booking.student_contact ?? booking.whatsapp_contact ?? 'N/A',
        demoCount:       score.demo_count ?? 1,
        lastDemoDate:    lastDate,
        previousTeacher: lastTeacher,
        previousPackage: lastPkg,
        score:           score.score ?? 0,
        flags:           score.flags ?? [],
      })
    : null;

  const agentName = (booking.presales_agent_name as string[] | null)?.[0] ?? 'Super Sheldon';

  // Template variable arrays (order matches Sagepilot template {{1}}..{{N}})
  // parent_repeat_demo_notice: guardian_name, last_demo_date, teacher_name, package, agent_name
  const parentTemplateVars = score?.duplicate_detected ? [
    booking.guardian_name ?? booking.student_name ?? 'Sir/Ma\'am',
    lastDate,
    lastTeacher,
    lastPkg,
    agentName,
  ] : null;

  // parent_demo_reminder: guardian_name, student_name, demo_date, demo_time, meeting_link, agent_name
  const demoDate = booking.demo_datetime_cx ? new Date(String(booking.demo_datetime_cx)) : null;
  const demoDateStr = demoDate ? demoDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
  const demoTimeStr = demoDate ? demoDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD';
  const scheduleRow = (booking.demo_schedules as Array<Record<string, unknown>>)?.[0];
  const meetingLink = (scheduleRow?.meeting_link as string) ?? 'N/A';

  const reminderTemplateVars = [
    booking.guardian_name ?? booking.student_name ?? 'Sir/Ma\'am',
    booking.student_name ?? 'your child',
    demoDateStr,
    demoTimeStr,
    meetingLink,
    agentName,
  ];

  // Enrollment info from after_sales
  const enrollmentRow = (booking.after_sales as Array<Record<string, unknown>>)?.[0];
  const enrollmentInfo = enrollmentRow ? {
    subjectEnrolled:  enrollmentRow.subject_enrolled,
    enrollmentDate:   enrollmentRow.enrollment_date,
    paymentAmount:    enrollmentRow.payment_amount,
    currency:         enrollmentRow.currency,
    collectionInr:    enrollmentRow.collection_inr,
    salesPerson:      enrollmentRow.sales_person_name,
    typeOfEnrollment: enrollmentRow.type_of_enrollment,
    classesIncluded:  enrollmentRow.classes_included,
    isReferral:       enrollmentRow.is_referral,
  } : null;

  // parent_feedback_referral: guardian_name, student_name, agent_name
  const referralTemplateVars = [
    booking.guardian_name ?? booking.student_name ?? 'Sir/Ma\'am',
    booking.student_name ?? 'your child',
    agentName,
  ];

  return NextResponse.json({
    ok: true,
    booking,
    history: history ?? [],
    agentName,
    parentMessage,
    teamMessage,
    parentTemplateVars,
    reminderTemplateVars,
    referralTemplateVars,
    enrollmentInfo,
    meetingLink,
  });
}
