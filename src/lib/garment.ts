// חילוץ הבגד (ענת, 26.11.2026: "הבגד עליי צריך היה לחלץ את הבגד מהדוגמנית... פעולה הפוכה מהפנים, פה אתה מחלץ בגד").
// מודל פילוח בגדים פתוח (SegFormer, Xenova/segformer_b2_clothes, 29 מגה, נטען פעם אחת ונשמר בדפדפן) רץ כאן בדפדפן:
// בלי מכסה, בלי שרת, בלי מפתח. הוא מפריד בגד מפנים, שיער, עור, תיק ורקע. הבגד נגזר ומונח על לבן ב-768 על 1024,
// כמו צילום מוצר, וזה מה שהמדידה מלבישה. נבדק 26.11 על צילום מגזין אמיתי: 4 שניות, החולצה והשמלה זוהו, הפנים והזרוע לא.

/** The labels of the clothes model that are the garment (everything else, skin, face, hair, shoes, bag, background, stays out). */
export const GARMENT = new Set(['Upper-clothes', 'Skirt', 'Pants', 'Dress', 'Belt', 'Scarf']);

type Seg = (src: string) => Promise<{ label: string; mask: { data: ArrayLike<number>; width: number; height: number } }[]>;
let seg: Promise<Seg> | null = null;
// tests put a stand-in model here (no network in the test run); the app never sets it
const model = () => (seg ??= (globalThis as { __moGarmentSeg?: Seg }).__moGarmentSeg ? Promise.resolve((globalThis as { __moGarmentSeg?: Seg }).__moGarmentSeg!) : import('@huggingface/transformers').then(async ({ pipeline, env }) => {
  env.allowLocalModels = false;
  return (await pipeline('image-segmentation', 'Xenova/segformer_b2_clothes', { dtype: 'q8' })) as unknown as Seg;
}).catch((e) => { seg = null; throw e; }));

/** Warm the model while she takes her photo, so the fitting itself does not wait for the download. */
export const warmGarment = () => { model().catch(() => { /* tried; extractGarment says why */ }); };

/** A union mask (1 = garment) at the image's own size, from the model's masks (which may be a different size). */
export function unionMask(parts: { label: string; mask: { data: ArrayLike<number>; width: number; height: number } }[], W: number, H: number): Uint8Array {
  const m = new Uint8Array(W * H);
  for (const p of parts) {
    if (!GARMENT.has(p.label)) continue;
    const { data, width: mw, height: mh } = p.mask;
    for (let y = 0; y < H; y++) {
      const row = Math.floor((y * mh) / H) * mw;
      for (let x = 0; x < W; x++) if (data[row + Math.floor((x * mw) / W)] > 127) m[y * W + x] = 1;
    }
  }
  return m;
}

/** The garment on white, 768x1024, centred with a margin. Throws when no garment is found (under 2% of the photo). */
export async function extractGarment(src: string): Promise<string> {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src; await img.decode();
  // the model works at 512; 1024 on the long side is enough for a clean edge and keeps the phone fast
  const k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * k), H = Math.round(img.naturalHeight * k);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, W, H);
  const parts = await (await model())(cv.toDataURL('image/jpeg', 0.92));
  const m = unionMask(parts, W, H);
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (n < W * H * 0.02) throw new Error('no garment');
  // everything that is not garment turns white, with a one-pixel soft edge so the cut does not look pasted
  const px = g.getImageData(0, 0, W, H), d = px.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (m[i]) {
      const edge = (x > 0 && !m[i - 1]) || (x < W - 1 && !m[i + 1]) || (y > 0 && !m[i - W]) || (y < H - 1 && !m[i + W]);
      if (edge) for (let c = 0; c < 3; c++) d[i * 4 + c] = (d[i * 4 + c] + 255) >> 1;
    } else { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; }
  }
  g.putImageData(px, 0, 0);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const OW = 768, OH = 1024, pad = 40;
  const s = Math.min((OW - 2 * pad) / bw, (OH - 2 * pad) / bh);
  const out = document.createElement('canvas'); out.width = OW; out.height = OH;
  const o = out.getContext('2d')!;
  o.fillStyle = '#fff'; o.fillRect(0, 0, OW, OH);
  o.imageSmoothingQuality = 'high';
  o.drawImage(cv, x0, y0, bw, bh, (OW - bw * s) / 2, (OH - bh * s) / 2, bw * s, bh * s);
  return out.toDataURL('image/jpeg', 0.92);
}
