// Cloudflare Pages Function — POST /api/chat
// Injects the Anthropic API key server-side so it is never exposed to the browser.
// Set ANTHROPIC_API_KEY as an environment variable / secret in the Pages project.

// --- very simple in-memory per-IP rate limit (best-effort; resets per worker) ---
const HITS = new Map();            // ip -> [timestamps]
const WINDOW_MS = 10_000;          // 10 second window
const MAX_IN_WINDOW = 6;           // max requests per IP per window

function rateLimited(ip) {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > MAX_IN_WINDOW;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (rateLimited(ip)) {
    return json({ error: "rate_limited" }, 429);
  }

  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "server_misconfigured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = typeof body.system === "string" ? body.system : "";

  // Guardrails on input size to keep costs bounded.
  if (messages.length > 40) {
    return json({ error: "too_long" }, 400);
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      // Do not leak upstream error internals to the client.
      return json({ error: "upstream_error" }, 502);
    }

    // Return only the content array the frontend needs.
    return json({ content: data.content || [] }, 200);
  } catch (e) {
    return json({ error: "fetch_failed" }, 502);
  }
}

// Reject anything that isn't POST.
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return onRequestPost(context);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
