// מדידה חינמית: המרחב IDM-VTON ב-Hugging Face (מודל פתוח, כרטיס מסך חינמי, בלי חשבון ובלי מפתח).
// הקריאה יוצאת מהדפדפן של המבקרת, ולכן כל אחת משתמשת במכסה החינמית שלה ולא במכסה משותפת.
// נבדק 26.11.2026: /tryon החזיר תמונה תוך 26 שניות. המודל מלביש בעיקר את פלג הגוף העליון, וצריך צילום של הגוף.

export const FREE_SPACE = 'yisol/IDM-VTON';

const blobOf = async (src: string) => (await fetch(src)).blob();

/** Her photo (data URI) and the look's magazine photo in, her in the garment out (a URL on hf.space). */
export async function freeTryOn(photo: string, garmentUrl: string, garment: string): Promise<string> {
  const { Client } = await import('@gradio/client');
  const [human, garm] = await Promise.all([blobOf(photo), blobOf(garmentUrl)]);
  const app = await Client.connect(FREE_SPACE);
  const r = await app.predict('/tryon', [{ background: human, layers: [], composite: null }, garm, garment.slice(0, 120) || 'garment', true, true, 30, Math.floor(Math.random() * 1e6)]);
  const out = (r.data as { url?: string }[])[0];
  if (!out?.url) throw new Error('המרחב החינמי לא החזיר תמונה.');
  return out.url;
}

/** A Hugging Face error in plain Hebrew. */
export function freeReason(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  if (/quota|exceeded|ZeroGPU/i.test(m)) return 'המכסה החינמית היומית של Hugging Face נגמרה במכשיר הזה.';
  if (/queue|busy|sleep|building|paused/i.test(m)) return 'המרחב החינמי עמוס או מתעורר. אפשר לנסות שוב בעוד דקה.';
  return 'המרחב החינמי לא ענה הפעם.';
}
