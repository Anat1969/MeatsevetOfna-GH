import { useEffect, useMemo, useRef, useState } from 'react';
import { fit, listCollections } from '../lib/api';
import { lead, primary, type Collection, type Look } from '../lib/types';
import { plain } from '../lib/text';
import { adoptKey, assignFits, byName, byWoman, findWomen, listSaved, listWomen, phoneLink, removeFit, removeWoman, saveFit, saveWoman, womanPhoto, type Saved, type Woman } from '../lib/fitGallery';
import { go } from '../router';
import { extractGarment } from '../lib/garment';
import { womanHref } from './Woman';

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

export function Fit({ id, look, w }: { id?: string; look?: number; w?: string }) {
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
  const [linkMsg, setLinkMsg] = useState('');
  useEffect(() => {
    // the phone link carries the gallery key once (#/fit?g=...): kept on this device, then taken out of the address
    const g = location.hash.match(/[?&]g=([A-Za-z0-9_-]{32,80})/);
    if (g) { adoptKey(g[1]); history.replaceState(null, '', location.href.replace(/[?&]g=[A-Za-z0-9_-]+/, '')); }
    listSaved().then(setSaved);
    listWomen().then(setWomen);
  }, []);
  // הנשים שלי: a private folder of women saved by name, searched and put into the frame without uploading again
  const [women, setWomen] = useState<Woman[]>([]);
  const [folder, setFolder] = useState(false);
  const [q, setQ] = useState('');
  const [who, setWho] = useState(''); // the name of the woman in the frame, when she came from (or went into) the folder
  const whoRef = useRef(''); whoRef.current = who;
  const [newName, setNewName] = useState('');
  const [wMsg, setWMsg] = useState('');
  // a woman is a name with one photo or more (ענת, 27.11.2026: "להוסיף שם של אישה ולהעלות תמונות שלה... לבחור אישה ותמונה")
  const people = useMemo(() => {
    const m = new Map<string, Woman[]>();
    for (const w of findWomen(women, '')) m.set(w.name, [...(m.get(w.name) ?? []), w]);
    return [...m].map(([name, photos]) => ({ name, photos: photos.sort((a, b) => a.at - b.at) })).sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }, [women]);
  const shown = useMemo(() => { const hit = new Set(findWomen(women, q).map((w) => w.name)); return people.filter((p) => hit.has(p.name)); }, [people, women, q]);
  const [openW, setOpenW] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState('');
  const addFile = useRef<HTMLInputElement>(null);
  const addTo = useRef('');
  const pickPhotos = (name: string) => { const n = name.replace(/\s+/g, ' ').trim(); if (!n) { setWMsg('קודם שם, ואז התמונות.'); return; } addTo.current = n; addFile.current?.click(); };
  const addPhotos = async (files: FileList | null) => {
    const name = addTo.current; const list = [...(files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!name || !list.length) return;
    let n = 0, local = false;
    for (const [i, f] of list.entries()) {
      setAdding(`מעלה ${i + 1} מתוך ${list.length}…`);
      try { const it = await saveWoman(name, await fromFile(f)); if (it) { n++; local ||= !!it.local; setWomen((x) => [...x, it].sort(byName)); } } catch { /* next */ }
    }
    setAdding(''); setAddName(''); setOpenW(name); setQ('');
    setWMsg(n ? `${n === 1 ? 'נשמרה תמונה אחת' : `נשמרו ${n} תמונות`} של ${name}${local ? ', במכשיר הזה עד שהשרת יענה' : ''}. בוחרים תמונה למסגרת.` : 'התמונות לא נשמרו הפעם.');
  };
  // from her card (#/fit?w=<name>): she is put into the frame once, as if picked from the folder
  const wDone = useRef('');
  useEffect(() => {
    if (!w || wDone.current === w) return;
    const it = women.find((x) => x.name === w);
    if (it) { wDone.current = w; takeWoman(it); }
  }, [w, women]); // eslint-disable-line react-hooks/exhaustive-deps
  const takeWoman = async (w: Woman) => {
    try { setPhoto(await womanPhoto(w)); setWho(w.name); unnamed.current = []; setOut(''); setMsg(''); setWMsg(''); setFolder(false); stopCam(); }
    catch { setWMsg(`הצילום של ${w.name} לא נטען. נסי שוב.`); }
  };
  const keepWoman = async () => {
    const it = await saveWoman(newName, photo);
    if (!it) { setWMsg(newName.trim() ? 'הצילום לא נשמר הפעם.' : 'צריך שם.'); return; }
    setWomen((x) => [...x.filter((w) => w.id !== it.id), it].sort(byName)); setWho(it.name); setNewName('');
    if (unnamed.current.length) { const ids = unnamed.current; unnamed.current = []; assign(ids, it.name); }
    setWMsg(`נשמרה בתיקייה בשם ${it.name}${it.local ? ', במכשיר הזה עד שהשרת יענה' : ''}.`);
  };
  const dropWoman = async (w: Woman) => {
    if (!confirm(`למחוק את התמונה הזו של ${w.name}?`)) return;
    await removeWoman(w.id); setWomen((x) => x.filter((i) => i.id !== w.id));
  };
  const dropPerson = async (name: string) => {
    const all = women.filter((w) => w.name === name);
    if (!confirm(`למחוק את ${name} מהתיקייה, עם ${all.length === 1 ? 'התמונה שלה' : `${all.length} התמונות שלה`}? המדידות שלה נשארות.`)) return;
    for (const w of all) await removeWoman(w.id);
    setWomen((x) => x.filter((i) => i.name !== name)); if (openW === name) setOpenW(null); if (who === name) setWho('');
  };
  const copyPhone = async () => { try { await navigator.clipboard.writeText(phoneLink()); setLinkMsg('הקישור הועתק. פותחים אותו פעם אחת בטלפון.'); } catch { setLinkMsg(phoneLink()); } };
  // every fitting carries the name of the woman in it (ענת, 27.11.2026: "לסדר לפי אותן נשים"); fittings of a photo not yet
  // named wait in `unnamed`, and go under her name the moment she is saved in the folder
  const unnamed = useRef<string[]>([]);
  const remember = async (url: string, m: Saved['mode']) => {
    const it = await saveFit({ url, mode: m, look: pick ? plain(pick.l.name) : '', collection: pick ? plain(pick.c.name) : '', woman: whoRef.current });
    if (it) { setSaved((x) => [it, ...x]); if (!whoRef.current) unnamed.current.push(it.id); }
  };
  const [byW, setByW] = useState<string | null>(null);
  const assign = async (ids: string[], name: string) => {
    setSaved((x) => x.map((i) => (ids.includes(i.id) ? { ...i, woman: name } : i)));
    if (!(await assignFits(ids, name))) setLinkMsg('השיוך לא נשמר בשרת הפעם. נסי שוב.');
  };
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
  // "the garment on me": first the garment comes off the model (the inverse of taking a face), then it goes on her.
  // Extracted in the browser as soon as the look and the mode are chosen, so it is ready (and shown) before she presses.
  const [cut, setCut] = useState<{ src: string; url: string; state: 'busy' | 'ok' | 'fail' } | null>(null);
  const cutFor = useRef('');
  const cutP = useRef<Promise<string> | null>(null);
  useEffect(() => {
    if (mode !== 'dress' || !pick || cutFor.current === pick.src) return;
    const src = pick.src; cutFor.current = src;
    setCut({ src, url: '', state: 'busy' });
    cutP.current = extractGarment(src);
    cutP.current.then((url) => { if (cutFor.current === src) setCut({ src, url, state: 'ok' }); })
      .catch(() => { if (cutFor.current === src) setCut({ src, url: '', state: 'fail' }); });
  }, [mode, pick]);
  const cutReady = mode === 'dress' && cut?.src === pick?.src && cut?.state === 'ok' ? cut.url : '';
  // pressed while the garment is still coming off: wait for it (a failure only means the whole photo goes, as before)
  const garmentCut = async () => (mode === 'dress' && pick && cutFor.current === pick.src && cutP.current ? cutP.current.catch(() => '') : '');

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
    setOut(''); setWho(''); setWMsg(''); unnamed.current = []; stopCam();
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg('צריך קובץ תמונה.'); return; }
    try { setPhoto(await fromFile(f)); setOut(''); setMsg(''); setWho(''); setWMsg(''); unnamed.current = []; } catch { setMsg('התמונה לא נקראה. נסי קובץ JPG או PNG.'); }
  };
  // mo-fit: 1. free IDM-VTON on Hugging Face (body photo), 2. Gemini, 3. fal. If all fail, the hand bridge.
  const run = async () => {
    if (!pick || !photo) return;
    setBusy(true); setMsg(''); setOut(''); setVia('');
    setStage(mode === 'scene' ? 'הפנים שלך נכנסות לצילום. חצי דקה עד דקה.' : 'הבגד שחולץ עובר אל הצילום שלך (Hugging Face, חינמי). חצי דקה עד דקה.');
    try {
      // exact 3:4 inputs for the free model (a failure here only means the server prepares them itself)
      // the garment input is the extracted garment on white when it is ready, otherwise the whole magazine photo as before
      const [photo_34, garment_34] = framing === 'body' ? await Promise.all([to34(photo), garmentCut().then((g) => g || to34(pick.src))]).catch(() => ['', '']) : ['', ''];
      const r = await fit({ photo, garment_url: pick.src, garment: plain(pick.l.garment?.text), name: plain(pick.l.name), framing, mode, refine, photo_34, garment_34 });
      setOut(r.url); remember(r.url, r.via === 'swap' ? 'scene' : mode); setVia(r.via === 'swap' ? 'swap' : r.via === 'free' ? 'free' : 'server'); if (r.note) setMsg(r.note);
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
            <p className="hint">{mode === 'scene' ? 'צילום המגזין נשאר שלם: הבגד, התנוחה והתפאורה. רק הפנים מתחלפות. מספיק צילום פנים ברור, מול המצלמה, באור טוב.' : 'הבגד יורד מהדוגמנית, רק הבגד בלי הפנים, העור והרקע, ועובר אל הצילום שלך. עומדת, באור יום, מהמותניים ומעלה או גוף מלא.'}</p>
            <div className="fit-frame fit-refine" role="group" aria-label="עידון הפנים">
              <span className="hint">עידון הפנים</span>
              {([['natural', 'טבעי'], ['gentle', 'עדין'], ['soft', 'רך']] as const).map(([k, t]) => <button key={k} className={refine === k ? 'on' : ''} onClick={() => setRefine(k)}>{t}</button>)}
            </div>
            <div className="fit-src">
              {cam ? <button className="btn" onClick={snap}>צילום</button> : <button className="btn" onClick={openCam}>צילום עכשיו</button>}
              {cam && <button className="link" onClick={stopCam}>סגירת המצלמה</button>}
              <button className="link" onClick={() => file.current?.click()}>העלאת תמונה</button>
              <input ref={file} type="file" accept="image/*" capture="user" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
              <button className="link" aria-expanded={folder} onClick={() => setFolder((x) => !x)}>{`הנשים שלי · ${people.length}`}</button>
            </div>
            <datalist id="fit-names">{people.map((p) => <option key={p.name} value={p.name} />)}</datalist>
            {folder && (
              <div className="fit-women" role="region" aria-label="הנשים שלי">
                <div className="fit-add">
                  <span className="hint">הוספת אישה</span>
                  <input value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') pickPhotos(addName); }} placeholder="השם שלה" aria-label="שם האישה" maxLength={60} list="fit-names" />
                  <button className="link" disabled={!addName.trim() || !!adding} onClick={() => pickPhotos(addName)}>העלאת תמונות שלה</button>
                  {adding && <span className="saved" role="status">{adding}</span>}
                </div>
                <input ref={addFile} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                {people.length > 0 && <input type="search" className="fit-q" placeholder="חיפוש לפי שם" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש אישה לפי שם" />}
                {people.length === 0 ? <p className="hint">עוד אין נשים בתיקייה. כותבים שם, מעלים תמונה אחת או כמה, ואז בוחרים אישה ותמונה למסגרת.</p>
                  : shown.length === 0 ? <p className="hint">אין אישה בשם הזה.</p>
                  : (
                    <ul className="fit-people">
                      {shown.map((p) => (
                        <li key={p.name} className={openW === p.name ? 'on' : ''}>
                          <button className="fit-woman" aria-expanded={openW === p.name} onClick={() => setOpenW((x) => (x === p.name ? null : p.name))} aria-label={`התמונות של ${p.name}`}><img src={p.photos[0].url} alt="" loading="lazy" /><span>{p.name}</span><small>{p.photos.length === 1 ? 'תמונה אחת' : `${p.photos.length} תמונות`}</small></button>
                          <button className="fit-x" onClick={() => dropPerson(p.name)} aria-label={`מחיקת ${p.name} מהתיקייה`}>×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                {openW && people.some((p) => p.name === openW) && (() => {
                  const p = people.find((x) => x.name === openW)!;
                  return (
                    <div className="fit-photos" role="group" aria-label={`התמונות של ${p.name}`}>
                      <h3>{p.name}: בוחרים תמונה למסגרת <a className="fit-card" href={womanHref(p.name)}>הכרטיס שלה</a></h3>
                      <ul>
                        {p.photos.map((w, i) => (
                          <li key={w.id}>
                            <button className="fit-photo" onClick={() => takeWoman(w)} aria-label={`תמונה ${i + 1} של ${p.name} למסגרת`}><img src={w.url} alt="" loading="lazy" /></button>
                            <button className="fit-x" onClick={() => dropWoman(w)} aria-label={`מחיקת תמונה ${i + 1} של ${p.name}`}>×</button>
                          </li>
                        ))}
                        <li><button className="fit-more" disabled={!!adding} onClick={() => pickPhotos(p.name)}>+ עוד תמונות שלה</button></li>
                      </ul>
                    </div>
                  );
                })()}
                <p className="fit-note">תיקייה פרטית: רק עם המפתח שלך, גם בטלפון דרך הקישור של הגלריה. כדאי לשמור לכל אישה צילום פנים וצילום גוף מלא.</p>
              </div>
            )}
            {photo && !who && !cam && (
              <div className="fit-keep">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') keepWoman(); }} placeholder="השם שלה" aria-label="שם לשמירה בתיקייה" maxLength={60} list="fit-names" />
                <button className="link" disabled={!newName.trim()} onClick={keepWoman}>שמירה בהנשים שלי</button>
              </div>
            )}
            {(who || wMsg) && <p className="saved" role="status">{wMsg || `בתמונה: ${who}`}</p>}
          </div>

          <div className={`fit-step${step === 3 ? ' now' : ''}`}>
            <span className="num">03</span>
            <h2>מדידה</h2>
            <button className="dot big" disabled={!pick || !photo || busy} onClick={run}><i aria-hidden="true" />{busy ? 'מלבישה…' : out ? 'מדידה נוספת' : 'מדידה'}</button>
            <p className="saved" role="status">{msg}</p>
            <p className="fit-note">הצילום נשלח פעם אחת ליצירה, ולא נשמר, אלא אם שמרת אותו בשם בהנשים שלי (תיקייה פרטית).</p>
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
            {mode === 'dress' ? (
              <figure className={`fit-cut${cut?.state === 'busy' ? ' busy' : ''}`}><span className="num">הבגד שחולץ</span>
                {cutReady ? <img src={cutReady} alt={`הבגד של ${pick ? plain(pick.l.name) : ''}, בלי הדוגמנית`} /> : pick && <img className="ghost" src={pick.src} alt="" />}
                <figcaption>{cutReady ? 'רק הבגד, בלי הדוגמנית' : cut?.state === 'busy' ? 'הבגד יורד מהדוגמנית...' : cut?.state === 'fail' ? 'הבגד לא חולץ. המדידה תעבוד מכל הצילום.' : ''}</figcaption></figure>
            ) : <figure><span className="num">הבגד</span>{pick && <img src={pick.src} alt={plain(pick.l.name)} />}<figcaption>{pick ? `${plain(pick.c.name)} · ${plain(pick.l.name)}` : ''}</figcaption></figure>}
            <figure><span className="num">את</span>{photo ? <img src={photo} alt="הצילום שלך" /> : <i className="fit-blank" />}<figcaption>{photo ? (who || (mode === 'scene' ? 'הפנים' : 'הגוף')) : 'עוד אין צילום'}</figcaption></figure>
          </div>
          {out && <a className="btn" href={out} download={`מדידה - ${pick ? plain(pick.l.name) : 'מסלול'}.jpg`} target="_blank" rel="noopener noreferrer">הורדת התמונה</a>}
        </section>
      </div>

      {saved.length > 0 && (
        <section className="fit-saved" aria-label="המדידות שלי">
          <h2>המדידות שלי <span className="num">{saved.length}</span></h2>
          <p className="fit-note">נשמרות בשרת באחסון סגור, ונפתחות רק עם המפתח האישי שלך. {saved.some((x) => x.local) && 'חלק מחכות במכשיר ויעלו בפעם הבאה.'}</p>
          <p className="fit-phone"><button className="link" onClick={copyPhone}>הגלריה בטלפון</button> <span className="saved" role="status">{linkMsg}</span></p>
          {(() => {
            const folderNames = women.map((w) => w.name);
            const groups = byWoman(saved, folderNames);
            const sel = byW !== null && groups.some((g) => g.name === byW) ? byW : null;
            const show = sel === null ? groups : groups.filter((g) => g.name === sel);
            const names = [...new Set([...folderNames, ...saved.map((x) => x.woman ?? '').filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'he'));
            const view = (it: Saved) => { setOut(it.url); setVia(it.mode === 'scene' ? 'swap' : it.mode === 'dress' ? 'free' : 'server'); scrollTo({ top: 0, behavior: 'smooth' }); };
            return (<>
              {groups.length > 1 && (
                <div className="fit-frame fit-by" role="group" aria-label="המדידות לפי אישה">
                  <button className={sel === null ? 'on' : ''} onClick={() => setByW(null)}>{`כולן · ${saved.length}`}</button>
                  {groups.map((g) => <button key={g.name || '-'} className={sel === g.name ? 'on' : ''} onClick={() => setByW(g.name)}>{`${g.name || 'בלי שם'} · ${g.items.length}`}</button>)}
                </div>
              )}
              {show.map((g) => {
                const w = women.find((x) => x.name === g.name);
                return (
                  <div className="fit-group" key={g.name || '-'}>
                    <h3>
                      {w && <img src={w.url} alt="" />}
                      {g.name ? <a className="fit-card" href={womanHref(g.name)}>{g.name}</a> : <span>בלי שם</span>} <span className="num">{g.items.length}</span>
                      {w && <button className="link" onClick={() => { takeWoman(w); scrollTo({ top: 0, behavior: 'smooth' }); }}>להלביש אותה שוב</button>}
                    </h3>
                    {!g.name && names.length > 0 && <p className="fit-note">אפשר לשייך כל מדידה לאישה מהתיקייה, בבחירה מתחת לתמונה.</p>}
                    <ul>
                      {g.items.map((it) => (
                        <li key={it.id}>
                          <button className="fit-saved-img" onClick={() => view(it)} aria-label={`הצגת המדידה: ${it.look}`}><img src={it.url} alt="" loading="lazy" /></button>
                          <span>{it.look}</span>
                          {names.length > 0 && (
                            <select className="fit-who" value={it.woman ?? ''} onChange={(e) => assign([it.id], e.target.value)} aria-label={`של מי המדידה: ${it.look}`}>
                              <option value="">של מי?</option>
                              {names.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          )}
                          <button className="fit-x" onClick={() => forget(it.id)} aria-label={`מחיקת המדידה: ${it.look}`} title="מחיקה">×</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </>);
          })()}
        </section>
      )}
    </main>
  );
}
