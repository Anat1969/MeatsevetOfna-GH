// מסלול: הזזת תמונות בין שלבים ובין לוקים, ייבוא תמונה שנגררה מאתר אחר (למשל לשונית של מידג'רני),
// ופס הקול של קולקציה (קישור Suno מפרטיטורה וקובץ שמע).
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

async function sha(t: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const AUDIO = /^(mp3|m4a|wav|ogg|webm|aac|mp4)$/;
async function signAudio(cid: string, ext: string) {
  if (!AUDIO.test(ext)) return json({ error: "קובץ שמע: MP3, M4A או WAV." }, 400);
  const path = `c/${cid}/soundtrack-${Date.now()}.${ext}`;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return json({ signedUrl: data.signedUrl, path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}
/** Merge a patch into the soundtrack; a new file replaces the old one in the bucket. */
async function mergeSound(cid: string, p: Row, allow: string[]) {
  const clean: Row = Object.fromEntries(Object.entries(p).filter(([k, v]) => allow.includes(k) && (typeof v === "string" || typeof v === "number")).map(([k, v]) => [k, typeof v === "number" ? v : String(v).slice(0, 4000)]));
  if (clean.suno_url && !/^https:\/\/(www\.)?suno\.com\//.test(String(clean.suno_url))) return json({ error: "קישור Suno לא תקין." }, 400);
  if (clean.audio_url && !String(clean.audio_url).includes(`/${BUCKET}/c/${cid}/`)) return json({ error: "audio" }, 400);
  if (clean.audio_path && !String(clean.audio_path).startsWith(`c/${cid}/`)) return json({ error: "audio" }, 400);
  if ("duration" in clean) { const d = Number(clean.duration); if (!(d > 0 && d < 3600)) delete clean.duration; else clean.duration = Math.round(d * 10) / 10; }
  if (typeof clean.handoff === "string") { clean.handoff_hash = await sha(String(clean.handoff)); clean.handoff_at = new Date().toISOString(); delete clean.handoff; }
  const { data: c } = await sb.from("mo_collections").select("soundtrack").eq("id", cid).single();
  if (!c) return json({ error: "הקולקציה לא נמצאה." }, 404);
  const old = (c.soundtrack ?? {}) as Row;
  if (clean.audio_path && old.audio_path && old.audio_path !== clean.audio_path) await sb.storage.from(BUCKET).remove([String(old.audio_path)]);
  if (clean.audio_url && !("duration" in clean)) delete old.duration;
  const next = { ...old, ...clean, updated_at: new Date().toISOString() };
  await sb.from("mo_collections").update({ soundtrack: next }).eq("id", cid);
  const { handoff_hash: _h, ...pub } = next as Row;
  return json({ soundtrack: pub });
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
  let b: Row;
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  try {
    // Partitura hands a song back with the one-time key that the studio put in its link (no editor password there)
    if (b.action === "handoff_sign" || b.action === "handoff_save") {
      const cid = s(b.collection_id), key = s(b.key);
      if (!ID.test(cid) || key.length < 24) return json({ error: "id" }, 400);
      const { data: c } = await sb.from("mo_collections").select("soundtrack").eq("id", cid).single();
      const st = (c?.soundtrack ?? {}) as Row;
      const fresh = st.handoff_at && Date.now() - Date.parse(String(st.handoff_at)) < 30 * 864e5;
      if (!c || !st.handoff_hash || !fresh || !same(await sha(key), String(st.handoff_hash))) return json({ error: "הקישור למסלול פג. פותחים שוב מהסטודיו." }, 403);
      if (b.action === "handoff_sign") return await signAudio(cid, s(b.ext).toLowerCase());
      return await mergeSound(cid, (b.patch ?? {}) as Row, ["title", "suno_url", "song_id", "audio_url", "audio_path", "duration"]);
    }
  } catch (e) { return json({ error: (e as Error).message }, 500); }
  const owner = Deno.env.get("MO_OWNER_KEY")?.trim() ?? "";
  if (owner && !same(req.headers.get("x-owner-key") ?? "", owner)) return json({ error: "צריך את סיסמת העורכת." }, 401);
  try {
    // the soundtrack of a collection: brief, Suno link, title, and the audio file
    if (b.action === "soundtrack" || b.action === "sign_audio") {
      const cid = s(b.collection_id); if (!ID.test(cid)) return json({ error: "id" }, 400);
      if (b.action === "sign_audio") return await signAudio(cid, s(b.ext).toLowerCase());
      return await mergeSound(cid, (b.patch ?? {}) as Row, ["brief_he", "title", "suno_url", "song_id", "audio_url", "audio_path", "duration", "handoff"]);
    }

  const look = s(b.look_id), stage = s(b.stage);
  if (!ID.test(look) || !SHOTS.includes(stage)) return json({ error: "יעד לא תקין." }, 400);

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
