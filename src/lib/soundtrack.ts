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
export function partituraLink(c: Collection, brief: string): string {
  const back = `${location.origin}${location.pathname}#/studio/${c.id}`;
  const q = new URLSearchParams({ brief, title: plain(c.name), ref: c.id, back });
  return `${PARTITURA}#/create?${q.toString()}`;
}

export const saveSoundtrack = (id: string, patch: Record<string, string>) => mediaFn<{ soundtrack: Collection['soundtrack'] }>({ action: 'soundtrack', collection_id: id, patch });

export async function uploadSoundtrack(id: string, file: File) {
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
  const s = await mediaFn<{ signedUrl: string; url: string; path: string }>({ action: 'sign_audio', collection_id: id, ext });
  const signed = s.signedUrl.startsWith('http') ? s.signedUrl : `${SB_URL}/storage/v1${s.signedUrl}`;
  const r = await fetch(signed, { method: 'PUT', headers: { 'Content-Type': file.type || 'audio/mpeg', 'x-upsert': 'true' }, body: file });
  if (!r.ok) throw new Error(`ההעלאה נכשלה (${r.status})`);
  return saveSoundtrack(id, { audio_url: s.url, audio_path: s.path, title: file.name.replace(/\.[^.]+$/, '') });
}
