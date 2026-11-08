import type { Collection, LinkRow, Media } from './types';
import seed from '../data/seed.json';
import stages from '../data/stages.json';

export const SB_URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
const ANON = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';
const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };
export const SEED_ID = '0f1e2d3c-0000-4000-8000-000000000001';
const SELECT = 'select=*,looks:mo_looks(*,media:mo_media(*))';

type SeedLook = (typeof seed.looks)[number];
export const seedCollection: Collection = {
  id: SEED_ID, created_at: '2026-11-08', updated_at: '2026-11-08', status: 'published',
  name: seed.name, insight: seed.insight, manifesto: seed.manifesto, haiku: seed.haiku, reading: seed.reading,
  signature: seed.signature, principles: seed.principles, palette: seed.palette, set_design: seed.set,
  looks: seed.looks.map((l: SeedLook) => ({
    id: `seed-${l.n}`, collection_id: SEED_ID, n: l.n, name: l.name, distill: l.distill, haiku: l.haiku, reading: l.reading,
    garment: { text: l.garment }, model: l.model, place_he: l.place_he, place_en: l.place_en, light: l.light, camera: l.camera,
    prompt_he: l.prompt_he, prompt_en: l.prompt_en, motion_en: l.motion_en, stage: 'prompt', media: [],
    prompts: (stages as Record<string, Collection['looks'][number]['prompts']>)[String(l.n)],
  })),
};

const norm = (c: Collection): Collection => ({ ...c, looks: [...(c.looks ?? [])].sort((a, b) => a.n - b.n).map((l) => ({ ...l, media: l.media ?? [] })) });

const KEY = 'maslul.ownerKey';
export const ownerKey = {
  get: () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } },
  set: (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } },
};

export async function listCollections(): Promise<Collection[]> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/mo_collections?${SELECT}&order=created_at.desc`, { headers: H });
    if (!r.ok) throw new Error(String(r.status));
    const rows = ((await r.json()) as Collection[]).filter((c) => c.name).map(norm);
    return rows.length ? rows : [seedCollection];
  } catch { return [seedCollection]; }
}
export async function getCollection(id: string): Promise<Collection | null> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/mo_collections?id=eq.${encodeURIComponent(id)}&${SELECT}`, { headers: H });
    if (!r.ok) throw new Error(String(r.status));
    const c = ((await r.json()) as Collection[])[0];
    return c ? norm(c) : id === SEED_ID ? seedCollection : null;
  } catch { return id === SEED_ID ? seedCollection : null; }
}
export async function listLinks(): Promise<LinkRow[]> {
  try { const r = await fetch(`${SB_URL}/rest/v1/mo_links?select=*&order=created_at.desc`, { headers: H }); return r.ok ? await r.json() : []; } catch { return []; }
}

export async function studio<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SB_URL}/functions/v1/mo-studio`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json', 'x-owner-key': ownerKey.get() }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `שגיאה ${r.status}`);
  return j as T;
}

/** Straight to storage through a signed URL, then registered as media of the look. */
export async function uploadMedia(lookId: string, kind: Media['kind'], source: 'mj' | 'film' | 'upload', file: Blob, ext: string, stage: string = 'editorial'): Promise<Media> {
  const s = await studio<{ signedUrl: string; url: string; path: string }>({ action: 'sign', look_id: lookId, ext, source, stage });
  const signed = s.signedUrl.startsWith('http') ? s.signedUrl : `${SB_URL}/storage/v1${s.signedUrl}`;
  const r = await fetch(signed, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, body: file });
  if (!r.ok) throw new Error(`ההעלאה נכשלה (${r.status})`);
  const m = await studio<{ media: Media }>({ action: 'add_media', look_id: lookId, kind, source, url: s.url, path: s.path, stage });
  return m.media;
}

export const fileToDataUrl = (f: Blob) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(f); });
export async function shrink(f: File, max = 1600): Promise<string> {
  const url = await fileToDataUrl(f);
  const img = new Image(); img.src = url; await img.decode();
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.88);
}

/** Move an image between stages and looks, or bring in an image dragged from another site. */
export async function mediaFn<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SB_URL}/functions/v1/mo-media`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json', 'x-owner-key': ownerKey.get() }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `שגיאה ${r.status}`);
  return j as T;
}
export const DRAG_TYPE = 'application/x-maslul-media';
/** The image address inside a drop from another tab (uri-list, or an <img> in dragged html). */
export function droppedUrl(dt: DataTransfer): string {
  const uri = dt.getData('text/uri-list').split('\n').find((x) => x && !x.startsWith('#'));
  const html = dt.getData('text/html');
  const src = html.match(/<img[^>]+src=["']([^"']+)/i)?.[1];
  const u = (src || uri || dt.getData('text/plain') || '').trim();
  return /^https:\/\//.test(u) ? u : '';
}

/** Full niqqud for haiku lines (words unchanged). */
export async function vocalize(lines: string[]): Promise<string[]> {
  const r = await fetch(`${SB_URL}/functions/v1/mo-text`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', 'x-owner-key': ownerKey.get() }, body: JSON.stringify({ lines }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `שגיאה ${r.status}`);
  return j.lines as string[];
}
export const hasNiqqud = (t: string) => /[\u05B0-\u05BC]/.test(t);
/** The look-specific part of a stage prompt, before the stage language: what the image is about. */
export const promptBrief = (he?: string) => (he ? he.split(/\.\s+(?=סקיצת עיצוב|מחקר צורה|צילום אופנה)/)[0].trim() : '');
