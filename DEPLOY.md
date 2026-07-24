# Deploy BUG PURSH // PROMPT-BREACH CTF (Cloudflare Pages)

This gives you a public URL anyone can open, with your Anthropic API key kept
safely on the server. Free tier is fine for ~20 participants.

## What's in this folder
```
public/index.html        <- the CTF (calls /api/chat, not Anthropic directly)
functions/api/chat.js    <- serverless proxy that adds your API key + rate limits
DEPLOY.md                <- this file
```

## Prerequisites
- A Cloudflare account (free): https://dash.cloudflare.com/sign-up
- An Anthropic API key: https://console.anthropic.com  (API Keys -> Create Key)

---

## Option A — Drag & drop (fastest, no Git)

1. Log in to the Cloudflare dashboard.
2. Left sidebar -> **Workers & Pages** -> **Create** -> **Pages** ->
   **Upload assets**.
3. Give the project a name, e.g. `bugpursh-ctf`.
4. Drag the **entire contents** of this folder into the upload box — you must
   include BOTH the `public/` and `functions/` folders. Easiest: zip this whole
   folder and upload the zip, or select all items inside it.
   - IMPORTANT: upload so that `functions/api/chat.js` keeps that path. If the
     dashboard flattens folders, use Option B instead — Functions must live
     under `functions/`.
5. Click **Deploy**. You'll get a URL like `https://bugpursh-ctf.pages.dev`.
6. Now add your key (see **Set the API key** below), then **redeploy**.

> Note: with drag & drop, set the build output directory to `public` if asked.

---

## Option B — Wrangler CLI (most reliable for Functions)

1. Install Node.js, then:
   ```
   npm install -g wrangler
   wrangler login
   ```
2. From inside this folder:
   ```
   wrangler pages deploy public --project-name bugpursh-ctf
   ```
   Wrangler automatically picks up the `functions/` directory next to `public`.
3. Set the secret key:
   ```
   wrangler pages secret put ANTHROPIC_API_KEY --project-name bugpursh-ctf
   ```
   Paste your key when prompted.
4. Redeploy once more so the function picks up the key:
   ```
   wrangler pages deploy public --project-name bugpursh-ctf
   ```

---

## Live dashboard (leaderboard) — requires a KV namespace

The dashboard at `/dashboard` shows all participants' live progress. It needs a
Cloudflare KV namespace bound to the project as `CTF_SCORES`.

Dashboard method:
1. **Workers & Pages** -> **KV** -> **Create a namespace**, name it e.g.
   `ctf_scores`.
2. Your Pages project -> **Settings** -> **Functions** -> **KV namespace
   bindings** -> **Add binding**.
   - Variable name: `CTF_SCORES`  (must match exactly)
   - KV namespace: select `ctf_scores`
3. **Redeploy** the project.

Wrangler method:
```
wrangler kv namespace create ctf_scores
# note the returned id, then bind it:
wrangler pages project ... (or add the binding in the dashboard as above)
```
The simplest reliable route is to create the namespace with Wrangler or the
dashboard, then add the `CTF_SCORES` binding in the dashboard UI and redeploy.

Once bound: open `https://<your-project>.pages.dev/dashboard` on the projector.
It auto-refreshes every 4s. If it shows "kv_unbound", the binding name is wrong
or you haven't redeployed. Records auto-expire after 12h.

---

## Set the API key (dashboard method)

1. **Workers & Pages** -> your project -> **Settings** ->
   **Environment variables** (or **Variables and Secrets**).
2. Add a variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key (starts with `sk-ant-...`)
   - Mark it as **Secret / Encrypt** if offered.
3. Save, then **redeploy** (Deployments -> Retry/Redeploy) so the function
   reads the new value.

---

## Test it
Open your `*.pages.dev` URL. Enter a name at the gate, click **OPEN TARGET
CONSOLE** on Level 1, and send a message. If the bot replies, the proxy + key
are working. If you see "backend error", the key isn't set or the redeploy
didn't happen yet.

---

## Cost & abuse control (do this before sharing widely)
- In the Anthropic console, set a **monthly spend limit** on the key.
- The proxy already rate-limits to 6 requests / 10 seconds per IP. Adjust
  `MAX_IN_WINDOW` / `WINDOW_MS` in `functions/api/chat.js` if needed.
- For a closed meetup you can keep the URL unlisted and only share it with
  attendees. If you later want a shared access code, ask and I'll add one.

---

## Sharing with participants
Just send the `*.pages.dev` link. You can rename the project or attach a custom
domain later under **Custom domains** in the project settings.
