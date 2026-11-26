// mo-fit: מדידה. אישה אמיתית בבגד מהקולקציה.
// נכנסות שתי תמונות: הצילום שלה (פנים או גוף מלא) וצילום המגזין של הלוק. יוצאת תמונה אחת שלה בבגד.
// הצילום שלה לא נשמר בשום מקום: הוא עובר ל-fal כ-data URI פעם אחת, והתוצאה חוזרת כקישור זמני של fal.
// הרשאה: כמו mo-studio. כש-MO_OWNER_KEY מוגדר, צריך את הכותרת x-owner-key. בלעדיו: מגבלה שעתית.

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
  if (!key) return json({ error: "אין מפתח fal בפרויקט." }, 503);

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

  for (const [endpoint, body] of [
    ["https://fal.run/fal-ai/nano-banana-2/edit", { prompt: text, image_urls: [photo, garmentUrl], aspect_ratio: "3:4", num_images: 1, output_format: "jpeg" }],
    ["https://fal.run/fal-ai/nano-banana/edit", { prompt: text, image_urls: [photo, garmentUrl], num_images: 1, output_format: "jpeg" }],
  ] as const) {
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
      if (!r.ok) { console.log("fit", endpoint, r.status, (await r.text()).slice(0, 300)); continue; }
      const url = (await r.json())?.images?.[0]?.url;
      if (url) return json({ url });
    } catch (e) { console.log("fit", endpoint, String(e)); }
  }
  return json({ error: "המדידה לא הצליחה הפעם. אפשר לנסות שוב, או לנסות צילום אחר באור טוב." }, 502);
});
