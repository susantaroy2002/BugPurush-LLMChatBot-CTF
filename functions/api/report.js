// POST /api/report  — record a participant's live status into KV.
// Binding required: CTF_SCORES (KV namespace).
// Body: { id, name, title, score, solved, current, hints }

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.CTF_SCORES) return json({ error: "kv_unbound" }, 500);

  let b;
  try { b = await request.json(); } catch { return json({ error: "bad_request" }, 400); }

  const id = String(b.id || "").slice(0, 60);
  if (!id) return json({ error: "no_id" }, 400);

  const rec = {
    id,
    name: String(b.name || "anon").slice(0, 40),
    title: String(b.title || "").slice(0, 60),
    score: Number(b.score) || 0,
    solved: Number(b.solved) || 0,
    current: Number(b.current) || 1,
    hints: Number(b.hints) || 0,
    updated: Date.now(),
  };

  // Store per-participant key; auto-expire after 12h so stale runs drop off.
  await env.CTF_SCORES.put("p:" + id, JSON.stringify(rec), { expirationTtl: 43200 });
  return json({ ok: true }, 200);
}

export async function onRequest(context) {
  if (context.request.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });
  return onRequestPost(context);
}

function json(o, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s, headers: { "Content-Type": "application/json" },
  });
}
