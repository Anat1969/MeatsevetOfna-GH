// מסלול: תמונת שער לקישור (og:image) של כתבה על תצוגה. מורידה את התמונה, שומרת בדלי ומחזירה כתובת קבועה.
// משמש את ארכיון התפאורות ואת "קישורים ששמרתי". הקרדיט נשאר לאתר המקור.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-owner-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
function same(a: string, b: string) { if (!a || !b || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const ok = (u: string) => { try { const x = new URL(u); return x.protocol === "https:" && !/^(localhost|[\d.]+)$/.test(x.hostname) && !x.hostname.includes(":"); } catch { return false; } };
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x2F;/g, "/").replace(/&#47;/g, "/");

async function one(key: string, page: string) {
  if (!ok(page)) return { key, error: "url" };
  const r = await fetch(page, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) return { key, error: `page ${r.status}` };
  const html = (await r.text()).slice(0, 400000);
  const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
  if (!m) return { key, error: "no og:image" };
  const src = new URL(decode(m[1]), page).toString();
  if (!ok(src)) return { key, error: "image url" };
  const im = await fetch(src, { headers: { "User-Agent": UA, Referer: page }, signal: AbortSignal.timeout(20000) });
  const type = (im.headers.get("content-type") ?? "").split(";")[0];
  if (!im.ok || !/^image\/(jpeg|png|webp|avif)$/.test(type)) return { key, error: `image ${im.status} ${type}` };
  const buf = await im.arrayBuffer();
  if (buf.byteLength > 12 * 1024 * 1024) return { key, error: "big" };
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const path = `sets/${key.replace(/[^a-z0-9-]/gi, "")}.${ext}`;
  const up = await sb.storage.from("mo-media").upload(path, buf, { contentType: type, upsert: true, cacheControl: "31536000" });
  if (up.error) return { key, error: up.error.message };
  return { key, url: sb.storage.from("mo-media").getPublicUrl(path).data.publicUrl, source: page };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const owner = Deno.env.get("MO_OWNER_KEY")?.trim() ?? "";
  if (owner && !same(req.headers.get("x-owner-key") ?? "", owner)) return json({ error: "צריך את סיסמת העורכת." }, 401);
  let b: { items?: { key: string; url: string }[] };
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  const items = (b.items ?? []).slice(0, 12);
  const out = await Promise.all(items.map((i) => one(String(i.key), String(i.url)).catch((e) => ({ key: i.key, error: String(e) }))));
  return json({ results: out });
});
