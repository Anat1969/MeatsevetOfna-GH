import type { Collection, Content, LinkRow } from './types';
import seed from '../data/seed.json';

export const SB_URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
const ANON = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';
const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };
export const SEED_ID = '0f1e2d3c-0000-4000-8000-000000000001';
export const seedCollection: Collection = { id: SEED_ID, created_at: '2026-11-08', updated_at: '2026-11-08', status: 'published', content: seed as Content };

const KEY = 'maslul.ownerKey';
export const ownerKey = {
  get: () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } },
  set: (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } },
};

export async function listCollections(): Promise<Collection[]> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/mo_collections?select=*&order=created_at.desc`, { headers: H });
    if (!r.ok) throw new Error(String(r.status));
    const rows = (await r.json()) as Collection[];
    return rows.length ? rows : [seedCollection];
  } catch {
    return [seedCollection];
  }
}

export async function getCollection(id: string): Promise<Collection | null> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/mo_collections?id=eq.${encodeURIComponent(id)}&select=*`, { headers: H });
    if (!r.ok) throw new Error(String(r.status));
    return ((await r.json()) as Collection[])[0] ?? (id === SEED_ID ? seedCollection : null);
  } catch {
    return id === SEED_ID ? seedCollection : null;
  }
}

export async function listLinks(): Promise<LinkRow[]> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/mo_links?select=*&order=created_at.desc`, { headers: H });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

export async function studio<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SB_URL}/functions/v1/mo-studio`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', 'x-owner-key': ownerKey.get() },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `שגיאה ${r.status}`);
  return j as T;
}

/** Upload a file or blob for a look slot, straight to storage through a signed URL. */
export async function uploadMedia(id: string, slot: string, file: Blob, ext: string): Promise<string> {
  const s = await studio<{ signedUrl: string; url: string }>({ action: 'sign', id, slot, ext });
  const signed = s.signedUrl.startsWith('http') ? s.signedUrl : `${SB_URL}/storage/v1${s.signedUrl}`;
  const r = await fetch(signed, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file });
  if (!r.ok) throw new Error(`ההעלאה נכשלה (${r.status})`);
  return s.url;
}

export const fileToDataUrl = (f: Blob) => new Promise<string>((res, rej) => {
  const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(f);
});

/** Shrink an input image before sending it to the model. */
export async function shrink(f: File, max = 1600): Promise<string> {
  const url = await fileToDataUrl(f);
  const img = new Image(); img.src = url; await img.decode();
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.88);
}
