-- Feedback table for user support submissions
create table if not exists feedback (
  id uuid not null default gen_random_uuid(),
  profile_id text not null,
  category text not null,
  description text not null,
  created_at timestamptz not null default now(),
  primary key (id)
);

create index if not exists idx_feedback_profile_id on feedback(profile_id);
