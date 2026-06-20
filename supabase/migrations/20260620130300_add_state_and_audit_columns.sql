-- Migration 004: probabilistic layer support
-- The deterministic engine Session (rungStatus, currentSeam, probeAttempts) needs
-- a home between requests, and every LLM verdict must be auditable in Move 5.
-- No RLS changes: existing row policies already cover these tables.

-- Full engine Session object, persisted per turn and reloaded next turn.
alter table public.sessions add column if not exists state jsonb;

-- The five Verifier verdicts (present + reason) that graded this learner turn.
alter table public.turns add column if not exists verifier_log jsonb;

-- The Close-Judge's reason for real_close / fake_close (result column exists already).
alter table public.closes add column if not exists reason text;
