/**
 * Turns one still look into a short runway film in the browser: a slow walk-in (push toward the
 * viewer), a light sweep like a passing spot, the hidden-fold colour breathing at the edges, and the
 * no text (the page carries the words). Recorded with MediaRecorder: MP4 where Chrome supports it, else WebM.
 */
export type FilmOpts = { image: string; name: string; haiku: string[]; accent: string; seconds?: number; onProgress?: (p: number) => void };

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function pickMime(): { mime: string; ext: string } {
  const opts = [['video/mp4;codecs=avc1', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm', 'webm']];
  for (const [m, e] of opts) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return { mime: m, ext: e };
  return { mime: '', ext: 'webm' };
}

export function drawFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement, t: number, o: FilmOpts) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = '#0d0c0b'; ctx.fillRect(0, 0, W, H);
  const e = ease(Math.min(1, t / 0.8));
  const scale = 1.0 + 0.16 * e;
  const sway = Math.sin(t * Math.PI * 2) * 6 * (1 - t);
  const s = Math.max(W / img.width, H / img.height) * scale;
  const w = img.width * s, h = img.height * s;
  ctx.globalAlpha = Math.min(1, t * 6);
  ctx.drawImage(img, (W - w) / 2 + sway, (H - h) / 2 - 30 * e, w, h);
  ctx.globalAlpha = 1;
  // passing spotlight
  const sx = W * (-0.3 + 1.6 * t);
  const g = ctx.createLinearGradient(sx - W * 0.25, 0, sx + W * 0.25, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,250,240,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // the hidden fold: accent breathing at the edges
  const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, o.accent + 'aa');
  ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * Math.PI);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  // no text in the film: the page carries the words, so text never sits on text
}

export async function makeFilm(o: FilmOpts): Promise<{ blob: Blob; ext: string }> {
  const img = await loadImg(o.image);
  await document.fonts?.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;
  const { mime, ext } = pickMime();
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  const total = (o.seconds ?? 8) * 1000;
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / total);
      drawFrame(ctx, img, t, o); o.onProgress?.(t);
      if (t < 1) requestAnimationFrame(tick); else resolve();
    };
    tick();
  });
  rec.stop(); await done;
  return { blob: new Blob(chunks, { type: (mime || 'video/webm').split(';')[0] }), ext };
}
