// mo-fits: המדידות שלי בשרת (ענת, 26.11.2026: "תשמור את הגלריה גם בשרת, שיהיה גם בטלפון").
// בכל תמונה יש את הפנים שלה, ולכן הכול סגור: טבלה mo_fits בלי מדיניות גישה ודלי mo-fits פרטי.
// הגישה רק עם מפתח גלריה אישי שנוצר בדפדפן שלה (32 תווים). בשרת נשמר רק הגיבוב שלו (sha-256),
// והתמונות נקראות בקישורים חתומים לשעה אחת.
// הנשים שלי (ענת, 26.11.2026: "תיקייה עם תמונות של הנשים שלי... שמירה בשם ואז ניתן לחפש"): אותו מפתח, טבלה mo_women
// בלי מדיניות גישה, והצילומים באותו דלי פרטי תחת owner/women/. נשמרת רק אישה ששמרו במפורש, בשם.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BUCKET = "mo-fits";
const MAX = 120;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const s = (v: unknown, n = 120) => (typeof v === "string" ? v.slice(0, n) : "");
const hash = async (k: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(k)))].map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  const key = s(b.key, 80);
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(key)) return json({ error: "צריך מפתח גלריה." }, 401);
  const owner = await hash(key);
  const action = s(b.action, 20);

  try {
    if (action === "list") {
      const { data, error } = await sb.from("mo_fits").select("id,path,look,collection,mode,woman,created_at").eq("owner", owner).order("created_at", { ascending: false }).limit(MAX);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return json({ items: [] });
      const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.path), 3600);
      const url = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
      return json({ items: rows.map((r) => ({ id: r.id, url: url.get(r.path) ?? "", look: r.look, collection: r.collection, mode: r.mode, woman: r.woman ?? "", at: Date.parse(r.created_at) })).filter((x) => x.url) });
    }

    if (action === "save") {
      const m = s(b.image, 12_000_000).match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/s);
      if (!m) return json({ error: "צריך תמונה." }, 400);
      const bin = Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0));
      if (bin.byteLength > 8_000_000) return json({ error: "התמונה גדולה מדי." }, 413);
      const path = `${owner}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${m[2] === "jpeg" ? "jpg" : m[2]}`;
      const up = await sb.storage.from(BUCKET).upload(path, bin, { contentType: m[1] });
      if (up.error) throw up.error;
      const mode = ["scene", "dress", "bridge"].includes(s(b.mode)) ? s(b.mode) : "scene";
      const woman = s(b.woman, 60).replace(/\s+/g, " ").trim();
      const { data, error } = await sb.from("mo_fits").insert({ owner, path, look: s(b.look), collection: s(b.collection), mode, woman }).select("id,created_at").single();
      if (error) throw error;
      // keep the newest MAX
      const { data: old } = await sb.from("mo_fits").select("id,path").eq("owner", owner).order("created_at", { ascending: false }).range(MAX, MAX + 50);
      if (old?.length) { await sb.storage.from(BUCKET).remove(old.map((o) => o.path)); await sb.from("mo_fits").delete().in("id", old.map((o) => o.id)); }
      const { data: sg } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
      return json({ item: { id: data.id, url: sg?.signedUrl ?? "", look: s(b.look), collection: s(b.collection), mode, woman, at: Date.parse(data.created_at) } });
    }

    if (action === "delete") {
      const id = s(b.id, 40);
      const { data: row } = await sb.from("mo_fits").select("id,path").eq("owner", owner).eq("id", id).maybeSingle();
      if (!row) return json({ ok: true });
      await sb.storage.from(BUCKET).remove([row.path]);
      await sb.from("mo_fits").delete().eq("id", row.id).eq("owner", owner);
      return json({ ok: true });
    }
    // המדידות לפי הנשים שלי (ענת, 27.11.2026): every fitting carries the name of the woman in it; older ones are assigned by hand
    if (action === "assign") {
      const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map((x) => s(x, 40)).filter(Boolean).slice(0, 200);
      const woman = s(b.woman, 60).replace(/\s+/g, " ").trim();
      if (!ids.length) return json({ error: "id" }, 400);
      const { error } = await sb.from("mo_fits").update({ woman }).eq("owner", owner).in("id", ids);
      if (error) throw error;
      return json({ ok: true, woman });
    }

    if (action === "women") {
      const { data, error } = await sb.from("mo_women").select("id,name,path,created_at").eq("owner", owner).order("name").limit(500);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return json({ items: [] });
      const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.path), 3600);
      const url = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
      return json({ items: rows.map((r) => ({ id: r.id, name: r.name, url: url.get(r.path) ?? "", at: Date.parse(r.created_at) })).filter((x) => x.url) });
    }

    if (action === "woman_save") {
      const name = s(b.name, 60).replace(/\s+/g, " ").trim();
      if (!name) return json({ error: "צריך שם." }, 400);
      const m = s(b.image, 12_000_000).match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/s);
      if (!m) return json({ error: "צריך תמונה." }, 400);
      const bin = Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0));
      if (bin.byteLength > 8_000_000) return json({ error: "התמונה גדולה מדי." }, 413);
      const { count } = await sb.from("mo_women").select("id", { count: "exact", head: true }).eq("owner", owner);
      if ((count ?? 0) >= 500) return json({ error: "יש כבר 500 נשים בתיקייה." }, 409);
      const path = `${owner}/women/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${m[2] === "jpeg" ? "jpg" : m[2]}`;
      const up = await sb.storage.from(BUCKET).upload(path, bin, { contentType: m[1] });
      if (up.error) throw up.error;
      const { data, error } = await sb.from("mo_women").insert({ owner, name, path }).select("id,created_at").single();
      if (error) throw error;
      const { data: sg } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
      return json({ item: { id: data.id, name, url: sg?.signedUrl ?? "", at: Date.parse(data.created_at) } });
    }

    if (action === "woman_delete") {
      const id = s(b.id, 40);
      const { data: row } = await sb.from("mo_women").select("id,path").eq("owner", owner).eq("id", id).maybeSingle();
      if (!row) return json({ ok: true });
      await sb.storage.from(BUCKET).remove([row.path]);
      await sb.from("mo_women").delete().eq("id", row.id).eq("owner", owner);
      return json({ ok: true });
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    console.log("fits", action, String((e as { message?: string })?.message ?? e).slice(0, 200));
    return json({ error: "הגלריה לא נשמרה הפעם." }, 500);
  }
});
