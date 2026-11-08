// מסלול: הזזת תמונות בין שלבים ובין לוקים, וייבוא תמונה שנגררה מאתר אחר (למשל לשונית של מידג'רני).
// אותה הרשאה כמו mo-studio: כש-MO_OWNER_KEY מוגדר, נדרשת הכותרת x-owner-key.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-owner-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BUCKET = "mo-media";
const ID = /^[0-9a-f-]{36}$/i;
const SHOTS = ["sketch", "model", "editorial"];
const ORDER = ["prompt", "sketch", "model", "editorial", "film", "ready"];
const MAX = 15 * 1024 * 1024;
type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function same(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** The moved or imported image leads its new place; the place it left gets its next image as lead. */
async function lead(mediaId: string, lookId: string, stage: string) {
  await sb.from("mo_media").update({ is_primary: false }).eq("look_id", lookId).eq("stage", stage).neq("id", mediaId);
  await sb.from("mo_media").update({ is_primary: true }).eq("id", mediaId);
  const { data: look } = await sb.from("mo_looks").select("stage").eq("id", lookId).single();
  if (look && ORDER.indexOf(String(look.stage)) < ORDER.indexOf(stage)) await sb.from("mo_looks").update({ stage }).eq("id", lookId);
}
async function heal(lookId: string, stage: string) {
  const { count } = await sb.from("mo_media").select("id", { count: "exact", head: true }).eq("look_id", lookId).eq("stage", stage).eq("is_primary", true);
  if (count) return;
  const { data } = await sb.from("mo_media").select("id").eq("look_id", lookId).eq("stage", stage).order("created_at", { ascending: false }).limit(1);
  if (data?.[0]) await sb.from("mo_media").update({ is_primary: true }).eq("id", data[0].id);
}

function safeUrl(u: string) {
  try {
    const x = new URL(u);
    if (x.protocol !== "https:") return null;
    const h = x.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^[\d.]+$/.test(h) || h.includes(":")) return null;
    return x;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const owner = Deno.env.get("MO_OWNER_KEY")?.trim() ?? "";
  if (owner && !same(req.headers.get("x-owner-key") ?? "", owner)) return json({ error: "צריך את סיסמת העורכת." }, 401);
  let b: Row;
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  const look = s(b.look_id), stage = s(b.stage);
  if (!ID.test(look) || !SHOTS.includes(stage)) return json({ error: "יעד לא תקין." }, 400);

  try {
    if (b.action === "move") {
      const id = s(b.media_id); if (!ID.test(id)) return json({ error: "id" }, 400);
      const { data: m } = await sb.from("mo_media").select("*").eq("id", id).single();
      if (!m) return json({ error: "התמונה לא נמצאה." }, 404);
      if (m.kind !== "image") return json({ error: "רק תמונות עוברות בין שלבים." }, 400);
      const { error } = await sb.from("mo_media").update({ look_id: look, stage }).eq("id", id);
      if (error) throw new Error(error.message);
      await lead(id, look, stage);
      if (m.is_primary) await heal(String(m.look_id), String(m.stage));
      const { data } = await sb.from("mo_media").select("*").eq("id", id).single();
      return json({ media: data, from: { look_id: m.look_id, stage: m.stage } });
    }

    if (b.action === "import_url") {
      const url = safeUrl(s(b.url));
      if (!url) return json({ error: "אפשר לגרור רק תמונה מכתובת https." }, 400);
      const r = await fetch(url, { headers: { "User-Agent": "Maslul/1.0", Accept: "image/*" }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) return json({ error: `האתר לא נתן את התמונה (${r.status}). אפשר לשמור אותה ולגרור את הקובץ.` }, 502);
      const type = (r.headers.get("content-type") ?? "").split(";")[0];
      if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "זו לא תמונה מסוג JPG, PNG או WEBP." }, 415);
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX) return json({ error: "התמונה גדולה מדי." }, 413);
      const { data: lk } = await sb.from("mo_looks").select("collection_id,n").eq("id", look).single();
      if (!lk) return json({ error: "הלוק לא נמצא." }, 404);
      const ext = type.split("/")[1].replace("jpeg", "jpg");
      const path = `c/${lk.collection_id}/l${lk.n}-${stage}-drag-${Date.now()}.${ext}`;
      const up = await sb.storage.from(BUCKET).upload(path, buf, { contentType: type, cacheControl: "31536000" });
      if (up.error) throw new Error(up.error.message);
      const pub = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const source = /midjourney|mj/i.test(url.hostname) ? "mj" : "upload";
      const { data: m, error } = await sb.from("mo_media").insert({ look_id: look, kind: "image", source, stage, url: pub, path, is_primary: false }).select().single();
      if (error) throw new Error(error.message);
      await lead(String(m.id), look, stage);
      return json({ media: { ...m, is_primary: true } });
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
