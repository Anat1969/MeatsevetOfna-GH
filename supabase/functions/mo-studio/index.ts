// מסלול (MeatsevetOfna-GH): הסטודיו. קורא תמונת קלט (שיר, טקסט או דימוי) ומייצר קולקציית אופנה.
// Gemini החינמי קודם (GEMINI_API_KEY), Claude רק כגיבוי (ANTHROPIC_API_KEY).
// כתיבה: mo_collections ו-mo_links בפרויקט המשותף cultura-GH, ומדיה בדלי mo-media.
// סכמה v2: mo_collections (שדות כעמודות), mo_looks (שלב ייצור), mo_media (כמה תמונות וסרטונים ללוק, אחד ראשי), mo_versions.
// צילום טיוטה: fal (FAL_API_KEY, המפתח שכבר משמש את cultura-GH), מתוך prompt_en.
// הרשאה: כש-MO_OWNER_KEY מוגדר, כל כתיבה דורשת את הכותרת x-owner-key. בלעדיו: פתוח עם מגבלה שעתית.
// תמונת הקלט לא נשמרת בשום מקום: היצירה חיה בלי המקור שלה.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-owner-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const HOURLY_LIMIT = 12;
const MJ_TAIL = "Documentary realism, Professional architecture photography, 1:1 --ar 1:1 --style raw --no text, words, writing, frame divisions";

const SYSTEM = `את/ה מעצב/ת אופנה, משורר/ת ואדריכל/ית תפאורה, בתפקיד אחד.
מקבלים דימוי או טקסט שמעורר השראה, ומתרגמים את רוח התובנה, הריגוש וההעצמה הנשית שבו לקולקציה של שלושה לוקים.

כלל עליון: היצירה חיה בלי המקור שלה.
לעולם לא מזכירים את המקור, את שם היוצר/ת, את שם היצירה, את הספר או את המילה "שיר".
לא מצטטים שורה מהמקור, גם לא חלק ממנה. משתמשים במילים נרדפות, בדימויים חדשים ובהגיגים משלך.
מי שקורא את הקולקציה לא אמור לנחש מאיפה באה.

שפה: עברית טבעית, מזוקקת, פיוטית אבל מדויקת. בלי סימני קריאה, בלי אימוג'י, בלי קלישאות ("להיות את עצמך", "מסע").
הבלטות ב-**כוכביות כפולות** למושג המרכזי בלבד.

השדות:
- name: שם הקולקציה, 2 עד 4 מילים.
- insight: שורת תובנה עד 8 מילים, מסתיימת בנקודה, עם הבלטה אחת.
- manifesto: שלוש שורות קצרות, כל אחת עד 10 מילים: מה הקולקציה אומרת על אישה בעולם.
- haiku: שלוש שורות, בערך 5-7-5 הברות, דימוי מוחשי אחד.
- reading: פרשנות, 2 עד 3 משפטים, עד 50 מילים: מה השם וההייקו פותחים.
- signature: חתימת העיצוב, פרט אחד שחוזר בכל הלוקים (שם 2 עד 4 מילים, ומשפט הסבר עד 20 מילים).
- principles: שלושה עקרונות עיצוב, לכל אחד title (2 עד 4 מילים) ו-text (עד 20 מילים).
- palette: חמישה צבעים מהרגש של הקלט. hex ו-name בעברית (מילה או שתיים). הצבע החמישי הוא הצבע הנסתר של הקולקציה.
- set: התפאורה של המסלול כאדריכל/ית: concept (2 עד 4 מילים), text (משפט עד 25 מילים: חומר, אור, מבנה, תנועה), place_he ו-place_en: מקום אמיתי בעולם שיכול לארח את התצוגה.
- looks: בדיוק שלושה לוקים, תנועה של התחלה, אמצע וסוף. לכל לוק:
  name (2 עד 4 מילים), distill (משפט זיקוק אחד עד 20 מילים), haiku (שלוש שורות, בערך 5-7-5), reading (2 משפטים עד 40 מילים),
  garment (תיאור הבגד, עד 30 מילים: גזרה, בד, צבע, פרט חתימה),
  model (האישה: גיל, נוכחות, תנועה. גילים שונים בין הלוקים),
  place_he ו-place_en (מקום אמיתי: שם בעברית ושם מלא בלועזית, כולל עיר),
  light (אור ושעה), camera (גובה ועדשה),
  prompt_he: פרומפט למידג'רני בעברית, שורה רציפה: האישה, הבגד בפירוט, המקום עם שמו בלועזית בסוגריים, האור, המצלמה. בלי פרמטרים בסוף.
  prompt_en: אותו פרומפט באנגלית, משפט רציף עד 80 מילים, בלי פרמטרים. הדמות כולה בפריים, מכף רגל ועד ראש.
  motion_en: הוראת תנועה קצרה באנגלית לסרטון של 5 שניות מהתמונה (איך הבד זז, הצעד, המצלמה), עד 25 מילים.

גבולות: צנוע ומכובד. גוף מרומז ולא חשוף. לא ממציאים עובדות על מקומות.`;

