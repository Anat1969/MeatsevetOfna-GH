// מסלול: גיוון הפרומפטים. לכל שלב (סקיצה, מודל, מגזין) ספרייה של וריאציות בשפת השלב, וצירוף אחר לכל לוק.
// vary: צירוף חדש לכל השלבים של לוקים. reprompt: פרומפט אחר לשלב אחד, ועם rewrite גם זווית חדשה לגוף הפרומפט (Gemini).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-owner-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const NO = "--style raw --no text, words, writing, frame divisions";
const MUST = "Documentary realism, Professional architecture photography";
type Pair = [string, string];
type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const ID = /^[0-9a-f-]{36}$/i;
const STAGES = ["sketch", "model", "editorial"] as const;
type Stage = typeof STAGES[number];

const POOLS: Record<Stage, Record<string, Pair[]>> = {
  sketch: {
    medium: [
      ["charcoal and black ink on off-white paper", "פחם ודיו שחור על נייר בגוון שמנת"],
      ["graphite and a sepia ink wash on cream paper", "עיפרון גרפיט ושטיפת דיו ספיה על נייר שמנת"],
      ["india ink with a dry brush on rough watercolor paper", "דיו הודי במכחול יבש על נייר אקוורל מחוספס"],
      ["conté crayon and a fine liner on grey toned paper", "גיר קונטה וליינר דק על נייר אפור"],
      ["compressed charcoal, an eraser pulling light out of the shadows", "פחם דחוס, ומחק ששולף אור מתוך הצללים"],
    ],
    stroke: [
      ["quick angular gestural strokes", "משיכות מהירות וזוויתיות"],
      ["long confident contour lines with sharp hatching", "קווי מתאר ארוכים ובטוחים עם קווקוו חד"],
      ["loose calligraphic strokes, dense cross-hatching in the shadows", "משיכות קליגרפיות חופשיות, וקווקוו צפוף בצללים"],
      ["broken lines and smudged planes of charcoal", "קווים שבורים ומישורי פחם מרוחים"],
    ],
    structure: [
      ["architectural construction lines and faint grid guides extending beyond the figure", "קווי בנייה אדריכליים וגריד עדין שנמשכים מעבר לדמות"],
      ["a center axis, proportion guides and measured tick marks", "ציר מרכזי, קווי פרופורציה וסימני מידה"],
      ["ghosted alternate silhouettes drawn behind the main figure", "צלליות חלופיות שקופות שמשורטטות מאחורי הדמות"],
      ["a horizon line and a floor plane sketched under the figure", "קו אופק ומישור רצפה משורטטים מתחת לדמות"],
      ["a cut detail and a fabric note drawn in the margin", "פרט גזרה והערת בד משורטטים בשוליים"],
    ],
    pose: [
      ["a faceless elongated figure, front view", "דמות מוארכת בלי פנים, מבט חזיתי"],
      ["a faceless figure mid-stride, three-quarter view", "דמות בלי פנים באמצע צעד, מבט שלושה רבעים"],
      ["a faceless figure from the back, the back construction revealed", "דמות בלי פנים מהגב, מבנה הגב של הבגד גלוי"],
      ["two faceless figures, front and back of the same look side by side", "שתי דמויות בלי פנים, חזית וגב של אותו לוק זו לצד זו"],
    ],
  },
  model: {
    backdrop: [
      ["a seamless white studio sweep", "רקע סטודיו לבן ורציף"],
      ["a pale plaster wall and a polished concrete floor", "קיר טיח בהיר ורצפת בטון מוחלקת"],
      ["a white paper backdrop with one hard shadow", "רקע נייר לבן עם צל חד אחד"],
      ["a bone-white cyclorama fading into soft grey", "ציקלורמה בלבן עצם שנמוגה לאפור רך"],
      ["a white limestone plinth in an empty gallery", "בסיס אבן גיר לבן בגלריה ריקה"],
    ],
    figure: [
      ["the figure as a black silhouette mid-stride", "הדמות כצללית שחורה באמצע צעד"],
      ["the figure turning away, shoulders in silhouette", "הדמות מסתובבת, הכתפיים בצללית"],
      ["the figure still, arms folded into the volume", "הדמות דוממת, הזרועות נבלעות בנפח"],
      ["the figure frozen mid-turn, the fabric still moving", "הדמות קפואה באמצע סיבוב, והבד עוד בתנועה"],
      ["only the lower body and the hem, walking out of frame", "רק פלג הגוף התחתון והשוליים, יוצאים מהפריים"],
    ],
    light: [
      ["a crisp soft shadow", "צל חד ורך"],
      ["a single raking side light", "אור צד יחיד ונמוך"],
      ["a soft skylight from above", "אור עליון רך כמו מצוהר"],
      ["hard noon light and one long shadow", "אור צהריים קשה וצל ארוך אחד"],
    ],
    comp: [
      ["generous negative space", "הרבה חלל ריק"],
      ["off-center, the garment cropped by the frame edge", "קומפוזיציה לא מרכזית, הבגד נחתך בשולי הפריים"],
      ["a low camera, the volume towering", "מצלמה נמוכה, הנפח מתנשא"],
      ["a single strong graphic shape against the white", "צורה גרפית אחת וחזקה מול הלבן"],
    ],
  },
  editorial: {
    light: [
      ["natural light", "אור טבעי"],
      ["golden late-afternoon light", "אור זהוב של אחר הצהריים"],
      ["soft overcast light", "אור מעונן ורך"],
      ["the first light of dawn", "אור ראשון של שחר"],
      ["a blue-hour glow", "זוהר של השעה הכחולה"],
    ],
    lens: [
      ["an 85mm lens, shallow depth of field", "עדשת 85 מ\"מ, עומק שדה רדוד"],
      ["a 50mm lens at eye level", "עדשת 50 מ\"מ בגובה העיניים"],
      ["a 35mm lens, one step back to let the place in", "עדשת 35 מ\"מ, צעד אחורה כדי להכניס את המקום"],
      ["telephoto compression from across the space", "טלפוטו שדוחס את החלל מרחוק"],
    ],
    moment: [
      ["quiet and unhurried", "שקט, בלי למהר"],
      ["mid-stride, decisive", "באמצע צעד, נחושה"],
      ["a pause, the gaze turned away", "רגע של עצירה, המבט מופנה הצידה"],
      ["wind moving through the fabric", "רוח שעוברת בבד"],
      ["a hand resting on the garment's detail", "יד נחה על פרט של הבגד"],
    ],
  },
};

