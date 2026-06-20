// Single provider: Groq, via its OpenAI-compatible API.
// The Groq key (gsk_...) lives only here, server-side, and travels in the
// Authorization header to Groq. It is NEVER returned to the client.
//
// STT: whisper-large-v3 (accuracy over latency; a garbled transcript can make the
//   Verifier misjudge a real derivation). Language auto-detected (EN/HI code-switch).
// LLM: openai/gpt-oss-120b for all three roles. gpt-oss returns a separate reasoning
//   channel plus a final answer; we read ONLY message.content (the final answer).

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const STT_MODEL = 'whisper-large-v3';
const LLM_MODEL = 'openai/gpt-oss-120b';

function groqKey(): string {
  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) throw new Error('GROQ_API_KEY is not set');
  return key;
}

// Run a thunk, and on any failure retry exactly once before rethrowing.
async function withOneRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (_err) {
    return await fn();
  }
}

// Transcribe an audio blob. Auto-detect language; keep hesitations/fillers (signal).
// Returns the raw transcript string.
export async function groqTranscribe(file: Blob): Promise<string> {
  return await withOneRetry(async () => {
    const form = new FormData();
    form.append('file', file, 'audio.webm');
    form.append('model', STT_MODEL);
    form.append('response_format', 'json');
    // No `language` field on purpose: let Whisper auto-detect the code-switch.

    const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey()}` },
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Groq transcription failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return (data.text ?? '') as string;
  });
}

// whisper-large-v3 fed silence or near-silence emits a small set of phantom
// phrases — "you", "thank you", "thanks for watching" — instead of empty text.
// When one of these is the WHOLE transcript, it is almost certainly a non-answer,
// not the learner's words. Matched only as a complete utterance so a genuine
// sentence that merely contains "you" is never touched.
const SILENCE_HALLUCINATIONS = new Set([
  'you',
  'thank you',
  'thank you.',
  'thank you for watching',
  'thank you for watching.',
  'thanks for watching',
  'thanks for watching!',
  'bye',
  'bye.',
  'please subscribe',
  '.',
]);

export function isLikelySilenceHallucination(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized === '') return true;
  return SILENCE_HALLUCINATIONS.has(normalized);
}

export interface ChatArgs {
  system: string;
  user: string;
  temperature: number;
}

// One chat completion. Returns the final answer content only (reasoning ignored).
export async function groqChat({ system, user, temperature }: ChatArgs): Promise<string> {
  return await withOneRetry(async () => {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Groq chat failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? '') as string;
  });
}

// Strip ```json fences / stray prose, then JSON.parse. Returns null on failure so
// callers can apply a safe default rather than throw.
export function parseFinalJson<T>(content: string): T | null {
  try {
    let text = content.trim();
    // Remove a fenced block if present (```json ... ``` or ``` ... ```).
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    // Otherwise carve out the outermost JSON object from any surrounding prose.
    if (!text.startsWith('{')) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        text = text.slice(start, end + 1);
      }
    }
    return JSON.parse(text) as T;
  } catch (_err) {
    return null;
  }
}
