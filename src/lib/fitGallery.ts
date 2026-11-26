// המדידות שלי (ענת, 26.11.2026: "תשמור את התמונות שנוצרות, ותאפשר ב-X למחוק"):
// נשמרות במכשיר שלה בלבד (IndexedDB), כי בכל תמונה יש את הפנים שלה והדלי של האפליקציה ציבורי.

export type Saved = { id: string; at: number; url: string; look: string; collection: string; mode: 'scene' | 'dress' | 'bridge' };

const DB = 'maslul-fit', STORE = 'fits', MAX = 60;
const open = () => new Promise<IDBDatabase>((ok, no) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
});
const tx = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open();
  return new Promise<T>((ok, no) => { const q = f(db.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
};

/** A hf.space or fal link expires, so the image itself is kept (as a data URI). */
async function keep(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const b = await (await fetch(url)).blob();
  return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(b); });
}

export async function listSaved(): Promise<Saved[]> {
  try { return ((await tx('readonly', (s) => s.getAll())) as Saved[]).sort((a, b) => b.at - a.at); } catch { return []; }
}
export async function saveFit(item: Omit<Saved, 'id' | 'at' | 'url'> & { url: string }): Promise<Saved | null> {
  try {
    const s: Saved = { ...item, url: await keep(item.url), id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() };
    await tx('readwrite', (st) => st.put(s));
    const all = await listSaved();
    for (const old of all.slice(MAX)) await tx('readwrite', (st) => st.delete(old.id));
    return s;
  } catch { return null; }
}
export async function removeFit(id: string) { try { await tx('readwrite', (s) => s.delete(id)); } catch { /* nothing to remove */ } }
