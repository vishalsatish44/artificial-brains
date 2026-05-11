-- ============================================================
-- Super Sheldon — AI Demo Validation & Lead Quality System
-- Supabase Schema v1
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TEACHERS
-- Mirrors: Airtable "Teachers" table (tblABGdxzpPoEkmpw)
-- ============================================================
create table if not exists teachers (
  id                  uuid primary key default gen_random_uuid(),
  airtable_record_id  text unique not null,
  teacher_id_code     text,
  teacher_name        text not null,
  teacher_email       text,
  teacher_contact     text,
  subjects            text[],               -- aggregated subject 1-7 names
  status              text,                 -- Active | Paused | Resigned/Left | Dropped
  airtable_synced_at  timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- STUDENTS  (unique person, de-duplicated)
-- Derived from: Demo Booking Form (first appearance)
-- One row per unique student, identified by contact/email/name
-- ============================================================
create table if not exists students (
  id                    uuid primary key default gen_random_uuid(),
  airtable_record_id    text unique not null,  -- first Demo Booking record ID
  student_id_formula    text,                  -- formula "Student ID" from Airtable
  student_name          text,
  student_email         text,
  student_contact       text,
  whatsapp_contact      text,
  guardian_name         text,
  guardian_relation     text,                  -- Mother | Father | Siblings | Others
  country               text,
  city                  text,
  country_code          text,
  school                text,
  grade                 text,                  -- Student's Year: Year 1 … Year 12, Kindergarten, etc.
  fingerprint           text generated always as (
    lower(
      coalesce(student_contact, '') || '|' ||
      coalesce(whatsapp_contact, '') || '|' ||
      coalesce(student_email, '') || '|' ||
      coalesce(student_name, '')
    )
  ) stored,                                    -- used for duplicate matching
  airtable_synced_at    timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_students_fingerprint on students(fingerprint);
create index if not exists idx_students_contact     on students(student_contact);
create index if not exists idx_students_email       on students(student_email);

-- ============================================================
-- DEMO BOOKINGS
-- Mirrors: Airtable "Demo Booking Form" (tbltM2TJ4yDQOpbdW)
-- Every booking attempt — includes rebooks and reschedulings
-- ============================================================
create table if not exists demo_bookings (
  id                           uuid primary key default gen_random_uuid(),
  airtable_record_id           text unique not null,
  student_id                   uuid references students(id) on delete set null,

  -- Student / Guardian info (snapshot at time of booking)
  student_name                 text,
  student_email                text,
  student_contact              text,
  whatsapp_contact             text,
  guardian_name                text,
  guardian_relation            text,
  country                      text,
  city                         text,
  country_code                 text,
  school                       text,
  grade                        text,
  student_timezone             text,

  -- Booking metadata
  presales_agent_name          text[],         -- multipleSelects
  ps_email                     text,
  lead_source                  text,           -- Cold calling | Marketing | Master Class | etc.
  prior_booking                text,           -- Yes | No
  rescheduling_demo            text,           -- Yes | No
  sale_without_demo            boolean,
  quality_of_data              text,
  whatsapp_enabled             boolean,
  competitive_exam             boolean,
  select_exams                 text[],
  marketing_source             text,
  campaign_name                text,
  sheet_url                    text,
  channel_name                 text[],

  -- Repeat / history fields (filled in by presales agent)
  trial_classes_already_taken  integer default 0,
  previous_experience          text,
  reason_not_bought_before     text[],

  -- Demo scheduling info
  demo_subject                 text,
  demo_datetime_cx             timestamptz,
  demo_datetime_ist            timestamptz,
  preferred_topic              text,
  conversation_notes           text,

  -- Agent notes
  form_filled_at               timestamptz,
  sent_to_dst                  boolean,

  airtable_synced_at           timestamptz,
  created_at                   timestamptz default now(),
  updated_at                   timestamptz default now()
);

create index if not exists idx_demo_bookings_student_id on demo_bookings(student_id);
create index if not exists idx_demo_bookings_contact    on demo_bookings(student_contact);
create index if not exists idx_demo_bookings_email      on demo_bookings(student_email);
create index if not exists idx_demo_bookings_date       on demo_bookings(demo_datetime_cx);

-- ============================================================
-- DEMO SCHEDULES
-- Mirrors: Airtable "Demo Scheduling" (tblTboo4u0GhXL5jc)
-- ============================================================
create table if not exists demo_schedules (
  id                      uuid primary key default gen_random_uuid(),
  airtable_record_id      text unique not null,
  demo_booking_id         uuid references demo_bookings(id) on delete cascade,
  teacher_id              uuid references teachers(id) on delete set null,

  demo_id_formula         text,
  demo_scheduled          boolean default false,
  reason_not_scheduled    text,
  demo_subject            text,
  final_demo_datetime     timestamptz,
  final_demo_datetime_cx  timestamptz,
  demo_scheduled_by       text,
  demo_completed          text,               -- Yes | No | Rescheduled | Not Interested
  reason_not_completed    text,
  demo_confirmation       text,               -- Yes | No | Pending
  send_wa_msg_and_mail    boolean default false,
  cx_msg_sent_at          timestamptz,
  cx_mail_sent_at         timestamptz,
  teacher_msg_sent_at     timestamptz,
  teacher_mail_sent_at    timestamptz,

  airtable_synced_at      timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index if not exists idx_demo_schedules_booking_id on demo_schedules(demo_booking_id);
create index if not exists idx_demo_schedules_teacher_id on demo_schedules(teacher_id);

-- ============================================================
-- AFTER SALES  (enrollments — proof of purchase)
-- Mirrors: Airtable "After Sales Form" (tbl6eaLDSkDZRHf8u)
-- ============================================================
create table if not exists after_sales (
  id                        uuid primary key default gen_random_uuid(),
  airtable_record_id        text unique not null,
  demo_booking_id           uuid references demo_bookings(id) on delete set null,

  batch_id                  text,
  subject_enrolled          text,
  sales_person_name         text,
  lead_channel              text,
  lead_source               text,
  enrollment_date           date,
  type_of_enrollment        text,             -- New Sale | Cross Sale | Reactivation
  classes_included          integer,
  classes_sold_monthly      text,
  payment_amount            numeric(12,2),
  currency                  text,
  mode_of_payment           text,
  payment_option            text,
  collection_inr            numeric(14,2),
  payment_id                text,

  -- Referral
  is_referral               boolean default false,
  referral_channel          text[],

  -- Whatsapp / onboarding
  whatsapp_group_name       text,
  onboarding_message_sent   boolean default false,
  onboarding_mail_sent      boolean default false,
  onboarding_datetime       timestamptz,

  -- Siblings
  siblings_enrolled         boolean default false,

  airtable_synced_at        timestamptz,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

create index if not exists idx_after_sales_demo_booking_id on after_sales(demo_booking_id);
create index if not exists idx_after_sales_enrollment_date on after_sales(enrollment_date);

-- ============================================================
-- AI LEAD SCORES  (computed by our scoring engine)
-- One row per demo_booking, refreshed on each sync
-- ============================================================
create table if not exists ai_lead_scores (
  id                       uuid primary key default gen_random_uuid(),
  demo_booking_id          uuid unique references demo_bookings(id) on delete cascade,
  student_id               uuid references students(id) on delete set null,

  -- Score 0-100  (below 50 = repeat/low quality, 50-79 = moderate, 80-100 = high quality)
  score                    integer not null check (score between 0 and 100),
  score_label              text not null,    -- 'High' | 'Moderate' | 'Repeated'

  -- Duplicate / repeat detection
  duplicate_detected       boolean default false,
  demo_count               integer default 1, -- total demos this student has taken
  total_demos_claimed      integer default 0, -- "No. of trial classes already taken" from form
  previous_booking_ids     uuid[],           -- other demo_booking rows for same student
  previous_demo_dates      timestamptz[],
  previous_teachers        text[],
  previous_packages        text[],           -- pricing discussed in past bookings

  -- Flags (array of human-readable flag strings)
  flags                    text[],
  -- e.g. 'repeat_demo', 'no_purchase_after_2_demos', 'multiple_agents',
  --      'prior_booking_yes', 'rescheduling', 'no_contact_match', 'first_time'

  -- Notification state
  alert_sent_to_team       boolean default false,
  alert_sent_at            timestamptz,
  reminder_sent_to_parent  boolean default false,
  reminder_sent_at         timestamptz,

  scored_at                timestamptz default now(),
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create index if not exists idx_ai_lead_scores_student_id on ai_lead_scores(student_id);
create index if not exists idx_ai_lead_scores_score      on ai_lead_scores(score);

-- ============================================================
-- NOTIFICATIONS LOG  (every message we send outbound)
-- ============================================================
create table if not exists notifications_log (
  id                  uuid primary key default gen_random_uuid(),
  demo_booking_id     uuid references demo_bookings(id) on delete set null,
  student_id          uuid references students(id) on delete set null,

  -- Type: team_alert | parent_reminder | feedback_request | referral_request
  notification_type   text not null,
  -- Channel: whatsapp | email | slack
  channel             text not null,
  recipient           text,               -- phone, email, or slack channel
  message_template    text,
  message_body        text,
  status              text default 'pending', -- pending | sent | failed
  error_message       text,
  sent_at             timestamptz,

  created_at          timestamptz default now()
);

create index if not exists idx_notifications_log_booking_id on notifications_log(demo_booking_id);
create index if not exists idx_notifications_log_type       on notifications_log(notification_type);

-- ============================================================
-- SYNC LOGS  (Airtable → Supabase sync audit)
-- ============================================================
create table if not exists sync_logs (
  id                    uuid primary key default gen_random_uuid(),
  airtable_table_name   text not null,
  airtable_table_id     text,
  records_fetched       integer default 0,
  records_upserted      integer default 0,
  records_skipped       integer default 0,
  status                text default 'pending', -- pending | success | error | partial
  error_message         text,
  started_at            timestamptz default now(),
  completed_at          timestamptz
);

-- ============================================================
-- UPDATED_AT auto-maintenance trigger
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_students_updated_at
  before update on students
  for each row execute function update_updated_at();

create or replace trigger trg_demo_bookings_updated_at
  before update on demo_bookings
  for each row execute function update_updated_at();

create or replace trigger trg_demo_schedules_updated_at
  before update on demo_schedules
  for each row execute function update_updated_at();

create or replace trigger trg_after_sales_updated_at
  before update on after_sales
  for each row execute function update_updated_at();

create or replace trigger trg_ai_lead_scores_updated_at
  before update on ai_lead_scores
  for each row execute function update_updated_at();

create or replace trigger trg_teachers_updated_at
  before update on teachers
  for each row execute function update_updated_at();
