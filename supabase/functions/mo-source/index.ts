// מסלול (MeatsevetOfna-GH): מקור ההשראה של קולקציה (שם, יוצר/ת, מילות השיר וקובץ המקור). פרטי לגמרי.
// הטבלה mo_sources והדלי mo-source סגורים ל-anon (RLS בלי מדיניות). רק הפונקציה הזו קוראת וכותבת אותם.
// והיא נענית רק כש-MO_OWNER_KEY מוגדר והכותרת x-owner-key נכונה. בלי מפתח: סגור, ולא פתוח.
// המקור לא עולה לבית, למסלול, לקישורי שיתוף ולא ל-mo_versions.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-owner-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ID = /^[0-9a-f-]{36}$/i;
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const str = (v: unknown, n: number) => String(v ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  const owner = Deno.env.get("MO_OWNER_KEY")?.trim() ?? "";
  if (!owner) return json({ error: "locked", hint: "MO_OWNER_KEY" }, 403);
  if (!same(req.headers.get("x-owner-key") ?? "", owner)) return json({ error: "owner" }, 401);
  const id = str(b.id, 40);
  if (!ID.test(id)) return json({ error: "id" }, 400);
  try {
    if (b.action === "get") {
      const { data, error } = await sb.from("mo_sources").select("*").eq("collection_id", id).maybeSingle();
      if (error) throw new Error(error.message);
      let imageUrl = "";
      if (data?.image_path) imageUrl = (await sb.storage.from("mo-source").createSignedUrl(data.image_path, 3600)).data?.signedUrl ?? "";
      return json({ source: data ?? null, imageUrl });
    }
    if (b.action === "set") {
      const row: Record<string, unknown> = { collection_id: id, title: str(b.title, 200), author: str(b.author, 200), body: str(b.body, 20000), updated_at: new Date().toISOString() };
      const m = str(b.image, 12_000_000).match(/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,(.+)$/s);
      if (m) {
        const ext = m[2] === "jpeg" ? "jpg" : m[2] ?? "pdf";
        const path = `${id}/source-${Date.now()}.${ext}`;
        const bytes = Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0));
        const up = await sb.storage.from("mo-source").upload(path, bytes, { contentType: m[1], upsert: true });
        if (up.error) throw new Error(up.error.message);
        row.image_path = path;
      }
      const { error } = await sb.from("mo_sources").upsert(row, { onConflict: "collection_id" });
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }
    return json({ error: "action" }, 400);
  } catch (e) { return json({ error: String((e as Error).message ?? e) }, 500); }
});
