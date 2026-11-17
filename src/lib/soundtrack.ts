import type { Collection } from './types';
import { bare, plain } from './text';
import { mediaFn, SB_URL } from './api';

/** Partitura (MusicPrompt-GH) turns a description into a Suno prompt and keeps the song. */
export const PARTITURA = 'https://musicprompt-gh.vercel.app/';

/** A soundtrack brief written from the collection itself, in the language Partitura reads: feeling, place, motion. */
export function soundtrackBrief(c: Collection): string {
  const looks = c.looks.map((l) => `${l.n}. ${plain(l.name)}: ${plain(l.distill)}`).join(' ');
  const pal = c.palette.map((p) => p.name).join(', ');
  return [
    `פס קול לתצוגת אופנה של הקולקציה "${plain(c.name)}". ${plain(c.insight)}`,
    `התחושה: ${c.haiku.map((h) => bare(h)).join(' / ')}.`,
    c.set_design.concept ? `התפאורה: ${c.set_design.concept}. ${plain(c.set_design.text)}` : '',
    `שלושה לוקים עולים למסלול זה אחרי זה: ${looks}`,
    pal ? `הצבעים: ${pal}.` : '',
    'מוזיקה אינסטרומנטלית לצעידה על מסלול, דופק יציב ועדין, שנפתחת בשקט, נבנית לאט לשיא בלוק האחרון, ונרגעת בסיום. עדינה, אלגנטית, בלי קלישאות.',
  ].filter(Boolean).join(' ');
}

/** The address that opens Partitura with the brief, and the way back to this collection. */
export function partituraLink(c: Collection, brief: string, key: string): string {
  const back = `${location.origin}${location.pathname}#/studio/${c.id}`;
  const q = new URLSearchParams({ brief, title: plain(c.name), ref: c.id, back, key });
  return `${PARTITURA}#/create?${q.toString()}`;
}

/** A one-time key: Partitura may hand the song back to this collection only with it. The server keeps its hash. */
export const handoffKey = () => [...crypto.getRandomValues(new Uint8Array(20))].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Seconds of audio, read from the file itself. */
export function audioDuration(src: Blob | string): Promise<number> {
  return new Promise((ok) => {
    const a = new Audio(); const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const done = (d: number) => { if (typeof src !== 'string') URL.revokeObjectURL(url); ok(Number.isFinite(d) ? d : 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0); a.src = url;
    setTimeout(() => done(0), 8000);
  });
}

/** The show follows the song: opening 15%, three looks 65%, finale 20%. A long song is capped, and fades out at the end. */
export const SHOW_MAX = 90;
export function choreography(duration?: number) {
  if (!duration || duration < 20) return null;
  const T = Math.min(duration, SHOW_MAX);
  const open = T * 0.15, look = (T * 0.65) / 3, fin = T - open - 3 * look;
  return { T, open, look, fin, at: (i: number) => (i <= 0 ? 0 : open + (Math.min(i, 4) - 1) * look) };
}

export const saveSoundtrack = (id: string, patch: Record<string, string | number>) => mediaFn<{ soundtrack: Collection['soundtrack'] }>({ action: 'soundtrack', collection_id: id, patch });

export async function uploadSoundtrack(id: string, file: File) {
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
  const s = await mediaFn<{ signedUrl: string; url: string; path: string }>({ action: 'sign_audio', collection_id: id, ext });
  const signed = s.signedUrl.startsWith('http') ? s.signedUrl : `${SB_URL}/storage/v1${s.signedUrl}`;
  const r = await fetch(signed, { method: 'PUT', headers: { 'Content-Type': file.type || 'audio/mpeg', 'x-upsert': 'true' }, body: file });
  if (!r.ok) throw new Error(`ההעלאה נכשלה (${r.status})`);
  const duration = await audioDuration(file);
  return saveSoundtrack(id, { audio_url: s.url, audio_path: s.path, title: file.name.replace(/\.[^.]+$/, ''), ...(duration ? { duration } : {}) });
}
