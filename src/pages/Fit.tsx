import { useEffect, useMemo, useRef, useState } from 'react';
import { fit, listCollections } from '../lib/api';
import { lead, primary, type Collection, type Look } from '../lib/types';
import { plain } from '../lib/text';
import { go } from '../router';

// מדידה: החזון להלביש נשים אמיתיות בבגדי הקולקציה.
// שלושה צעדים על קווי בנייה: הבגד, את, מדידה. התמונה שלה מוקטנת בדפדפן, נשלחת פעם אחת ולא נשמרת.

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
async function fromFile(f: File): Promise<string> {
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  return shrink(bmp as unknown as HTMLCanvasElement, bmp.width, bmp.height);
}

export function Fit({ id, look }: { id?: string; look?: number }) {
  const [cols, setCols] = useState<Collection[]>([]);
  const [pick, setPick] = useState<Pick | null>(null);
  const [photo, setPhoto] = useState('');
  const [framing, setFraming] = useState<'face' | 'body'>('face');
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState('');
  const [msg, setMsg] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null);

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
  const run = async () => {
    if (!pick || !photo) return;
    setBusy(true); setMsg(''); setOut('');
    try {
      const r = await fit({ photo, garment_url: pick.src, garment: plain(pick.l.garment?.text), name: plain(pick.l.name), framing });
      setOut(r.url);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

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
            <div className="fit-frame" role="group" aria-label="מה בתמונה">
              <button className={framing === 'face' ? 'on' : ''} onClick={() => setFraming('face')}>פנים</button>
              <button className={framing === 'body' ? 'on' : ''} onClick={() => setFraming('body')}>גוף מלא</button>
            </div>
            <p className="hint">{framing === 'face' ? 'מהפנים נבנית דמות מלאה בפרופורציות טבעיות.' : 'צילום מלא, עומדת, באור יום, שומר על המבנה שלך.'}</p>
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
          </div>
        </section>

        <section className="fit-stage" aria-label="המדידה">
          <figure className={`fit-out${busy ? ' busy' : ''}`}>
            {out ? <img src={out} alt={`את בלוק ${pick ? plain(pick.l.name) : ''}`} />
              : cam ? <video ref={video} muted playsInline className="mirror" />
              : photo ? <img src={photo} alt="הצילום שלך" />
              : pick ? <img className="ghost" src={pick.src} alt="" />
              : null}
            {!out && !cam && !photo && <figcaption className="fit-empty">כאן תעמדי בבגד.</figcaption>}
            {busy && <figcaption className="fit-busy">הבד מונח על הגוף. כחצי דקה.</figcaption>}
          </figure>
          <div className="fit-pair">
            <figure><span className="num">הבגד</span>{pick && <img src={pick.src} alt={plain(pick.l.name)} />}<figcaption>{pick ? `${plain(pick.c.name)} · ${plain(pick.l.name)}` : ''}</figcaption></figure>
            <figure><span className="num">את</span>{photo ? <img src={photo} alt="הצילום שלך" /> : <i className="fit-blank" />}<figcaption>{photo ? (framing === 'face' ? 'פנים' : 'גוף מלא') : 'עוד אין צילום'}</figcaption></figure>
          </div>
          {out && <a className="btn" href={out} target="_blank" rel="noopener noreferrer">פתיחה בגודל מלא</a>}
        </section>
      </div>
    </main>
  );
}