const S = { type: "STRING" };
const arr = (items: unknown) => ({ type: "ARRAY", items });
const obj = (props: Record<string, unknown>) => ({ type: "OBJECT", required: Object.keys(props), properties: props });
const LOOK = obj({ name: S, distill: S, haiku: arr(S), reading: S, garment: S, model: S, place_he: S, place_en: S, light: S, camera: S, prompt_he: S, prompt_en: S, motion_en: S });
const SCHEMA = obj({
  name: S, insight: S, manifesto: arr(S), haiku: arr(S), reading: S,
  signature: obj({ name: S, text: S }),
  principles: arr(obj({ title: S, text: S })),
  palette: arr(obj({ hex: S, name: S })),
  set: obj({ concept: S, text: S, place_he: S, place_en: S }),
  looks: arr(LOOK),
});
function lower(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(lower);
  if (x && typeof x === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) o[k] = k === "type" ? String(v).toLowerCase() : lower(v);
    if (o.type === "object") o.additionalProperties = false;
    return o;
  }
  return x;
}

const MODELS = [...new Set([Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"])];

async function viaGemini(key: string, mime: string, data: string, note: string) {
  let last: unknown;
  for (const model of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data } }, { text: `זה הקלט. צרו ממנו קולקציה.${note ? `\nכיוון מהמעצבת: ${note}` : ""}` }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.9 },
        }),
        signal: AbortSignal.timeout(80000),
      });
      if (!r.ok) throw Object.assign(new Error(`Gemini ${model} ${r.status}`), { status: r.status });
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      return { c: JSON.parse(text), model };
    } catch (e) {
      last = e;
      const st = (e as { status?: number }).status;
      if (st === 401 || st === 403) throw e;
    }
  }
  throw last;
}

async function viaClaude(key: string, mime: string, data: string, note: string) {
  const client = new Anthropic({ apiKey: key });
  const res = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: lower(SCHEMA) } },
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: mime, data } },
      { type: "text", text: `זה הקלט. צרו ממנו קולקציה.${note ? `\nכיוון מהמעצבת: ${note}` : ""}` },
    ] }],
  } as never);
  const text = res.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  return { c: JSON.parse(text), model: "claude" };
}

type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const list = (v: unknown) => (Array.isArray(v) ? v : []);
const ID = /^[0-9a-f-]{36}$/i;
const BUCKET = "mo-media";

