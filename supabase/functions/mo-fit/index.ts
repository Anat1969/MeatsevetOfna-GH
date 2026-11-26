// mo-fit: מדידה. אישה אמיתית בבגד מהקולקציה.
// נכנסות שתי תמונות: הצילום שלה (פנים או גוף מלא) וצילום המגזין של הלוק. יוצאת תמונה אחת שלה בבגד.
// הצילום שלה לא נשמר בשום מקום: הוא עובר פעם אחת ל-IDM-VTON החינמי (ובגיבוי ל-Gemini ול-fal), והתוצאה חוזרת ישירות לדפדפן.
// הרשאה: כמו mo-studio. כש-MO_OWNER_KEY מוגדר, צריך את הכותרת x-owner-key. בלעדיו: מגבלה שעתית.

import { Client } from "npm:@gradio/client@2.8.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-owner-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const s = (v: unknown) => (typeof v === "string" ? v : "");
const SB_HOST = "https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/";
const HOURLY = 20;
const hits: number[] = [];
const GEMINI_IMAGE = [...new Set([Deno.env.get("GEMINI_IMAGE_MODEL") ?? "gemini-2.5-flash-image", "gemini-3-pro-image-preview", "gemini-2.5-flash-image-preview"])];
function b64(u: Uint8Array) { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }

// Free first: the open IDM-VTON space on Hugging Face (no key, no account). Tested 26.11.2026: an image in 26 s.
// Needs a body photo; strongest on the upper body. A HF_TOKEN secret (free account) raises the GPU quota, optional.
const FREE_SPACE = "yisol/IDM-VTON";
const within = <T>(p: Promise<T>, ms: number, what: string) => Promise.race([p, new Promise<T>((_, no) => setTimeout(() => no(new Error(`${what} timeout`)), ms))]);
async function freeTryOn(photo: Blob, garmentUrl: string, garment: string): Promise<string> {
  const garm = await (await fetch(garmentUrl, { signal: AbortSignal.timeout(20000) })).blob();
  const token = Deno.env.get("HF_TOKEN")?.trim();
  const app = await within(Client.connect(FREE_SPACE, token ? { hf_token: token as `hf_${string}` } : {}), 30000, "connect");
  const r = await within(app.predict("/tryon", [{ background: photo, layers: [], composite: null }, garm, garment.slice(0, 120) || "garment", true, true, 30, Math.floor(Math.random() * 1e6)]), 100000, "tryon");
  const out = ((r as { data: { url?: string }[] }).data ?? [])[0];
  if (!out?.url) throw new Error("tryon empty");
  const img = await fetch(out.url, { signal: AbortSignal.timeout(20000) });
  if (!img.ok) throw new Error(`tryon file ${img.status}`);
  return `data:${img.headers.get("content-type") ?? "image/png"};base64,${b64(new Uint8Array(await img.arrayBuffer()))}`;
}

