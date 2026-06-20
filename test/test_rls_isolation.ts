/**
 * Two-User RLS Isolation Test
 *
 * Verifies that Row Level Security policies correctly isolate data
 * between users across all four tables (sessions, turns, gaps, closes)
 * and the private audio storage bucket.
 *
 * Run: npx tsx test/test_rls_isolation.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// -- Project configuration --------------------------------------------------

const SUPABASE_URL = 'https://gtulbpolpmrrcqeilofy.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWxicG9scG1ycmNxZWlsb2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTU2NDksImV4cCI6MjA5NzUzMTY0OX0.QKTJaAnnSJuIvJ8jFBz5TPVEjqAyk53aiwg0hvUE0X4';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dWxicG9scG1ycmNxZWlsb2Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk1NTY0OSwiZXhwIjoyMDk3NTMxNjQ5fQ.tTi-gv7jFi5z8az11JpXYBaYVcj6VKPJw3OX9Pi01d0';

// -- Helpers -----------------------------------------------------------------

const timestamp = Date.now();
const USER_A_EMAIL = `rls_test_a_${timestamp}@test.local`;
const USER_B_EMAIL = `rls_test_b_${timestamp}@test.local`;
const TEST_PASSWORD = 'TestPassword123!';

/** Admin client bypasses RLS (service_role) */
function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Authenticated client for a specific user (anon key + user session) */
function userClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${name}: ${detail}`);
}

// -- Main test ---------------------------------------------------------------

async function main() {
  console.log('=== RLS Two-User Isolation Test ===\n');

  const admin = adminClient();

  // Step 1: Create User A and User B via the admin API
  console.log('1. Creating test users...');

  const { data: userAData, error: userAError } =
    await admin.auth.admin.createUser({
      email: USER_A_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
  if (userAError || !userAData.user) {
    console.error('Failed to create User A:', userAError);
    process.exit(1);
  }
  const userAId = userAData.user.id;
  console.log(`   User A created: ${userAId}`);

  const { data: userBData, error: userBError } =
    await admin.auth.admin.createUser({
      email: USER_B_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
  if (userBError || !userBData.user) {
    console.error('Failed to create User B:', userBError);
    process.exit(1);
  }
  const userBId = userBData.user.id;
  console.log(`   User B created: ${userBId}`);

  // Step 2: Sign in as each user to get access tokens
  console.log('\n2. Signing in as each user...');

  const anonForA = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signInA, error: signInAError } =
    await anonForA.auth.signInWithPassword({
      email: USER_A_EMAIL,
      password: TEST_PASSWORD,
    });
  if (signInAError || !signInA.session) {
    console.error('Failed to sign in User A:', signInAError);
    process.exit(1);
  }
  const tokenA = signInA.session.access_token;
  console.log('   User A signed in.');

  const anonForB = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signInB, error: signInBError } =
    await anonForB.auth.signInWithPassword({
      email: USER_B_EMAIL,
      password: TEST_PASSWORD,
    });
  if (signInBError || !signInB.session) {
    console.error('Failed to sign in User B:', signInBError);
    process.exit(1);
  }
  const tokenB = signInB.session.access_token;
  console.log('   User B signed in.');

  const clientA = userClient(tokenA);
  const clientB = userClient(tokenB);

  // Step 3: User A inserts data across all four tables
  console.log('\n3. User A inserts test data...');

  const { data: sessionRow, error: sessionErr } = await clientA
    .from('sessions')
    .insert({ highest_rung_reached: 'relational', is_complete: false })
    .select()
    .single();
  if (sessionErr || !sessionRow) {
    console.error('Failed to insert session:', sessionErr);
    process.exit(1);
  }
  const sessionId = sessionRow.id;
  console.log(`   Session inserted: ${sessionId}`);

  const { data: turnRow, error: turnErr } = await clientA
    .from('turns')
    .insert({
      session_id: sessionId,
      role: 'learner',
      transcript: 'An interface is an agreement between two systems.',
      audio_path: `${userAId}/test_turn.wav`,
    })
    .select()
    .single();
  if (turnErr || !turnRow) {
    console.error('Failed to insert turn:', turnErr);
    process.exit(1);
  }
  const turnId = turnRow.id;
  console.log(`   Turn inserted: ${turnId}`);

  const { data: gapRow, error: gapErr } = await clientA
    .from('gaps')
    .insert({
      session_id: sessionId,
      rung_name: 'relational_core',
      seam_sentence: 'Cannot derive why interface must exist.',
    })
    .select()
    .single();
  if (gapErr || !gapRow) {
    console.error('Failed to insert gap:', gapErr);
    process.exit(1);
  }
  const gapId = gapRow.id;
  console.log(`   Gap inserted: ${gapId}`);

  const { data: closeRow, error: closeErr } = await clientA
    .from('closes')
    .insert({
      gap_id: gapId,
      second_attempt_turn_id: turnId,
      result: 'real_close',
    })
    .select()
    .single();
  if (closeErr || !closeRow) {
    console.error('Failed to insert close:', closeErr);
    process.exit(1);
  }
  const closeId = closeRow.id;
  console.log(`   Close inserted: ${closeId}`);

  // Step 4: User A uploads a dummy audio file
  console.log('\n4. User A uploads audio file...');

  const dummyAudio = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // RIFF header stub
  const audioPath = `${userAId}/test_audio.wav`;

  const { error: uploadErr } = await clientA.storage
    .from('audio')
    .upload(audioPath, dummyAudio, { contentType: 'audio/wav', upsert: true });
  if (uploadErr) {
    console.error('Failed to upload audio:', uploadErr);
    process.exit(1);
  }
  console.log(`   Audio uploaded to: ${audioPath}`);

  // Step 5: User A verifies they CAN read their own data
  console.log('\n5. Verifying User A can read own data...');

  const { data: aSessions } = await clientA.from('sessions').select('id');
  record(
    'User A reads own sessions',
    (aSessions?.length ?? 0) >= 1,
    `Got ${aSessions?.length ?? 0} row(s)`,
  );

  const { data: aTurns } = await clientA.from('turns').select('id');
  record(
    'User A reads own turns',
    (aTurns?.length ?? 0) >= 1,
    `Got ${aTurns?.length ?? 0} row(s)`,
  );

  const { data: aGaps } = await clientA.from('gaps').select('id');
  record(
    'User A reads own gaps',
    (aGaps?.length ?? 0) >= 1,
    `Got ${aGaps?.length ?? 0} row(s)`,
  );

  const { data: aCloses } = await clientA.from('closes').select('id');
  record(
    'User A reads own closes',
    (aCloses?.length ?? 0) >= 1,
    `Got ${aCloses?.length ?? 0} row(s)`,
  );

  const { data: aAudioData } = await clientA.storage
    .from('audio')
    .download(audioPath);
  record(
    'User A reads own audio',
    aAudioData !== null,
    aAudioData ? 'Downloaded OK' : 'Download failed',
  );

  // Step 6: User B attempts to read User A's data (should all be empty/denied)
  console.log('\n6. User B attempts to cross-read User A data...');

  const { data: bSessions } = await clientB.from('sessions').select('id');
  record(
    'User B cannot read A sessions',
    (bSessions?.length ?? 0) === 0,
    `Got ${bSessions?.length ?? 0} row(s)`,
  );

  const { data: bTurns } = await clientB.from('turns').select('id');
  record(
    'User B cannot read A turns',
    (bTurns?.length ?? 0) === 0,
    `Got ${bTurns?.length ?? 0} row(s)`,
  );

  const { data: bGaps } = await clientB.from('gaps').select('id');
  record(
    'User B cannot read A gaps',
    (bGaps?.length ?? 0) === 0,
    `Got ${bGaps?.length ?? 0} row(s)`,
  );

  const { data: bCloses } = await clientB.from('closes').select('id');
  record(
    'User B cannot read A closes',
    (bCloses?.length ?? 0) === 0,
    `Got ${bCloses?.length ?? 0} row(s)`,
  );

  const { data: bAudioData, error: bAudioErr } = await clientB.storage
    .from('audio')
    .download(audioPath);
  record(
    'User B cannot read A audio',
    bAudioData === null || bAudioErr !== null,
    bAudioErr ? `Denied: ${bAudioErr.message}` : 'Returned null',
  );

  // Step 7: User B attempts direct ID lookups (should also be empty)
  console.log('\n7. User B attempts direct ID lookups...');

  const { data: bSessionById } = await clientB
    .from('sessions')
    .select('id')
    .eq('id', sessionId);
  record(
    'User B cannot lookup A session by ID',
    (bSessionById?.length ?? 0) === 0,
    `Got ${bSessionById?.length ?? 0} row(s)`,
  );

  const { data: bTurnById } = await clientB
    .from('turns')
    .select('id')
    .eq('id', turnId);
  record(
    'User B cannot lookup A turn by ID',
    (bTurnById?.length ?? 0) === 0,
    `Got ${bTurnById?.length ?? 0} row(s)`,
  );

  const { data: bGapById } = await clientB
    .from('gaps')
    .select('id')
    .eq('id', gapId);
  record(
    'User B cannot lookup A gap by ID',
    (bGapById?.length ?? 0) === 0,
    `Got ${bGapById?.length ?? 0} row(s)`,
  );

  const { data: bCloseById } = await clientB
    .from('closes')
    .select('id')
    .eq('id', closeId);
  record(
    'User B cannot lookup A close by ID',
    (bCloseById?.length ?? 0) === 0,
    `Got ${bCloseById?.length ?? 0} row(s)`,
  );

  // -- Cleanup ---------------------------------------------------------------
  console.log('\n8. Cleaning up...');

  // Delete audio file
  await clientA.storage.from('audio').remove([audioPath]);

  // Delete rows via admin (bypasses RLS)
  await admin.from('closes').delete().eq('id', closeId);
  await admin.from('gaps').delete().eq('id', gapId);
  await admin.from('turns').delete().eq('id', turnId);
  await admin.from('sessions').delete().eq('id', sessionId);

  // Delete test users
  await admin.auth.admin.deleteUser(userAId);
  await admin.auth.admin.deleteUser(userBId);
  console.log('   Cleanup complete.');

  // -- Summary ---------------------------------------------------------------
  console.log('\n=== Summary ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  Total: ${results.length}  Passed: ${passed}  Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n  FAILED tests:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    - ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }

  console.log('\n  ALL TESTS PASSED. RLS isolation is working correctly.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
