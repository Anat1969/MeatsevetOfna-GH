// מסלול: רשימת הכתבות כקובץ פתוח (articles.json), חיה מהמאגר.
// כל קולקציה שלכל לוק שלה יש תמונה היא כתבה. מגזין "חוט" (MaAmarim-GH) קורא את הכתובת הזו,
// ולכן קולקציה חדשה מופיעה שם לבד, בלי בנייה ובלי פריסה. קריאה בלבד, בלי סודות.
const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP = "https://meatsevetofna-gh.vercel.app";
const HEAD = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" };

type Media = { kind: string; stage?: string | null; url: string; is_primary: boolean; created_at: string };
type Look = { n: number; name: string; distill: string; haiku: string[]; reading: string; garment: { text?: string }; place_he: string; place_en: string; media: Media[] };
type Row = {
  id: string; created_at: string; published_at?: string | null; status: string; name: string; insight: string; manifesto: string[]; haiku: string[]; reading: string;
  signature: { name?: string; text?: string }; principles: { title: string; text: string }[]; palette: { hex: string; name: string }[];
  set_design: { concept?: string; text?: string; place_he?: string; place_en?: string }; looks: Look[];
};

const bare = (t: string) => (t || "").replace(/[֑-ׇ]/g, "");
const plain = (t: string) => (t || "").replace(/\*\*/g, "");
const two = (n: number) => String(n).padStart(2, "0");
const stageOf = (m: Media) => m.stage ?? (m.kind === "video" ? "film" : "editorial");
const lead = (l: Look, stage: string) => {
  const all = (l.media ?? []).filter((m) => stageOf(m) === stage);
  return all.find((m) => m.is_primary) ?? all.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
};
const photo = (l: Look) => lead(l, "editorial") ?? lead(l, "model") ?? lead(l, "sketch");

function article(c: Row) {
  const looks = [...c.looks].sort((a, b) => a.n - b.n);
  const body: Record<string, unknown>[] = [
    { p: c.manifesto.map(plain).join(" ") },
    { haiku: c.haiku.map(bare) },
    { p: c.reading },
  ];
  for (const l of looks) {
    body.push({ h: `חלופה ${two(l.n)}: ${plain(l.name)}` });
    body.push({ p: l.distill });
    body.push({ haiku: l.haiku.map(bare) });
    body.push({ p: l.reading });
    body.push({ p: `**בד וגזרה:** ${l.garment?.text ?? ""} **מקום:** ${l.place_he} ${l.place_en}` });
  }
  body.push({ h: "מהבד אל הגוף" });
  if (c.signature?.text) body.push({ p: `**${plain(c.signature.name ?? "חתימת העיצוב")}.** ${c.signature.text}` });
  for (const p of c.principles ?? []) body.push({ p: `**${plain(p.title)}.** ${p.text}` });
  if (c.palette?.length) body.push({ p: `**הפלטה:** ${c.palette.map((p) => p.name).join(", ")}. הצבע החמישי הוא הצבע הנסתר.` });
  if (c.set_design?.text) body.push({ p: `**התפאורה: ${plain(c.set_design.concept ?? "")}.** ${c.set_design.text} ${c.set_design.place_he ?? ""} ${c.set_design.place_en ?? ""}`.trim() });
  body.push({ insight: plain(c.insight) });
  return {
    id: c.id, url: `${APP}/#/articles/${c.id}`, zone: "אופנה", kicker: "קולקציה בשלוש חלופות",
    title: plain(c.name), sub: plain(c.insight), image: photo(looks[0])?.url ?? null, credit: "הדמיה",
    images: looks.map((l) => ({ n: l.n, name: plain(l.name), url: photo(l)?.url ?? null })),
    date: c.published_at || c.created_at, body,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: HEAD });
  const r = await fetch(`${URL_}/rest/v1/mo_collections?select=*,looks:mo_looks(*,media:mo_media(*))&order=created_at.asc`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!r.ok) return new Response(JSON.stringify({ error: `מאגר ${r.status}` }), { status: 502, headers: HEAD });
  const rows = ((await r.json()) as Row[]).filter((c) => c.name && c.looks?.length && c.looks.every((l) => photo(l)));
  return new Response(JSON.stringify({
    app: { id: "maslul", name: "מסלול", url: APP, repo: "Anat1969/MeatsevetOfna-GH" },
    articles: rows.map(article),
  }), { headers: HEAD });
});
