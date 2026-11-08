-- Run once in Supabase → SQL Editor.
-- Visitors (anon key) can only INSERT. Only you (logged in) can read.

create table if not exists public.events (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  session_id      text not null,
  visitor_id      text not null,
  event_type      text not null check (event_type in ('visit','ping','leave','click','section','identify')),
  label           text,
  ref_tag         text,
  visitor_name    text,
  visitor_company text,
  duration_s      integer default 0 check (duration_s between 0 and 86400),
  scroll_pct      integer default 0 check (scroll_pct between 0 and 100),
  page            text,
  referrer        text,
  user_agent      text,
  language        text,
  timezone        text,
  screen          text,
  meta            jsonb
);

create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_session_idx on public.events (session_id);

alter table public.events enable row level security;

-- Anyone visiting the site may write events…
drop policy if exists "anon can insert" on public.events;
create policy "anon can insert" on public.events
  for insert to anon with check (length(coalesce(label,'')) < 300);

-- …but only YOUR account can read them. Replace the email.
drop policy if exists "owner can read" on public.events;
create policy "owner can read" on public.events
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'omarguettat14@gmail.com');

-- Optional: auto-delete data older than 12 months (privacy hygiene).
-- Enable the pg_cron extension first, then:
-- select cron.schedule('purge-old-events','0 3 * * *',
--   $$delete from public.events where created_at < now() - interval '12 months'$$);