type Pick = Record<string, number>;
function pick(stage: Stage, avoid?: Pick): Pick {
  const out: Pick = {};
  for (const [slot, list] of Object.entries(POOLS[stage])) {
    let i = Math.floor(Math.random() * list.length);
    if (avoid && avoid[slot] === i && list.length > 1) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    out[slot] = i;
  }
  return out;
}
const w = (stage: Stage, v: Pick, slot: string, lang: 0 | 1) => POOLS[stage][slot][v[slot] ?? 0][lang];

function tail(stage: Stage, v: Pick) {
  if (stage === "sketch") return {
    en: `fashion design sketch in ${w(stage, v, "medium", 0)}, ${w(stage, v, "stroke", 0)}, ${w(stage, v, "structure", 0)}, ${w(stage, v, "pose", 0)}, planes instead of details, monochrome, ${MUST}, 1:1 --ar 1:1 ${NO}`,
    he: `סקיצת עיצוב אופנה ב${w(stage, v, "medium", 1)}, ${w(stage, v, "stroke", 1)}, ${w(stage, v, "structure", 1)}, ${w(stage, v, "pose", 1)}, מישורים במקום פרטים, מונוכרום. ${MUST}, 1:1 --ar 1:1 ${NO}`,
  };
  if (stage === "model") return {
    en: `sculptural fashion form study on ${w(stage, v, "backdrop", 0)}, ${w(stage, v, "figure", 0)}, the garment as an architectural volume, ${w(stage, v, "light", 0)}, ${w(stage, v, "comp", 0)}, geometric abstraction, high contrast, ${MUST}, 1:1 --ar 1:1 ${NO}`,
    he: `מחקר צורה פיסולי של הבגד על ${w(stage, v, "backdrop", 1)}, ${w(stage, v, "figure", 1)}, הבגד כנפח אדריכלי, ${w(stage, v, "light", 1)}, ${w(stage, v, "comp", 1)}, הפשטה גאומטרית, ניגודיות גבוהה. ${MUST}, 1:1 --ar 1:1 ${NO}`,
  };
  return {
    en: `editorial fashion photograph, ${w(stage, v, "moment", 0)}, ${w(stage, v, "lens", 0)}, the background softly blurred yet recognizable, the model in the left third, calm negative space on the right for a magazine headline, ${w(stage, v, "light", 0)}, ${MUST}, 16:9 --ar 16:9 ${NO}`,
    he: `צילום אופנה למגזין, ${w(stage, v, "moment", 1)}, ${w(stage, v, "lens", 1)}, הרקע מטושטש ברכות אבל מזוהה, הדוגמנית בשליש השמאלי, חלל שקט מימין לכותרת המגזין, ${w(stage, v, "light", 1)}. ${MUST}, 16:9 --ar 16:9 ${NO}`,
  };
}

