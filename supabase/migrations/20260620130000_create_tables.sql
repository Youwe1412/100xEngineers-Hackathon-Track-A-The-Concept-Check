-- Migration 001: Create tables for the Interface Seam Finder
-- sessions, turns, gaps, closes
-- Idempotent: uses CREATE TABLE IF NOT EXISTS

-- sessions: one per learner interview
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  highest_rung_reached text,
  is_complete boolean default false,
  created_at timestamptz default now()
);

-- turns: each conversational exchange in a session
create table if not exists public.turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  role text not null check (role in ('learner', 'system')),
  transcript text,
  audio_path text,
  created_at timestamptz default now()
);

-- gaps: each detected seam/gap in a session
create table if not exists public.gaps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  rung_name text not null,
  seam_sentence text
);

-- closes: outcome of a gap-close attempt
create table if not exists public.closes (
  id uuid primary key default gen_random_uuid(),
  gap_id uuid not null references public.gaps(id) on delete cascade,
  second_attempt_turn_id uuid references public.turns(id),
  result text check (result in ('real_close', 'fake_close')),
  created_at timestamptz default now()
);
