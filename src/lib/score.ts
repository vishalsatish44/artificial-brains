/**
 * AI Lead Scoring Engine
 *
 * Score range: 0–100
 *   < 50  → Repeated / free-demo seeker   (label: 'Repeated')
 *  50–79  → Moderate lead                  (label: 'Moderate')
 *  80–100 → High-quality lead              (label: 'High')
 */

export type ScoreInput = {
  priorBooking: boolean;          // "Prior booking" = Yes
  reschedulingDemo: boolean;      // "Rescheduling Demo" = Yes
  trialClassesTaken: number;      // "No. of trial classes already taken"
  leadSource: string;             // e.g. "Cold calling", "Reactivation"
  previousDemoCount: number;      // # of existing demo_bookings rows for same student
  hasPurchased: boolean;          // at least one after_sales row exists for this student
  reasonNotBought: string[];      // selected reasons from multi-select
  saleWithoutDemo: boolean;       // flagged as sale w/o demo
  competitiveExam: boolean;       // student targeting competitive exam (higher intent)
  qualityOfData: string;          // agent-rated data quality
};

export type ScoreResult = {
  score: number;
  label: 'High' | 'Moderate' | 'Repeated';
  flags: string[];
  duplicateDetected: boolean;
};

const FLAGS = {
  FIRST_TIME:           'first_time',
  PRIOR_BOOKING_YES:    'prior_booking_yes',
  RESCHEDULING:         'rescheduling',
  REPEAT_DEMO:          'repeat_demo',
  NO_PURCHASE_2_DEMOS:  'no_purchase_after_2_demos',
  COMPETITIVE_EXAM:     'competitive_exam',
  REACTIVATION:         'reactivation',
  HIGH_DATA_QUALITY:    'high_data_quality',
  LOW_DATA_QUALITY:     'low_data_quality',
  SALE_WITHOUT_DEMO:    'sale_without_demo',
} as const;

export function computeScore(input: ScoreInput): ScoreResult {
  let score = 100;
  const flags: string[] = [];
  let duplicateDetected = false;

  // ── Baseline: existing demo history from DB ──────────────────────────────
  const totalDemos = input.previousDemoCount + input.trialClassesTaken;

  if (totalDemos === 0 && !input.priorBooking) {
    flags.push(FLAGS.FIRST_TIME);
  }

  // ── Repeat / duplicate penalties ─────────────────────────────────────────
  if (input.previousDemoCount > 0) {
    duplicateDetected = true;
    flags.push(FLAGS.REPEAT_DEMO);
    score -= 20 * Math.min(input.previousDemoCount, 3); // up to -60
  }

  if (input.trialClassesTaken >= 2) {
    score -= 15 * (input.trialClassesTaken - 1); // -15 per extra trial
    if (!input.hasPurchased) flags.push(FLAGS.NO_PURCHASE_2_DEMOS);
  }

  if (input.priorBooking) {
    duplicateDetected = true;
    flags.push(FLAGS.PRIOR_BOOKING_YES);
    score -= 15;
  }

  // No purchase despite demos — strong indicator of free-demo seeker
  if (!input.hasPurchased && totalDemos >= 2) {
    score -= 20;
  }

  // ── Intent boosters ───────────────────────────────────────────────────────
  if (input.competitiveExam) {
    flags.push(FLAGS.COMPETITIVE_EXAM);
    score += 8;
  }

  if (input.saleWithoutDemo) {
    flags.push(FLAGS.SALE_WITHOUT_DEMO);
    score += 10; // already committed without needing a demo
  }

  if (input.leadSource === 'Reactivation') {
    flags.push(FLAGS.REACTIVATION);
    // Reactivation isn't inherently bad — neutral
  }

  if (['Student Referral', 'Teacher Referral', 'Affiliate Partner'].includes(input.leadSource)) {
    score += 10;
  }

  // Cold outbound sources have lower baseline intent than inbound/referral
  const coldSources = ['Cold calling', 'Cold Calling', 'cold calling', 'Cold Call'];
  const outboundSources = ['Facebook Ads', 'Instagram Ads', 'Google Ads', 'Paid Ads'];
  if (coldSources.some((s) => input.leadSource.toLowerCase().includes('cold'))) {
    score -= 15;
  } else if (outboundSources.some((s) => input.leadSource.toLowerCase().includes('ad'))) {
    score -= 5;
  }

  // ── Rescheduling ──────────────────────────────────────────────────────────
  if (input.reschedulingDemo) {
    flags.push(FLAGS.RESCHEDULING);
    score -= 5;
  }

  // ── Data quality ─────────────────────────────────────────────────────────
  if (['Fantastic', 'best i could have got'].includes(input.qualityOfData)) {
    flags.push(FLAGS.HIGH_DATA_QUALITY);
    score += 5;
  }
  if (['Pathetic', 'please change the data ASAP'].includes(input.qualityOfData)) {
    flags.push(FLAGS.LOW_DATA_QUALITY);
    score -= 10;
  }

  // ── Clamp ─────────────────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  const label: ScoreResult['label'] =
    score >= 80 ? 'High' :
    score >= 50 ? 'Moderate' :
                  'Repeated';

  return { score, label, flags, duplicateDetected };
}

