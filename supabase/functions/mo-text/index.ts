// מסלול: ניקוד מלא לשורות הייקו (Gemini). לא משנה מילים, רק מוסיף ניקוד. ו' וי' של כתיב מלא יכולות להשתנות.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-owner-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const SYSTEM = "את/ה מנקד/ת עברית. מקבלים מערך של שורות. מחזירים את אותו מערך, באותו סדר ובאותן מילים בדיוק, עם ניקוד מלא ומדויק לפי כללי הדקדוק (כולל דגש, שווא וחטפים). לא מוסיפים, לא מוחקים ולא מחליפים מילים.";
function same(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
// compare the words without niqqud and without the vav and yod of full spelling, which niqqud may drop
const strip = (t: string) => t.replace(/[֑-ׇ]/g, "").replace(/[וי]/g, "").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const owner = Deno.env.get("MO_OWNER_KEY")?.trim() ?? "";
  if (owner && !same(req.headers.get("x-owner-key") ?? "", owner)) return json({ error: "צריך את סיסמת העורכת." }, 401);
  let b: { lines?: unknown };
  try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  const lines = (Array.isArray(b.lines) ? b.lines : []).map((x) => String(x ?? "").slice(0, 120)).slice(0, 24);
  if (!lines.length) return json({ lines: [] });
  const user = JSON.stringify(lines);
  let out: string[] | null = null;
  const g = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (g) {
    for (const model of ["gemini-2.5-flash", "gemini-flash-latest"]) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${g}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "STRING" } }, temperature: 0 } }),
          signal: AbortSignal.timeout(40000),
        });
        if (!r.ok) continue;
        const j = await r.json();
        out = JSON.parse(j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "[]");
        if (out?.length === lines.length) break;
      } catch (_) { /* next */ }
    }
  }
  if (!out || out.length !== lines.length) return json({ error: "הניקוד לא זמין כרגע." }, 502);
  // keep the words: a line whose letters changed falls back to the original
  return json({ lines: out.map((v, i) => (strip(v) === strip(lines[i]) ? v : lines[i])) });
});
