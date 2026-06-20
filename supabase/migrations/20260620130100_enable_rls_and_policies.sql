-- Migration 002: Enable RLS and create ownership policies on all tables
-- Idempotent: drops policies before recreating

-- ============================================================
-- SESSIONS: direct ownership via user_id = auth.uid()
-- ============================================================
alter table public.sessions enable row level security;

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
  on public.sessions for select
  using (user_id = auth.uid());

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
  on public.sessions for insert
  with check (user_id = auth.uid());

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
  on public.sessions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- TURNS: ownership via subquery into sessions
-- ============================================================
alter table public.turns enable row level security;

drop policy if exists "turns_select_own" on public.turns;
create policy "turns_select_own"
  on public.turns for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = turns.session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "turns_insert_own" on public.turns;
create policy "turns_insert_own"
  on public.turns for insert
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = turns.session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "turns_update_own" on public.turns;
create policy "turns_update_own"
  on public.turns for update
  using (
    exists (
      select 1 from public.sessions s
      where s.id = turns.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = turns.session_id
        and s.user_id = auth.uid()
    )
  );

-- ============================================================
-- GAPS: ownership via subquery into sessions
-- ============================================================
alter table public.gaps enable row level security;

drop policy if exists "gaps_select_own" on public.gaps;
create policy "gaps_select_own"
  on public.gaps for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = gaps.session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "gaps_insert_own" on public.gaps;
create policy "gaps_insert_own"
  on public.gaps for insert
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = gaps.session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "gaps_update_own" on public.gaps;
create policy "gaps_update_own"
  on public.gaps for update
  using (
    exists (
      select 1 from public.sessions s
      where s.id = gaps.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = gaps.session_id
        and s.user_id = auth.uid()
    )
  );

-- ============================================================
-- CLOSES: ownership via two-hop subquery (closes -> gaps -> sessions)
-- ============================================================
alter table public.closes enable row level security;

drop policy if exists "closes_select_own" on public.closes;
create policy "closes_select_own"
  on public.closes for select
  using (
    exists (
      select 1 from public.gaps g
      join public.sessions s on s.id = g.session_id
      where g.id = closes.gap_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "closes_insert_own" on public.closes;
create policy "closes_insert_own"
  on public.closes for insert
  with check (
    exists (
      select 1 from public.gaps g
      join public.sessions s on s.id = g.session_id
      where g.id = closes.gap_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "closes_update_own" on public.closes;
create policy "closes_update_own"
  on public.closes for update
  using (
    exists (
      select 1 from public.gaps g
      join public.sessions s on s.id = g.session_id
      where g.id = closes.gap_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.gaps g
      join public.sessions s on s.id = g.session_id
      where g.id = closes.gap_id
        and s.user_id = auth.uid()
    )
  );
