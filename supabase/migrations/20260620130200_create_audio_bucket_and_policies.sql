-- Migration 003: Create private audio storage bucket and storage RLS policies
-- Idempotent: uses INSERT ON CONFLICT and DROP POLICY IF EXISTS

-- Create the private storage bucket (skip if already exists)
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

-- Users can upload files only under their own uid prefix
drop policy if exists "audio_insert_own" on storage.objects;
create policy "audio_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read files only under their own uid prefix
drop policy if exists "audio_select_own" on storage.objects;
create policy "audio_select_own"
  on storage.objects for select
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update files only under their own uid prefix
drop policy if exists "audio_update_own" on storage.objects;
create policy "audio_update_own"
  on storage.objects for update
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete files only under their own uid prefix
drop policy if exists "audio_delete_own" on storage.objects;
create policy "audio_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