function same(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
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

function prompt(garment: string, name: string, framing: string) {
  return [
    "Image 1 is a photograph of a real woman. Image 2 is a fashion editorial photograph of one garment from a collection.",
    `Dress the woman from image 1 in exactly the garment worn in image 2${name ? ` (the look "${name}")` : ""}: the same cut, silhouette, fabric, colour, drape, seams and details.`,
    garment ? `Garment notes: ${garment}.` : "",
    "Keep her exactly as she is: her face, identity, expression, skin tone, hair, age and body shape. Do not beautify, slim, smooth or change her proportions. She is a real woman, not a model.",
    framing === "face"
      ? "Image 1 shows only her face, so create a natural full-length standing portrait of this same woman, with realistic everyday proportions, wearing the garment."
      : "Keep her pose and framing close to image 1, full length where possible, so the whole garment is visible.",
    "Background: plain warm paper-white studio wall, soft daylight from one side, a faint shadow on the floor. Documentary fashion photography, natural colour, 3:4 portrait.",
    "Ignore the background, place and any other person of image 2. No text, no letters, no watermark.",
  ].filter(Boolean).join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }

  const owner = Deno.env.get("MO_OWNER_KEY")?.trim() ?? "";
  const locked = !!owner;
  const key = falKey();
  if (s(b.action) === "status") return json({ locked, ok: !locked || same(req.headers.get("x-owner-key") ?? "", owner), ready: !!key });
  if (locked && !same(req.headers.get("x-owner-key") ?? "", owner)) return json({ error: "המדידה פתוחה כרגע רק לעורכת. צריך את סיסמת העורכת." }, 401);
  if (!key && !Deno.env.get("GEMINI_API_KEY")) return json({ error: "אין מפתח ליצירת תמונה בפרויקט." }, 503);

  const now = Date.now();
  while (hits.length && now - hits[0] > 3_600_000) hits.shift();
  if (!locked && hits.length >= HOURLY) return json({ error: "היו הרבה מדידות בשעה האחרונה. נסי שוב בעוד שעה." }, 429);

  const photo = s(b.photo);
  const m = photo.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/s);
  if (!m) return json({ error: "צריך צילום (JPG, PNG או WEBP)." }, 400);
  if (m[2].length > 8_000_000) return json({ error: "הצילום גדול מדי." }, 413);
  const garmentUrl = s(b.garment_url);
  if (!garmentUrl.startsWith(SB_HOST)) return json({ error: "צריך את צילום המגזין של הלוק." }, 400);
  const framing = s(b.framing) === "face" ? "face" : "body";
  const text = prompt(s(b.garment).slice(0, 600), s(b.name).slice(0, 80), framing);
  hits.push(now);

  const why: string[] = [];
  if (framing === "body") {
    try {
      const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
      return json({ url: await freeTryOn(new Blob([bin], { type: `image/${m[1]}` }), garmentUrl, s(b.garment) || s(b.name)), via: "free" });
    } catch (e) { const t = String((e as { message?: string })?.message ?? e); console.log("fit free", t.slice(0, 300)); why.push(/quota|exceeded/i.test(t) ? "free quota" : /timeout/.test(t) ? "free timeout" : "free error"); }
  } else why.push("free needs body");
  // Gemini first (the free key the studio already uses), fal as the second road.
  const g = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (g) {
    try {
      const gr = await fetch(garmentUrl, { signal: AbortSignal.timeout(20000) });
      if (!gr.ok) throw new Error(`garment ${gr.status}`);
      const gType = (gr.headers.get("content-type") ?? "image/jpeg").split(";")[0];
      const gData = b64(new Uint8Array(await gr.arrayBuffer()));
      for (const model of GEMINI_IMAGE) {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${g}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [
              { text: "Image 1:" }, { inline_data: { mime_type: `image/${m[1]}`, data: m[2] } },
              { text: "Image 2:" }, { inline_data: { mime_type: gType, data: gData } },
              { text } ] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "3:4" } },
          }),
          signal: AbortSignal.timeout(110000),
        });
        if (!r.ok) { const t = (await r.text()).slice(0, 300); console.log("fit gemini", model, r.status, t); why.push(`gemini ${model} ${r.status}`); continue; }
        const j = await r.json();
        const part = (j?.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: { data?: string }; inline_data?: { data?: string } }) => p.inlineData?.data || p.inline_data?.data);
        const img = part?.inlineData ?? part?.inline_data;
        if (img?.data) return json({ url: `data:${img.mimeType ?? img.mime_type ?? "image/png"};base64,${img.data}`, via: model });
        console.log("fit gemini empty", model, JSON.stringify(j).slice(0, 300)); why.push(`gemini ${model} empty`);
      }
    } catch (e) { console.log("fit gemini", String(e)); why.push(String(e)); }
  }
  if (key) {
    for (const [endpoint, body] of [
      ["https://fal.run/fal-ai/nano-banana-2/edit", { prompt: text, image_urls: [photo, garmentUrl], aspect_ratio: "3:4", num_images: 1, output_format: "jpeg" }],
      ["https://fal.run/fal-ai/nano-banana/edit", { prompt: text, image_urls: [photo, garmentUrl], num_images: 1, output_format: "jpeg" }],
    ] as const) {
      try {
        const r = await fetch(endpoint, { method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
        if (!r.ok) { const t = (await r.text()).slice(0, 300); console.log("fit", endpoint, r.status, t); why.push(/balance/i.test(t) ? "fal balance" : `fal ${r.status}`); continue; }
        const url = (await r.json())?.images?.[0]?.url;
        if (url) return json({ url, via: "fal" });
      } catch (e) { console.log("fit", endpoint, String(e)); }
    }
  }
  const quota = why.some((w) => / 429/.test(w)), balance = why.includes("fal balance");
  const lead = why.includes("free quota") ? "המכסה החינמית היומית של Hugging Face נגמרה. "
    : why.includes("free timeout") ? "המרחב החינמי ב-Hugging Face עמוס ולא ענה בזמן. אפשר לנסות שוב בעוד דקה. "
    : why.includes("free error") ? "המרחב החינמי ב-Hugging Face לא ענה הפעם. "
    : why.includes("free needs body") ? "המדידה החינמית צריכה צילום של הגוף, לפחות מהמותניים ומעלה. " : "";
  return json({
    error: lead + (quota && balance ? "המדידה לא רצה כרגע: המכסה החינמית של Gemini לתמונות נגמרה, והיתרה ב-fal נגמרה."
      : balance ? "המדידה לא רצה כרגע: היתרה בחשבון fal נגמרה, ו-Gemini לא החזיר תמונה."
      : "המדידה לא הצליחה הפעם. אפשר לנסות שוב, או צילום אחר באור טוב."),
    why,
  }, 502);
});
