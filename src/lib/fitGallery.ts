// המדידות שלי (ענת, 26.11.2026: "תשמור את התמונות שנוצרות, ותאפשר ב-X למחוק", ואחר כך "גם בשרת, שיהיה גם בטלפון").
// השרת (mo-fits) הוא המקור: טבלה ודלי סגורים, גישה רק עם מפתח גלריה אישי שנוצר כאן ונשמר במכשיר.
// הטלפון מקבל את המפתח בקישור אחד (#/fit?g=...). אם השרת לא עונה, התמונה נשמרת במכשיר (IndexedDB) ועולה בפעם הבאה.
import { SB_URL } from './api';

export type Saved = { id: string; at: number; url: string; look: string; collection: string; mode: 'scene' | 'dress' | 'bridge'; woman?: string; local?: boolean };

const ANON = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';
const KEY = 'maslul.fitKey';
const DB = 'maslul-fit', STORE = 'fits', WOMEN = 'women', MAX = 60;

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
  const r = indexedDB.open(DB, 2);
  r.onupgradeneeded = () => { for (const n of [STORE, WOMEN]) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
});
const tx = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>, store = STORE) => {
  const db = await open();
  return new Promise<T>((ok, no) => { const q = f(db.transaction(store, mode).objectStore(store)); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
};
const localAll = async () => { try { return ((await tx('readonly', (s) => s.getAll())) as Saved[]); } catch { return []; } };
const localDel = async (id: string) => { try { await tx('readwrite', (s) => s.delete(id)); } catch { /* gone */ } };

/** A hf.space or fal link expires, so the image itself travels (as a data URI). */
async function keep(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const b = await (await fetch(url)).blob();
  return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(b); });
}
const toServer = async (it: Omit<Saved, 'id' | 'at'>) => (await server<{ item: Saved }>({ action: 'save', image: it.url, look: it.look, collection: it.collection, mode: it.mode, woman: it.woman ?? '' })).item;

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
/** המדידות לפי הנשים שלי: put fittings under a woman's name (or '' for none). Kept on this device when the server is away. */
export async function assignFits(ids: string[], woman: string): Promise<boolean> {
  const w = woman.replace(/\s+/g, ' ').trim().slice(0, 60);
  const local = ids.filter((i) => i.startsWith('l-')), remote = ids.filter((i) => !i.startsWith('l-'));
  for (const id of local) { try { const it = (await tx('readonly', (s) => s.get(id))) as Saved | undefined; if (it) await tx('readwrite', (s) => s.put({ ...it, woman: w })); } catch { /* gone */ } }
  if (!remote.length) return true;
  try { await server({ action: 'assign', ids: remote, woman: w }); return true; } catch { return false; }
}
/** The fittings grouped by woman: the women of the folder first (by name), then names no longer in the folder, then the unnamed. */
export function byWoman(items: Saved[], folder: string[]): { name: string; items: Saved[] }[] {
  const m = new Map<string, Saved[]>();
  for (const it of items) { const k = (it.woman ?? '').trim(); m.set(k, [...(m.get(k) ?? []), it]); }
  const named = [...m.keys()].filter(Boolean).sort((a, b) => (Number(!folder.includes(a)) - Number(!folder.includes(b))) || a.localeCompare(b, 'he'));
  return [...named, ...(m.has('') ? [''] : [])].map((name) => ({ name, items: m.get(name)! }));
}
export async function removeFit(id: string) {
  if (id.startsWith('l-')) return localDel(id);
  try { await server({ action: 'delete', id }); } catch { /* tried */ }
}

// הנשים שלי (ענת, 26.11.2026: "תיקייה עם תמונות של הנשים שלי... שמירה בשם ואז ניתן לחפש את התמונה שלה ולהעלות אותה למסגרת").
// אותו מפתח ואותו דלי פרטי. רק אישה שנשמרה במפורש, בשם. כשהשרת לא עונה היא נשמרת במכשיר ועולה בפעם הבאה.
export type Woman = { id: string; name: string; url: string; at: number; local?: boolean };
const wLocal = async () => { try { return ((await tx('readonly', (s) => s.getAll(), WOMEN)) as Woman[]); } catch { return []; } };
const wDel = async (id: string) => { try { await tx('readwrite', (s) => s.delete(id), WOMEN); } catch { /* gone */ } };
const wServer = async (w: { name: string; url: string }) => (await server<{ item: Woman }>({ action: 'woman_save', name: w.name, image: w.url })).item;
export const byName = (a: Woman, b: Woman) => a.name.localeCompare(b.name, 'he');
/** Search by name: any part of the name, ignoring case and extra spaces. */
export const findWomen = (all: Woman[], q: string) => { const t = q.trim().toLowerCase().replace(/\s+/g, ' '); return t ? all.filter((w) => w.name.toLowerCase().includes(t)) : all; };

export async function listWomen(): Promise<Woman[]> {
  for (const w of await wLocal()) { try { await wServer(w); await wDel(w.id); } catch { break; } }
  try { return (await server<{ items: Woman[] }>({ action: 'women' })).items.sort(byName); }
  catch { return (await wLocal()).map((x) => ({ ...x, local: true })).sort(byName); }
}
export async function saveWoman(name: string, photo: string): Promise<Woman | null> {
  const n = name.replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!n || !photo.startsWith('data:image/')) return null;
  try { return await wServer({ name: n, url: photo }); }
  catch {
    try { const w: Woman = { id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: n, url: photo, at: Date.now(), local: true }; await tx('readwrite', (st) => st.put(w), WOMEN); return w; }
    catch { return null; }
  }
}
export async function removeWoman(id: string) {
  if (id.startsWith('l-')) return wDel(id);
  try { await server({ action: 'woman_delete', id }); } catch { /* tried */ }
}
/** A saved woman's photo back into the frame: as a data URI, like a fresh upload (the signed link expires in an hour). */
export async function womanPhoto(w: Woman): Promise<string> { return keep(w.url); }