function same(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function countSince(table: string, col: string, extra: Record<string, string> = {}) {
  let q = sb.from(table).select("id", { count: "exact", head: true }).gte(col, new Date(Date.now() - 3600_000).toISOString());
  for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
  const { count } = await q; return count ?? 0;
}

function shapeCollection(c: Row) {
  return {
    name: s(c.name).replace(/\*\*/g, ""), insight: s(c.insight), manifesto: list(c.manifesto).map(s).slice(0, 3),
    haiku: list(c.haiku).map(s).slice(0, 3), reading: s(c.reading),
    signature: c.signature ?? {}, principles: list(c.principles).slice(0, 3), palette: list(c.palette).slice(0, 5),
    set_design: c.set ?? {},
  };
}
function shapeLook(l: Row, i: number) {
  return {
    n: i + 1, name: s(l.name), distill: s(l.distill), haiku: list(l.haiku).map(s).slice(0, 3), reading: s(l.reading),
    garment: { text: s(l.garment) }, model: s(l.model), place_he: s(l.place_he), place_en: s(l.place_en), light: s(l.light), camera: s(l.camera),
    prompt_he: `${s(l.prompt_he).replace(/[.,\s]+$/, "")}. ${MJ_TAIL}`,
    prompt_en: `${s(l.prompt_en).replace(/[.,\s]+$/, "")}, ${MJ_TAIL}`,
    motion_en: s(l.motion_en),
  };
}
const C_FIELDS = ["name", "insight", "manifesto", "haiku", "reading", "signature", "principles", "palette", "set_design", "note"];
const L_FIELDS = ["name", "distill", "haiku", "reading", "garment", "model", "place_he", "place_en", "light", "camera", "prompt_he", "prompt_en", "motion_en", "stage"];
const pick = (o: unknown, keys: string[]) => Object.fromEntries(Object.entries((o ?? {}) as Row).filter(([k]) => keys.includes(k)));

async function full(id: string) {
  const { data: c } = await sb.from("mo_collections").select("*").eq("id", id).single();
  const { data: looks } = await sb.from("mo_looks").select("*, media:mo_media(*)").eq("collection_id", id).order("n");
  return { ...c, looks: looks ?? [] };
}

function falKey(): string | undefined {
  const direct = Deno.env.get("FAL_API_KEY")?.trim();
  if (direct) return direct;
  for (const name of Object.keys(Deno.env.toObject())) {
    if (!/fal/i.test(name) || /^SUPABASE_/i.test(name)) continue;
    const v = Deno.env.get(name)?.trim();
    if (v) return v;
  }
}
async function draftPhoto(look: Row): Promise<Row> {
  const key = falKey();
  if (!key) throw new Error("אין מפתח fal בפרויקט.");
  const prompt = s(look.prompt_en).replace(/--\S+(\s+[^-][^,]*)?/g, "").replace(/\s+/g, " ").trim();
  const full = `${prompt}. Editorial fashion photograph, full figure visible head to toe, the garment is the subject, natural skin, square 1:1, no text, no letters, no watermark.`;
  for (const [endpoint, body] of [
    ["https://fal.run/fal-ai/nano-banana-2", { prompt: full, aspect_ratio: "1:1" }],
    ["https://fal.run/fal-ai/flux/schnell", { prompt: full, image_size: "square_hd", num_inference_steps: 4, num_images: 1 }],
  ] as const) {
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      if (!r.ok) continue;
      const url = (await r.json())?.images?.[0]?.url;
      if (!url) continue;
      const img = await fetch(url); if (!img.ok) continue;
      const type = img.headers.get("content-type") ?? "image/jpeg";
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const path = `c/${look.collection_id}/l${look.n}-draft-${Date.now()}.${ext}`;
      const up = await sb.storage.from(BUCKET).upload(path, await img.arrayBuffer(), { contentType: type, cacheControl: "31536000" });
      if (up.error) continue;
      const pub = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      return await addMedia(String(look.id), "image", "draft", pub, path);
    } catch (_) { /* next model */ }
  }
  throw new Error("צילום הטיוטה נכשל. אפשר לנסות שוב.");
}
async function addMedia(lookId: string, kind: string, source: string, url: string, path: string, primary?: boolean) {
  const { count } = await sb.from("mo_media").select("id", { count: "exact", head: true }).eq("look_id", lookId).eq("kind", kind).eq("is_primary", true);
  const lead = primary ?? (!count || source !== "draft");
  if (lead) await sb.from("mo_media").update({ is_primary: false }).eq("look_id", lookId).eq("kind", kind);
  const { data, error } = await sb.from("mo_media").insert({ look_id: lookId, kind, source, url, path, is_primary: lead }).select().single();
  if (error) throw new Error(error.message);
  const { data: look } = await sb.from("mo_looks").select("stage").eq("id", lookId).single();
  const order = ["prompt", "shot", "film", "ready"];
  const want = kind === "video" ? "film" : "shot";
  if (look && order.indexOf(String(look.stage)) < order.indexOf(want)) await sb.from("mo_looks").update({ stage: want }).eq("id", lookId);
  return data as Row;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: Row;
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  const action = s(b.action);
  const owner = Deno.env.get("MO_OWNER_KEY")?.trim() ?? "";
  const locked = !!owner;
  if (action === "status") return json({ locked, ok: !locked || same(req.headers.get("x-owner-key") ?? "", owner), drafts: !!falKey() });
  if (locked && !same(req.headers.get("x-owner-key") ?? "", owner)) return json({ error: "צריך את סיסמת העורכת." }, 401);

  try {
    if (action === "generate") {
      if (!locked && (await countSince("mo_collections", "created_at")) >= HOURLY_LIMIT) return json({ error: "נוצרו הרבה קולקציות בשעה האחרונה. נסי שוב בעוד שעה." }, 429);
      const m = s(b.image).match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/s);
      if (!m) return json({ error: "צריך תמונה (JPG, PNG או WEBP)." }, 400);
      if (m[3].length > 9_000_000) return json({ error: "התמונה גדולה מדי." }, 413);
      const note = s(b.note).slice(0, 400);
      let out: { c: Row; model: string } | null = null;
      const errors: string[] = [];
      const g = Deno.env.get("GEMINI_API_KEY")?.trim();
      if (g) try { out = await viaGemini(g, m[1], m[3], note); } catch (e) { errors.push(String((e as Error).message)); }
      if (!out) {
        const a = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
        if (a) try { out = await viaClaude(a, m[1], m[3], note); } catch (e) { errors.push(String((e as Error).message)); }
      }
      if (!out) return json({ error: "המודל לא זמין כרגע. נסי שוב בעוד דקה.", detail: errors }, 502);
      const looks = list(out.c.looks).slice(0, 3);
      if (looks.length !== 3 || !s(out.c.name)) return json({ error: "הקולקציה חזרה חסרה. נסי שוב." }, 502);
      const { data: c, error } = await sb.from("mo_collections").insert({ ...shapeCollection(out.c), note, model: out.model, status: "draft" }).select().single();
      if (error) throw new Error(error.message);
      const { error: le } = await sb.from("mo_looks").insert(looks.map((l: Row, i: number) => ({ ...shapeLook(l, i), collection_id: c.id })));
      if (le) throw new Error(le.message);
      return json({ collection: await full(c.id) });
    }

    if (action === "update_collection") {
      const id = s(b.id); if (!ID.test(id)) return json({ error: "id" }, 400);
      const { error } = await sb.from("mo_collections").update({ ...pick(b.patch, C_FIELDS), updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }
    if (action === "update_look") {
      const id = s(b.id); if (!ID.test(id)) return json({ error: "id" }, 400);
      const { error } = await sb.from("mo_looks").update({ ...pick(b.patch, L_FIELDS), updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }
    if (action === "publish") {
      const id = s(b.id); if (!ID.test(id)) return json({ error: "id" }, 400);
      const status = b.status === "published" ? "published" : "draft";
      const { error } = await sb.from("mo_collections").update({ status, published_at: status === "published" ? new Date().toISOString() : null }).eq("id", id);
      if (error) throw new Error(error.message);
      if (status === "published") await sb.from("mo_versions").insert({ collection_id: id, label: "העלאה למסלול", snapshot: await full(id) });
      return json({ ok: true, status });
    }
    if (action === "delete") {
      const id = s(b.id); if (!ID.test(id)) return json({ error: "id" }, 400);
      const { data: files } = await sb.storage.from(BUCKET).list(`c/${id}`, { limit: 1000 });
      if (files?.length) await sb.storage.from(BUCKET).remove(files.map((f) => `c/${id}/${f.name}`));
      await sb.from("mo_collections").delete().eq("id", id);
      return json({ ok: true });
    }
    if (action === "draft") {
      const id = s(b.look_id); if (!ID.test(id)) return json({ error: "id" }, 400);
      if ((await countSince("mo_media", "created_at", { source: "draft" })) >= 36) return json({ error: "הרבה צילומי טיוטה בשעה האחרונה. נסי שוב בעוד שעה." }, 429);
      const { data: look } = await sb.from("mo_looks").select("*").eq("id", id).single();
      if (!look) return json({ error: "הלוק לא נמצא." }, 404);
      return json({ media: await draftPhoto(look) });
    }
    if (action === "sign") {
      const id = s(b.look_id), ext = s(b.ext).toLowerCase();
      if (!ID.test(id) || !/^(jpg|jpeg|png|webp|mp4|webm|mov)$/.test(ext)) return json({ error: "file" }, 400);
      const { data: look } = await sb.from("mo_looks").select("collection_id,n").eq("id", id).single();
      if (!look) return json({ error: "הלוק לא נמצא." }, 404);
      const path = `c/${look.collection_id}/l${look.n}-${s(b.source).replace(/[^a-z]/g, "") || "x"}-${Date.now()}.${ext}`;
      const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error) throw new Error(error.message);
      return json({ signedUrl: data.signedUrl, path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
    }
    if (action === "add_media") {
      const id = s(b.look_id), kind = s(b.kind), source = s(b.source);
      if (!ID.test(id) || !["image", "video"].includes(kind) || !["mj", "film", "upload"].includes(source)) return json({ error: "media" }, 400);
      const url = s(b.url), path = s(b.path);
      if (!url.includes(`/${BUCKET}/`)) return json({ error: "url" }, 400);
      return json({ media: await addMedia(id, kind, source, url, path) });
    }
    if (action === "set_primary") {
      const id = s(b.media_id); if (!ID.test(id)) return json({ error: "id" }, 400);
      const { data: m } = await sb.from("mo_media").select("*").eq("id", id).single();
      if (!m) return json({ error: "לא נמצא." }, 404);
      await sb.from("mo_media").update({ is_primary: false }).eq("look_id", m.look_id).eq("kind", m.kind);
      await sb.from("mo_media").update({ is_primary: true }).eq("id", id);
      return json({ ok: true });
    }
    if (action === "delete_media") {
      const id = s(b.media_id); if (!ID.test(id)) return json({ error: "id" }, 400);
      const { data: m } = await sb.from("mo_media").select("*").eq("id", id).single();
      if (!m) return json({ ok: true });
      if (m.path) await sb.storage.from(BUCKET).remove([m.path]);
      await sb.from("mo_media").delete().eq("id", id);
      if (m.is_primary) {
        const { data: next } = await sb.from("mo_media").select("id").eq("look_id", m.look_id).eq("kind", m.kind).order("created_at", { ascending: false }).limit(1);
        if (next?.[0]) await sb.from("mo_media").update({ is_primary: true }).eq("id", next[0].id);
      }
      return json({ ok: true });
    }
    if (action === "link") {
      const row = { season: s(b.season), house: s(b.house), city_he: s(b.city_he), city_en: s(b.city_en), idea: s(b.idea), url: s(b.url) };
      if (!row.season || !row.house || !row.idea || !/^https?:\/\//.test(row.url)) return json({ error: "חסרים פרטים בקישור." }, 400);
      const { data, error } = await sb.from("mo_links").insert(row).select().single();
      if (error) throw new Error(error.message);
      return json({ link: data });
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
