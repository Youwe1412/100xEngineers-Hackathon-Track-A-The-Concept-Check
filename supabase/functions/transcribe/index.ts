// POST /transcribe  (multipart: audio, session_id)
// Upload the blob to the private "audio" bucket under the user's uid prefix, send
// it to Groq whisper-large-v3, and store a learner turn (raw transcript, fillers
// kept). Returns { turn_id, transcript, audio_path }.

import { preflight, json } from '../_shared/cors.ts';
import { getAuthedContext } from '../_shared/supabase.ts';
import { groqTranscribe, isLikelySilenceHallucination } from '../_shared/groq.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let ctx;
  try {
    ctx = await getAuthedContext(req);
  } catch (resp) {
    return resp as Response;
  }
  const { supabase, uid } = ctx;

  const form = await req.formData();
  const audio = form.get('audio');
  const sessionId = form.get('session_id');
  if (!(audio instanceof File) || typeof sessionId !== 'string') {
    return json({ error: 'audio (File) and session_id are required' }, 400);
  }

  // uid prefix satisfies the audio bucket RLS policy: foldername(name)[1] = uid.
  const audioPath = `${uid}/${sessionId}/${Date.now()}.webm`;
  const { error: uploadErr } = await supabase.storage
    .from('audio')
    .upload(audioPath, audio, {
      contentType: audio.type || 'audio/webm',
      upsert: false,
    });
  if (uploadErr) {
    return json({ error: 'audio_upload_failed', detail: uploadErr.message }, 500);
  }

  // Accuracy over latency: a garbled transcript can make the Verifier misjudge a
  // real derivation. Keep the raw transcript including hesitations and fillers.
  let transcript: string;
  try {
    transcript = await groqTranscribe(audio);
  } catch (err) {
    return json({ error: 'transcription_failed', detail: String(err) }, 502);
  }

  // Silence in, phantom out: Whisper turns an empty/near-silent clip into "you" or
  // "thank you". Refuse it rather than record a turn the learner never spoke, so the
  // Verifier never grades a hallucination. The client shows this and lets them retry.
  if (isLikelySilenceHallucination(transcript)) {
    return json(
      {
        error: "We didn't catch any speech. Try recording again, a little closer to the mic.",
      },
      422,
    );
  }

  const { data: turn, error: turnErr } = await supabase
    .from('turns')
    .insert({
      session_id: sessionId,
      role: 'learner',
      transcript,
      audio_path: audioPath,
    })
    .select('id')
    .single();

  if (turnErr || !turn) {
    return json({ error: 'turn_insert_failed', detail: turnErr?.message }, 500);
  }

  return json({ turn_id: turn.id, transcript, audio_path: audioPath });
});