export function scoreLabel(score: number): 'High' | 'Moderate' | 'Repeated' {
  if (score >= 80) return 'High';
  if (score >= 50) return 'Moderate';
  return 'Repeated';
}

// ── Message templates ──────────────────────────────────────────────────────

export function buildParentReminderMessage(params: {
  guardianName: string;
  previousDemoDate: string;
  teacherName: string;
  previousPackage: string;
}): string {
  return (
    `Hello ${params.guardianName || 'Sir/Ma\'am'},\n\n` +
    `We noticed that you had previously attended a demo session with us on *${params.previousDemoDate}* ` +
    `with *${params.teacherName}*.\n\n` +
    `Earlier, the discussed package was *${params.previousPackage}*.\n\n` +
    `We would be happy to continue helping your child with the next steps. ` +
    `Please let us know if you'd like to proceed — our team is here to assist you! 😊`
  );
}

export function buildFeedbackReferralMessage(params: {
  parentName: string;
  childName: string;
}): string {
  return (
    `Hi ${params.parentName},\n\n` +
    `Thank you for being a part of Super Sheldon 🌟 We hope *${params.childName}* enjoyed the course!\n\n` +
    `We'd love to hear your feedback to help us improve our learning experience. ` +
    `Also, if you know any friends or family who may benefit from our programmes, ` +
    `we'd truly appreciate a referral.\n\n` +
    `As a thank-you, referral benefits/rewards may also be available for you 🎁\n\n` +
    `Simply reply with your feedback or referral details.\n\n` +
    `Thank you for your support 💙`
  );
}

export function buildTeamAlertMessage(params: {
  guardianName: string;
  studentName: string;
  phone: string;
  demoCount: number;
  lastDemoDate: string;
  previousTeacher: string;
  previousPackage: string;
  score: number;
  flags: string[];
}): string {
  return (
    `⚠️ *REPEAT DEMO SEEKER ALERT*\n\n` +
    `👤 Parent: ${params.guardianName}\n` +
    `👦 Student: ${params.studentName}\n` +
    `📞 Phone: ${params.phone}\n` +
    `🔢 Total demos taken: ${params.demoCount}\n` +
    `📅 Last demo: ${params.lastDemoDate}\n` +
    `👩‍🏫 Previous teacher: ${params.previousTeacher}\n` +
    `💰 Package discussed: ${params.previousPackage}\n` +
    `🤖 AI Score: ${params.score}/100\n` +
    `🚩 Flags: ${params.flags.join(', ')}\n\n` +
    `Please verify intent before booking a new demo slot.`
  );
}
