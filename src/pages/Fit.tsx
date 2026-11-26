import { useEffect, useMemo, useRef, useState } from 'react';
import { fit, listCollections } from '../lib/api';
import { lead, primary, type Collection, type Look } from '../lib/types';
import { plain } from '../lib/text';
import { listSaved, removeFit, saveFit, type Saved } from '../lib/fitGallery';
import { go } from '../router';

// מדידה: החזון להלביש נשים אמיתיות בבגדי הקולקציה.
// שלושה צעדים על קווי בנייה: הבגד, את, מדידה. התמונה שלה מוקטנת בדפדפן, נשלחת פעם אחת ולא נשמרת.

/** The same instruction mo-fit sends, for the hand bridge. Keep the two in step. */
export function fitPrompt(garment: string, name: string, framing: 'face' | 'body') {
  return [
    'Image 1 is a photograph of a real woman (me). Image 2 is a fashion editorial photograph of one garment from a collection.',
    `Dress the woman from image 1 in exactly the garment worn in image 2${name ? ` (the look "${name}")` : ''}: the same cut, silhouette, fabric, colour, drape, seams and details.`,
    garment ? `Garment notes: ${garment}.` : '',
    'Keep her exactly as she is: her face, identity, expression, skin tone, hair, age and body shape. Do not beautify, slim, smooth or change her proportions. She is a real woman, not a model.',
    framing === 'face'
      ? 'Image 1 shows only her face, so create a natural full-length standing portrait of this same woman, with realistic everyday proportions, wearing the garment.'
      : 'Keep her pose and framing close to image 1, full length where possible, so the whole garment is visible.',
    'Background: plain warm paper-white studio wall, soft daylight from one side, a faint shadow on the floor. Documentary fashion photography, natural colour, 3:4 portrait.',
    'Ignore the background, place and any other person of image 2. No text, no letters, no watermark.',
  ].filter(Boolean).join(' ');
}

type Pick = { c: Collection; l: Look; src: string };
const MAX = 1280;

async function shrink(src: CanvasImageSource & { width: number; height: number }, w: number, h: number, mirror = false): Promise<string> {
  const k = Math.min(1, MAX / Math.max(w, h));
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  const g = cv.getContext('2d')!;
  if (mirror) { g.translate(cv.width, 0); g.scale(-1, 1); }
  g.drawImage(src, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.88);
}
/** The free try-on model works at exactly 768x1024 (3:4). Never cut top or bottom (head, feet):
 *  a wider image loses its sides around the centre, a taller one gets side margins in its own edge colour. */
async function to34(src: string): Promise<string> {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src; await img.decode();
  const W = 768, H = 1024, w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  if (w / h > W / H) { const cw = h * (W / H); g.drawImage(img, (w - cw) / 2, 0, cw, h, 0, 0, W, H); }
  else {
    const dw = (w * H) / h, x = (W - dw) / 2;
    const probe = document.createElement('canvas'); probe.width = 1; probe.height = 8;
    const pg = probe.getContext('2d')!; pg.drawImage(img, 0, 0, Math.max(1, w * 0.04), h, 0, 0, 1, 8);
    const d = pg.getImageData(0, 0, 1, 8).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < 32; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    g.fillStyle = `rgb(${r / 8 | 0},${gg / 8 | 0},${b / 8 | 0})`; g.fillRect(0, 0, W, H);
    g.drawImage(img, x, 0, dw, H);
  }
  return cv.toDataURL('image/jpeg', 0.92);
}
async function fromFile(f: File): Promise<string> {
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  return shrink(bmp as unknown as HTMLCanvasElement, bmp.width, bmp.height);
}