// the look-specific part of a stored prompt: stored body, or the text before the stage language
const MARK_EN = [", fashion design sketch in", ", charcoal and black ink fashion design sketch", ", sculptural fashion form study", ", editorial fashion photograph"];
const MARK_HE = [". סקיצת עיצוב אופנה", ". מחקר צורה פיסולי", ". צילום אופנה למגזין"];
function body(p: Row | undefined, lang: "en" | "he") {
  const b = s(p?.[`body_${lang}`]); if (b) return b;
  const t = s(p?.[lang]);
  const marks = lang === "en" ? MARK_EN : MARK_HE;
  const at = Math.min(...marks.map((m) => t.indexOf(m)).filter((i) => i > 0), t.length);
  return t.slice(0, at).replace(/[.,\s]+$/, "");
}
function build(stage: Stage, be: string, bh: string, v: Pick) {
  const t = tail(stage, v);
  return { en: `${be}, ${t.en}`, he: `${bh}. ${t.he}`, body_en: be, body_he: bh, v };
}

async function rewrite(look: Row, stage: Stage, be: string, bh: string): Promise<{ en: string; he: string } | null> {
  const key = Deno.env.get("GEMINI_API_KEY")?.trim(); if (!key) return null;
  const what = { sketch: "the cut and structure only, no colour or material", model: "the garment as a volume: fabric, colour, and the detail revealed in motion", editorial: "the woman wearing the final garment in the real place, with the place name, and the light" }[stage];
  const sys = `You are a fashion designer writing the look-specific part of an image prompt for one illustration stage (${stage}): ${what}.
Keep the garment exactly (cut, fabric, colour, signature detail) and keep the place. Find a fresh angle the current text does not use: a different detail to lead with, a gesture, a moment, a crop. Original, precise, no clichés, modest and dignified.
No style words, no camera parameters, no Midjourney parameters (the app adds them). Up to ${stage === "editorial" ? 50 : 28} words.
Return JSON {"en": "...", "he": "..."}: the same content in English and in natural Hebrew. In Hebrew, a place name is followed by its full English name in brackets.`;
  const user = JSON.stringify({ look: { name: look.name, distill: look.distill, garment: (look.garment as Row)?.text, model: look.model, place_he: look.place_he, place_en: look.place_en, light: look.light }, current_en: be, current_he: bh });
  for (const model of ["gemini-2.5-flash", "gemini-flash-latest"]) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", required: ["en", "he"], properties: { en: { type: "STRING" }, he: { type: "STRING" } } }, temperature: 1.0 } }),
        signal: AbortSignal.timeout(40000),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const o = JSON.parse(j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "{}");
      if (s(o.en) && s(o.he)) return { en: s(o.en).replace(/[.,\s]+$/, ""), he: s(o.he).replace(/[.,\s]+$/, "") };
    } catch (_) { /* next */ }
  }
  return null;
}

function same(a: string, b: string) { if (!a || !b || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const owner = Deno.env.get("MO_OWNER_KEY")?.trim() ?? "";
  if (owner && !same(req.headers.get("x-owner-key") ?? "", owner)) return json({ error: "צריך את סיסמת העורכת." }, 401);
  let b: Row; try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  try {
    if (b.action === "vary") {
      const ids = (Array.isArray(b.look_ids) ? b.look_ids : []).map(String).filter((x) => ID.test(x)).slice(0, 12);
      const { data: looks } = await sb.from("mo_looks").select("id,prompts").in("id", ids);
      const out: Row = {};
      for (const l of looks ?? []) {
        const pr = (l.prompts ?? {}) as Record<string, Row>;
        const next = Object.fromEntries(STAGES.map((st) => [st, build(st, body(pr[st], "en"), body(pr[st], "he"), pick(st, pr[st]?.v as Pick))]));
        await sb.from("mo_looks").update({ prompts: next, prompt_en: next.editorial.en, prompt_he: next.editorial.he }).eq("id", l.id);
        out[l.id] = next;
      }
      return json({ prompts: out });
    }
    if (b.action === "reprompt") {
      const id = s(b.look_id), stage = s(b.stage) as Stage;
      if (!ID.test(id) || !STAGES.includes(stage)) return json({ error: "id" }, 400);
      const { data: l } = await sb.from("mo_looks").select("*").eq("id", id).single();
      if (!l) return json({ error: "הלוק לא נמצא." }, 404);
      const pr = (l.prompts ?? {}) as Record<string, Row>;
      let be = body(pr[stage], "en"), bh = body(pr[stage], "he");
      if (b.rewrite) { const r = await rewrite(l, stage, be, bh); if (r) { be = r.en; bh = r.he; } }
      const next = { ...pr, [stage]: build(stage, be, bh, pick(stage, pr[stage]?.v as Pick)) };
      const patch: Row = { prompts: next };
      if (stage === "editorial") { patch.prompt_en = (next.editorial as Row).en; patch.prompt_he = (next.editorial as Row).he; }
      await sb.from("mo_looks").update(patch).eq("id", id);
      return json({ prompts: next });
    }
    return json({ error: "action" }, 400);
  } catch (e) { return json({ error: String((e as Error).message) }, 500); }
});
