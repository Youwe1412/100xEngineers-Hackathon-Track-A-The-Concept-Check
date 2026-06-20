// Shared CORS headers + helpers for every Edge Function.
// The Groq key never crosses this boundary; only transcripts/verdicts do.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Preflight short-circuit. Return this for OPTIONS requests.
export function preflight(): Response {
  return new Response('ok', { headers: corsHeaders });
}

// JSON response with CORS headers applied.
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