export function Fit({ id, look }: { id?: string; look?: number }) {
  const [cols, setCols] = useState<Collection[]>([]);
  const [pick, setPick] = useState<Pick | null>(null);
  const [photo, setPhoto] = useState('');
  // two ways in (ענת, 26.11.2026): 'scene' keeps the magazine photo whole and puts only her face in it (authentic, sharp);
  // 'dress' puts the garment on her own body photo (IDM-VTON).
  const [mode, setMode] = useState<'scene' | 'dress'>('scene');
  const framing: 'face' | 'body' = mode === 'dress' ? 'body' : 'face';
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState('');
  // gentle refinement of her face only (ענת, 26.11.2026: "מעודנות ומחמיאות, ממש בעדינות"): CodeFormer fidelity on the server
  const [refine, setRefine] = useState<'natural' | 'gentle' | 'soft'>('gentle');
  const [saved, setSaved] = useState<Saved[]>([]);
  useEffect(() => { listSaved().then(setSaved); }, []);
  const remember = async (url: string, m: Saved['mode']) => { const it = await saveFit({ url, mode: m, look: pick ? plain(pick.l.name) : '', collection: pick ? plain(pick.c.name) : '' }); if (it) setSaved((x) => [it, ...x]); };
  const forget = async (id: string) => { await removeFit(id); setSaved((x) => x.filter((i) => i.id !== id)); };
  const [msg, setMsg] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const back = useRef<HTMLInputElement>(null);
  const [bridge, setBridge] = useState(false);
  const [copied, setCopied] = useState('');
  const [stage, setStage] = useState('');
  const [via, setVia] = useState<'' | 'free' | 'swap' | 'server'>('');

  useEffect(() => { listCollections().then(setCols); }, []);
  const looks = useMemo(() => cols.flatMap((c) => c.looks.map((l) => {
    const m = lead(l, 'editorial') ?? primary(l, 'image');
    return m ? { c, l, src: m.url } : null;
  }).filter(Boolean) as Pick[]), [cols]);
  useEffect(() => {
    if (pick || !looks.length) return;
    setPick(looks.find((p) => p.c.id === id && (!look || p.l.n === look)) ?? looks[0]);
  }, [looks, id, look, pick]);
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const choose = (p: Pick) => { setPick(p); setOut(''); go(`#/fit/${p.c.id}/${p.l.n}`); };
  const stopCam = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCam(false); };
  const openCam = async () => {
    setMsg('');
    if (!navigator.mediaDevices?.getUserMedia) { file.current?.click(); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
      setCam(true);
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = stream.current; video.current.play().catch(() => {}); } });
    } catch { setMsg('המצלמה לא נפתחה. אפשר להעלות תמונה במקום.'); }
  };
  const snap = async () => {
    const v = video.current; if (!v?.videoWidth) return;
    setPhoto(await shrink(v as unknown as HTMLCanvasElement, v.videoWidth, v.videoHeight, true));
    setOut(''); stopCam();
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg('צריך קובץ תמונה.'); return; }
    try { setPhoto(await fromFile(f)); setOut(''); setMsg(''); } catch { setMsg('התמונה לא נקראה. נסי קובץ JPG או PNG.'); }
  };
  // mo-fit: 1. free IDM-VTON on Hugging Face (body photo), 2. Gemini, 3. fal. If all fail, the hand bridge.
  const run = async () => {
    if (!pick || !photo) return;
    setBusy(true); setMsg(''); setOut(''); setVia('');
    setStage(mode === 'scene' ? 'הפנים שלך נכנסות לצילום. חצי דקה עד דקה.' : 'מדידה חינמית ב-Hugging Face. חצי דקה עד דקה.');
    try {
      // exact 3:4 inputs for the free model (a failure here only means the server prepares them itself)
      const [photo_34, garment_34] = framing === 'body' ? await Promise.all([to34(photo), to34(pick.src)]).catch(() => ['', '']) : ['', ''];
      const r = await fit({ photo, garment_url: pick.src, garment: plain(pick.l.garment?.text), name: plain(pick.l.name), framing, mode, refine, photo_34, garment_34 });
      setOut(r.url); remember(r.url, mode); setVia(r.via === 'swap' ? 'swap' : r.via === 'free' ? 'free' : 'server');
    } catch (e) { setMsg((e as Error).message); setBridge(true); }
    setBusy(false);
  };

  // the free road when the server has no image credit: the same request, by hand, in Gemini (like the Midjourney bridge)
  const order = pick ? fitPrompt(plain(pick.l.garment?.text), plain(pick.l.name), framing) : '';
  const copy = async () => { try { await navigator.clipboard.writeText(order); setCopied('ההוראה הועתקה'); } catch { setCopied('לא הועתק. אפשר לסמן את ההוראה ולהעתיק.'); } };
  const fetchGarment = async () => {
    if (!pick) return;
    try { const b = await (await fetch(pick.src)).blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `בגד - ${plain(pick.l.name)}.${b.type.includes('png') ? 'png' : 'jpg'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    catch { window.open(pick.src, '_blank', 'noopener'); }
  };
  const onBack = async (f?: File) => { if (!f || !f.type.startsWith('image/')) return; const u = await fromFile(f); setOut(u); setMsg(''); remember(u, 'bridge'); };

  const step = photo ? (out ? 4 : 3) : pick ? 2 : 1;
  return (
    <main className="fit">
      <header className="fit-head">
        <p className="eyebrow">מדידה · החזון</p>
        <h1>להלביש <mark>נשים אמיתיות</mark> בבגדי הקולקציה.</h1>
        <p className="lede">לא דוגמנית ולא גוף מומצא. את, הפנים שלך והגוף שלך, בבגד שבחרת מהמסלול.</p>
      </header>

      <div className="fit-grid">
        <section className="fit-steps" aria-label="שלושה צעדים">
          <div className={`fit-step${step === 1 ? ' now' : ''}`}>
            <span className="num">01</span>
            <h2>הבגד</h2>
            <p className="hint">לוק עם צילום מגזין. הצילום הוא מה שהבגד נלקח ממנו.</p>
            <div className="fit-looks" role="list">
              {looks.map((p) => (
                <button key={p.l.id} role="listitem" className={pick?.l.id === p.l.id ? 'on' : ''} onClick={() => choose(p)} title={`${plain(p.c.name)} · ${plain(p.l.name)}`}>
                  <img src={p.src} alt="" loading="lazy" />
                  <span>{plain(p.l.name)}</span>
                </button>
              ))}
              {!looks.length && <p className="hint">עוד אין לוק עם צילום. מעלים צילום מגזין בסטודיו.</p>}
            </div>
          </div>

          <div className={`fit-step${step === 2 ? ' now' : ''}`}>
            <span className="num">02</span>
            <h2>את</h2>
            <div className="fit-frame" role="group" aria-label="איך למדוד">
              <button className={mode === 'scene' ? 'on' : ''} onClick={() => { setMode('scene'); setOut(''); }}>הפנים שלי בצילום</button>
              <button className={mode === 'dress' ? 'on' : ''} onClick={() => { setMode('dress'); setOut(''); }}>הבגד עליי</button>
            </div>
            <p className="hint">{mode === 'scene' ? 'צילום המגזין נשאר שלם: הבגד, התנוחה והתפאורה. רק הפנים מתחלפות. מספיק צילום פנים ברור, מול המצלמה, באור טוב.' : 'הבגד עובר אל הצילום שלך. עומדת, באור יום, מהמותניים ומעלה או גוף מלא.'}</p>
            <div className="fit-frame fit-refine" role="group" aria-label="עידון הפנים">
              <span className="hint">עידון הפנים</span>
              {([['natural', 'טבעי'], ['gentle', 'עדין'], ['soft', 'רך']] as const).map(([k, t]) => <button key={k} className={refine === k ? 'on' : ''} onClick={() => setRefine(k)}>{t}</button>)}
            </div>
            <div className="fit-src">
              {cam ? <button className="btn" onClick={snap}>צילום</button> : <button className="btn" onClick={openCam}>צילום עכשיו</button>}
              {cam && <button className="link" onClick={stopCam}>סגירת המצלמה</button>}
              <button className="link" onClick={() => file.current?.click()}>העלאת תמונה</button>
              <input ref={file} type="file" accept="image/*" capture="user" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          </div>

          <div className={`fit-step${step === 3 ? ' now' : ''}`}>
            <span className="num">03</span>
            <h2>מדידה</h2>
            <button className="dot big" disabled={!pick || !photo || busy} onClick={run}><i aria-hidden="true" />{busy ? 'מלבישה…' : out ? 'מדידה נוספת' : 'מדידה'}</button>
            <p className="saved" role="status">{msg}</p>
            <p className="fit-note">הצילום שלך נשלח פעם אחת ליצירה, ולא נשמר באפליקציה.</p>
            {via === 'swap' && <p className="fit-note">הפנים הוחלפו בחינם במרחב פתוח ב-Hugging Face (InsightFace, עם שיפור פנים). שאר הצילום לא נגע.</p>}
            {via === 'free' && <p className="fit-note">נמדד בחינם ב-IDM-VTON, מודל פתוח (ECCV 2024) ב-Hugging Face. הוא מדויק בפלג הגוף העליון, ופחות בשמלות ארוכות.</p>}
            {(bridge || (photo && !out)) && pick && (
              <details className="fit-bridge" open={bridge}>
                <summary>הדרך החינמית: מדידה ב-Gemini</summary>
                <ol>
                  <li><button className="link" onClick={fetchGarment}>הורדת צילום הבגד</button></li>
                  <li><button className="link" onClick={copy}>העתקת ההוראה</button> <span className="saved">{copied}</span></li>
                  <li><a className="link" href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">פתיחת Gemini</a>, העלאת הצילום שלך וצילום הבגד, והדבקת ההוראה.</li>
                  <li><button className="link" onClick={() => back.current?.click()}>העלאת התוצאה לבמה</button><input ref={back} type="file" accept="image/*" hidden onChange={(e) => { onBack(e.target.files?.[0]); e.target.value = ''; }} /></li>
                </ol>
                <textarea className="fit-order" readOnly value={order} dir="ltr" aria-label="ההוראה ל-Gemini" onFocus={(e) => e.currentTarget.select()} />
              </details>
            )}
          </div>
        </section>

        <section className="fit-stage" aria-label="המדידה">
          <figure className={`fit-out${busy ? ' busy' : ''}${out && via === 'swap' ? ' wide' : ''}`}>
            {out ? <img src={out} alt={`את בלוק ${pick ? plain(pick.l.name) : ''}`} />
              : cam ? <video ref={video} muted playsInline className="mirror" />
              : photo ? <img src={photo} alt="הצילום שלך" />
              : pick ? <img className="ghost" src={pick.src} alt="" />
              : null}
            {!out && !cam && !photo && <figcaption className="fit-empty">כאן תעמדי בבגד.</figcaption>}
            {busy && <figcaption className="fit-busy">{stage}</figcaption>}
          </figure>
          <div className="fit-pair">
            <figure><span className="num">הבגד</span>{pick && <img src={pick.src} alt={plain(pick.l.name)} />}<figcaption>{pick ? `${plain(pick.c.name)} · ${plain(pick.l.name)}` : ''}</figcaption></figure>
            <figure><span className="num">את</span>{photo ? <img src={photo} alt="הצילום שלך" /> : <i className="fit-blank" />}<figcaption>{photo ? (mode === 'scene' ? 'הפנים' : 'הגוף') : 'עוד אין צילום'}</figcaption></figure>
          </div>
          {out && <a className="btn" href={out} download={`מדידה - ${pick ? plain(pick.l.name) : 'מסלול'}.jpg`} target="_blank" rel="noopener noreferrer">הורדת התמונה</a>}
        </section>
      </div>

      {saved.length > 0 && (
        <section className="fit-saved" aria-label="המדידות שלי">
          <h2>המדידות שלי <span className="num">{saved.length}</span></h2>
          <p className="fit-note">נשמרות רק במכשיר הזה, לא באפליקציה.</p>
          <ul>
            {saved.map((it) => (
              <li key={it.id}>
                <button className="fit-saved-img" onClick={() => { setOut(it.url); setVia(it.mode === 'scene' ? 'swap' : it.mode === 'dress' ? 'free' : 'server'); scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label={`הצגת המדידה: ${it.look}`}><img src={it.url} alt="" loading="lazy" /></button>
                <span>{it.look}</span>
                <button className="fit-x" onClick={() => forget(it.id)} aria-label={`מחיקת המדידה: ${it.look}`} title="מחיקה">×</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
