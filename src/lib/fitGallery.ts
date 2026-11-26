// המדידות שלי (ענת, 26.11.2026: "תשמור את התמונות שנוצרות, ותאפשר ב-X למחוק", ואחר כך "גם בשרת, שיהיה גם בטלפון").
// השרת (mo-fits) הוא המקור: טבלה ודלי סגורים, גישה רק עם מפתח גלריה אישי שנוצר כאן ונשמר במכשיר.
// הטלפון מקבל את המפתח בקישור אחד (#/fit?g=...). אם השרת לא עונה, התמונה נשמרת במכשיר (IndexedDB) ועולה בפעם הבאה.
import { SB_URL } from './api';

export type Saved = { id: string; at: number; url: string; look: string; collection: string; mode: 'scene' | 'dress' | 'bridge'; local?: boolean };

const ANON = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';
const KEY = 'maslul.fitKey';
const DB = 'maslul-fit', STORE = 'fits', MAX = 60;

/** The personal gallery key: made once on this device, carried to the phone by a link. */
export function galleryKey(): string {
  try {
    let k = localStorage.getItem(KEY);
    if (!k) { const a = new Uint8Array(24); crypto.getRandomValues(a); k = [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem(KEY, k); }
    return k;
  } catch { return ''; }
}
export function adoptKey(k: string) { if (/^[A-Za-z0-9_-]{32,80}$/.test(k)) try { localStorage.setItem(KEY, k); } catch { /* private mode */ } }
export const phoneLink = () => `${location.origin}${location.pathname}#/fit?g=${galleryKey()}`;

async function server<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SB_URL}/functions/v1/mo-fits`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, key: galleryKey() }), signal: AbortSignal.timeout(60000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `שגיאה ${r.status}`);
  return j as T;
}

const open = () => new Promise<IDBDatabase>((ok, no) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
});
const tx = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open();
  return new Promise<T>((ok, no) => { const q = f(db.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
};
const localAll = async () => { try { return ((await tx('readonly', (s) => s.getAll())) as Saved[]); } catch { return []; } };
const localDel = async (id: string) => { try { await tx('readwrite', (s) => s.delete(id)); } catch { /* gone */ } };

/** A hf.space or fal link expires, so the image itself travels (as a data URI). */
async function keep(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const b = await (await fetch(url)).blob();
  return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(b); });
}
const toServer = async (it: Omit<Saved, 'id' | 'at'>) => (await server<{ item: Saved }>({ action: 'save', image: it.url, look: it.look, collection: it.collection, mode: it.mode })).item;

/** The server list, after the images kept on this device while it was away have gone up. */
export async function listSaved(): Promise<Saved[]> {
  const waiting = await localAll();
  for (const w of waiting) { try { await toServer(w); await localDel(w.id); } catch { break; } }
  try { return (await server<{ items: Saved[] }>({ action: 'list' })).items; }
  catch { return (await localAll()).map((x) => ({ ...x, local: true })).sort((a, b) => b.at - a.at); }
}
export async function saveFit(item: Omit<Saved, 'id' | 'at' | 'url' | 'local'> & { url: string }): Promise<Saved | null> {
  let url: string;
  try { url = await keep(item.url); } catch { return null; }
  try { return await toServer({ ...item, url }); }
  catch {
    try {
      const s: Saved = { ...item, url, id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now(), local: true };
      await tx('readwrite', (st) => st.put(s));
      const all = (await localAll()).sort((a, b) => b.at - a.at);
      for (const old of all.slice(MAX)) await localDel(old.id);
      return s;
    } catch { return null; }
  }
}
export async function removeFit(id: string) {
  if (id.startsWith('l-')) return localDel(id);
  try { await server({ action: 'delete', id }); } catch { /* tried */ }
}
