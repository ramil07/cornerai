// Netlify Function (v2, ESM) — hardened proxy to the Anthropic API.
// Keeps the API key server-side AND enforces server-side abuse limits so the
// browser can no longer dictate model, token count, or usage volume.

import { getStore } from "@netlify/blobs";

// Only these two models may ever be called (blocks expensive-model abuse).
const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-20250514",
]);
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

// Only requests coming from the real site are accepted (blocks other sites
// using this endpoint as a free Claude proxy).
const ALLOWED_ORIGINS = new Set([
  "https://cornerai.io",
  "https://www.cornerai.io",
  "https://main--corenerai.netlify.app",
]);

const DAILY_LIMIT = 5;                 // messages per IP per day
const MAX_TOKENS_CAP = 2048;           // hard ceiling on output tokens
const MAX_BODY_BYTES = 5 * 1024 * 1024;// 5MB — allows video frames, blocks giant payloads
const MAX_MESSAGES = 40;               // cap conversation length per request

export default async (req, context) => {
  const origin = req.headers.get("origin");
  const corsOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://cornerai.io";
  const cors = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  const json = (status, obj) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });

  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });

  // Block cross-site abuse: if an Origin is present it must be one of ours.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(403, { error: "Forbidden origin" });
  }

  // Size guard before parsing.
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "Payload too large" });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, { error: "Invalid request" });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return json(400, { error: "Too many messages" });
  }

  // Force a permitted model and clamp output tokens (attacker-proof).
  if (!ALLOWED_MODELS.has(body.model)) body.model = DEFAULT_MODEL;
  const requestedTokens = Number(body.max_tokens) || 1024;
  body.max_tokens = Math.min(Math.max(requestedTokens, 1), MAX_TOKENS_CAP);

  // Per-IP daily rate limit. Fail-open: never break chat if the store hiccups.
  const ip =
    req.headers.get("x-nf-client-connection-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    context?.ip ||
    "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${day}`;
  try {
    const store = getStore({ name: "chat-rate-limit", consistency: "strong" });
    const current = Number((await store.get(key)) || 0);
    if (current >= DAILY_LIMIT) {
      return json(429, {
        error: "You've hit today's free limit. Come back tomorrow, or upgrade for more.",
      });
    }
    await store.set(key, String(current + 1));
  } catch (_) {
    // store unavailable -> allow request (other guardrails still apply)
  }

  // Forward to Anthropic with the server-held key.
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return json(resp.status, data);
  } catch (err) {
    return json(500, { error: err.message });
  }
};
