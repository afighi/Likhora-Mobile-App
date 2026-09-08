/**
 * Khora AI — Supabase Edge Function.
 *
 * The Anthropic key must never ship inside the Expo bundle: anything in the
 * app is readable by anyone who installs it. So the app posts a prompt here,
 * this function calls Claude with the key held as a Supabase secret, and only
 * the reply goes back.
 *
 * Everything that costs money is decided server-side — the model, the effort
 * level, and the token ceiling are all fixed here and any values the client
 * sends for them are ignored. A client-controlled model or max_tokens would
 * make this endpoint an open tap on the project's Anthropic credits.
 *
 * Deploy:
 *   supabase functions deploy khora-ai
 *
 * Secret:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import Anthropic from 'npm:@anthropic-ai/sdk';

// Claude Opus 5. Every caller here is short-form: business advice, a pricing
// decision, or a small JSON object — so effort stays low, which is the lever
// for cost rather than reaching for a weaker model.
const MODEL = 'claude-opus-5';
const EFFORT = 'low';

// Generous rather than tight: adaptive thinking is on by default on Opus 5 and
// its tokens count toward this ceiling, so a lowballed value truncates the
// JSON the callers parse. Effort, not max_tokens, is what keeps spend down.
const MAX_TOKENS = 8192;

// Roughly 15k characters of prompt is far more than any caller in this app
// sends; past that, something is wrong or someone is probing the endpoint.
const MAX_PROMPT_CHARS = 15000;

const DEFAULT_SYSTEM =
  'You are Khora AI, an expert, warm, and highly intelligent Filipino small business growth and legal compliance assistant. Answer directly and practically in plain English. Explain Philippine business requirements (DTI, Barangay, BIR, Mayor Permit, BMBE) accurately, and help with product costing and supplier sourcing for micro-businesses.';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    console.error('ANTHROPIC_API_KEY is not set');
    return json({ error: 'AI is not configured' }, 503);
  }

  let body: { prompt?: string; system?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const prompt = (body.prompt || '').trim();
  if (!prompt) return json({ error: 'Missing prompt' }, 400);
  if (prompt.length > MAX_PROMPT_CHARS) {
    return json({ error: 'Prompt is too long' }, 413);
  }

  const system = (body.system || DEFAULT_SYSTEM).slice(0, 2000);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: EFFORT },
      thinking: { type: 'adaptive' },
      // Marks the system prompt as cacheable. These prompts are short enough
      // that they may fall under the minimum cacheable prefix and never
      // actually hit — it costs nothing and starts paying off if the callers'
      // system prompts grow.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt }],
    });

    // Safety classifiers can decline a request with HTTP 200, so check this
    // before reading content — otherwise a refusal reads as an empty reply.
    if (response.stop_reason === 'refusal') {
      console.warn('Refused:', response.stop_details);
      return json({ error: 'Khora could not answer that request.' }, 422);
    }

    // Adaptive thinking means content[0] may be a thinking block. The callers
    // read content[0].text, so return text blocks only — handing back a
    // thinking block first would silently break every JSON parser upstream.
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      console.warn('No text in response, stop_reason:', response.stop_reason);
      return json({ error: 'Empty response from Khora.' }, 502);
    }

    console.log(
      `usage in=${response.usage.input_tokens} out=${response.usage.output_tokens} ` +
        `cache_read=${response.usage.cache_read_input_tokens ?? 0}`
    );

    // Anthropic's own response shape, so services/claude.ts can read
    // content[0].text whether it is talking to this function or a self-hosted
    // endpoint.
    return json({ content: [{ type: 'text', text }] });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: 'Khora is busy right now. Please try again shortly.' }, 429);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic auth failed — check ANTHROPIC_API_KEY');
      return json({ error: 'AI is not configured' }, 503);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
      return json({ error: 'Khora could not answer right now.' }, 502);
    }
    console.error('Unexpected error:', error);
    return json({ error: 'Something went wrong.' }, 500);
  }
});
