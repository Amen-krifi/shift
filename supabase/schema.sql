-- ============================================================================
-- SHIFT (AIESEC in Bardo) — Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. SPEAKERS  (shown in the "Speakers" section on the site)
-- ----------------------------------------------------------------------------
create table if not exists public.speakers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,                 -- e.g. "Founder & CEO"
  company text,               -- e.g. "Leading Enterprise Scaleup"
  session_title text,         -- e.g. "AI Is Changing Business"
  badge text,                 -- small tag e.g. "Keynote Address"
  bio text,
  photo_url text,
  linkedin_url text,
  twitter_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. TEAM MEMBERS (Organizing team section)
-- ----------------------------------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  photo_url text,
  linkedin_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. PARTNERS (logos shown in the "Trusted by" strip — already-confirmed partners)
-- ----------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  tier text,                  -- e.g. 'gold' | 'silver' | 'general' (optional, free text)
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. APPLICANTS (people who sign up to attend, from the Register form)
-- ----------------------------------------------------------------------------
create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  university text,
  faculty text,
  status text not null default 'registered',   -- registered | cancelled
  confirmation_sent boolean not null default false,
  confirmation_sent_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. PARTNER APPLICATIONS (companies applying via "Become a Partner" form —
--    kept separate from the `partners` table which only holds *approved,
--    displayed* logos)
-- ----------------------------------------------------------------------------
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'new',   -- new | contacted | approved | declined
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Public visitors (anon key) may only:
--   - read published speakers / team members / partners
--   - insert (never read/update/delete) applicants & partner_applications
-- Anything else requires an authenticated (logged-in) admin user.
-- ============================================================================

alter table public.speakers enable row level security;
alter table public.team_members enable row level security;
alter table public.partners enable row level security;
alter table public.applicants enable row level security;
alter table public.partner_applications enable row level security;

-- Public read of published content
create policy "public read published speakers" on public.speakers
  for select to anon using (published = true);
create policy "public read published team_members" on public.team_members
  for select to anon using (published = true);
create policy "public read published partners" on public.partners
  for select to anon using (published = true);

-- Admin (logged in) full read of everything (including unpublished drafts)
create policy "admin read speakers" on public.speakers
  for select to authenticated using (true);
create policy "admin read team_members" on public.team_members
  for select to authenticated using (true);
create policy "admin read partners" on public.partners
  for select to authenticated using (true);

-- Admin write access
create policy "admin write speakers" on public.speakers
  for all to authenticated using (true) with check (true);
create policy "admin write team_members" on public.team_members
  for all to authenticated using (true) with check (true);
create policy "admin write partners" on public.partners
  for all to authenticated using (true) with check (true);

-- Applicants: anyone can register, only admin can view/manage
create policy "public can register" on public.applicants
  for insert to anon with check (true);
create policy "admin manage applicants" on public.applicants
  for all to authenticated using (true) with check (true);

-- Partner applications: anyone can apply, only admin can view/manage
create policy "public can apply as partner" on public.partner_applications
  for insert to anon with check (true);
create policy "admin manage partner_applications" on public.partner_applications
  for all to authenticated using (true) with check (true);

-- ============================================================================
-- STORAGE BUCKETS (photos / logos uploaded from the admin page)
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('speaker-photos', 'speaker-photos', true),
  ('team-photos', 'team-photos', true),
  ('partner-logos', 'partner-logos', true)
on conflict (id) do nothing;

-- Public can view files (needed so images show on the live site)
create policy "public read speaker-photos" on storage.objects
  for select to anon using (bucket_id = 'speaker-photos');
create policy "public read team-photos" on storage.objects
  for select to anon using (bucket_id = 'team-photos');
create policy "public read partner-logos" on storage.objects
  for select to anon using (bucket_id = 'partner-logos');

-- Only logged-in admin can upload/replace/delete
create policy "admin write speaker-photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'speaker-photos') with check (bucket_id = 'speaker-photos');
create policy "admin write team-photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'team-photos') with check (bucket_id = 'team-photos');
create policy "admin write partner-logos" on storage.objects
  for all to authenticated
  using (bucket_id = 'partner-logos') with check (bucket_id = 'partner-logos');

-- ============================================================================
-- Done. Next steps (see README.md):
--   1. Create your admin login under Authentication → Users → Add user.
--   2. Deploy the two edge functions in supabase/functions/.
--   3. Set GMAIL_USER and GMAIL_APP_PASSWORD secrets for the functions.
--   4. Fill in config.js with your project URL + anon key.
-- ============================================================================
