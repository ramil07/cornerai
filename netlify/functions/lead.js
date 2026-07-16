// Stores captured lead emails in a Netlify Blobs store. No PII leaves your project.
import { getStore } from "@netlify/blobs";

const ALLOWED_ORIGINS = new Set([
  "https://cornerai.io",
  "https://www.cornerai.io",
  "https://main--corenerai.netlify.app",
]);

export default async (req) => {
  const origin = req.headers.get("origin");
  const corsOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://cornerai.io";
  const cors = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  const json = (status, obj) =>
    new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors } });

  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method Not Allowed" });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(403, { error: "Forbidden origin" });

  let body;
  try { body = JSON.parse(await req.text()); } catch { return json(400, { error: "Invalid JSON" }); }

  const email = String(body?.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return json(400, { error: "Invalid email" });
  }
  const source = String(body?.source || "site").slice(0, 40);

  try {
    const store = getStore({ name: "leads", consistency: "strong" });
    // one blob per email (dedupes automatically); store first-seen date + source
    const existing = await store.get(email, { type: "json" });
    if (!existing) {
      await store.setJSON(email, { email, source, createdAt: new Date().toISOString() });
    }
  } catch (_) {
    // if the store hiccups, still return success so the UX isn't blocked
  }
  return json(200, { ok: true });
};
