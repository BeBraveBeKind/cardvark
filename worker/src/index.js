// Reads one business-card photo for Cardvark and nothing else.
// The model, token cap and prompt are fixed here; the caller only supplies the image.

const ALLOWED_ORIGINS = new Set(['https://cardvark.rise-above.net']);
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const MAX_IMAGE_CHARS = 7_000_000; // base64 of a ~5 MB image, Anthropic's per-image limit
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const PROMPT = `Extract contact information from this business card image. Return ONLY a valid JSON object with these exact keys (use null for missing fields, use arrays for email and phone even if there's only one):

{"first_name": "", "last_name": "", "company": "", "job_title": "", "email": [], "phone": [], "address": "", "website": "", "linkedin": "", "twitter": "", "instagram": ""}`;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

// Errors use Anthropic's shape so the app's existing handler shows the message.
function fail(status, message, headers) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function findImage(body) {
  const msgs = body && Array.isArray(body.messages) ? body.messages : [];
  if (msgs.length !== 1 || !Array.isArray(msgs[0].content)) return null;
  const images = msgs[0].content.filter((c) => c && c.type === 'image');
  if (images.length !== 1) return null;
  const src = images[0].source || {};
  if (src.type !== 'base64' || !IMAGE_TYPES.has(src.media_type)) return null;
  if (typeof src.data !== 'string' || !src.data || src.data.length > MAX_IMAGE_CHARS) return null;
  return { media_type: src.media_type, data: src.data };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!ALLOWED_ORIGINS.has(origin)) return fail(403, 'Not allowed', {});
    const headers = cors(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return fail(405, 'Method not allowed', headers);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.SCAN_LIMITER) {
      const { success } = await env.SCAN_LIMITER.limit({ key: ip });
      if (!success) return fail(429, 'Too many scans in a minute. Wait a moment and try again.', headers);
    }

    if (!env.CLAUDE_API_KEY) return fail(500, 'Scanner is not configured', headers);

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, 'Send one business card photo', headers);
    }
    const image = findImage(body);
    if (!image) return fail(400, 'Send one business card photo', headers);

    try {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', ...image } },
              { type: 'text', text: PROMPT },
            ],
          }],
        }),
      });
      const data = await upstream.text();
      return new Response(data, {
        status: upstream.status,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch {
      return fail(502, 'Could not reach the card reader. Try again.', headers);
    }
  },
};
