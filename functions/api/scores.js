// GET /api/scores — return all participant records for the dashboard.
// Binding required: CTF_SCORES (KV namespace).

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CTF_SCORES) return json({ error: "kv_unbound", players: [] }, 500);

  const list = await env.CTF_SCORES.list({ prefix: "p:" });
  const players = [];
  // Fetch values in parallel.
  await Promise.all(
    list.keys.map(async (k) => {
      const v = await env.CTF_SCORES.get(k.name);
      if (v) { try { players.push(JSON.parse(v)); } catch {} }
    })
  );

  players.sort((a, b) =>
    b.score - a.score || b.solved - a.solved || a.updated - b.updated
  );

  return json({ players, count: players.length, ts: Date.now() }, 200);
}

export async function onRequest(context) {
  if (context.request.method !== "GET")
    return new Response("Method Not Allowed", { status: 405 });
  return onRequestGet(context);
}

function json(o, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
