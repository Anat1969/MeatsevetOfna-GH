import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plate } from '../components/Plate';
import { SilkLive } from '../components/silk/Silk';
import { makeFilm } from '../components/VideoMaker';
import { DRAG_TYPE, droppedUrl, getCollection, listCollections, mediaFn, ownerKey, promptBrief, shrink, studio, uploadMedia } from '../lib/api';
import type { Collection, Look, Media } from '../lib/types';
import { SHOTS, SOURCE_LABEL, STAGES, accentOf, lead, primary, stageIndex } from '../lib/types';
import type { Shot } from '../lib/types';
import { TARGET, syllables } from '../lib/haiku';
import { Rich, bare, plain } from '../lib/text';
import { go } from '../router';

const MJ = 'https://www.midjourney.com/imagine';
type Flash = (m: string) => void;
const copy = async (t: string, flash: Flash, what: string) => { try { await navigator.clipboard.writeText(t); flash(`${what} הועתק`); } catch { flash('הדפדפן חסם את ההעתקה'); } };

/** Text that edits in place. Saves after a pause. */
function Field({ v, on, multi, cls = '', label, rows }: { v: string; on: (s: string) => void; multi?: boolean; cls?: string; label: string; rows?: number }) {
  const [x, setX] = useState(v); const t = useRef<number>();
  useEffect(() => setX(v), [v]);
  const ch = (s: string) => { setX(s); clearTimeout(t.current); t.current = window.setTimeout(() => on(s), 650); };
  return multi
    ? <textarea aria-label={label} className={`fld ${cls}`} value={x} rows={rows ?? Math.max(2, Math.ceil(x.length / 52))} onChange={(e) => ch(e.target.value)} />
    : <input aria-label={label} className={`fld ${cls}`} value={x} onChange={(e) => ch(e.target.value)} />;
}

function Gate({ onOk }: { onOk: () => void }) {
  const [k, setK] = useState(''); const [show, setShow] = useState(false); const [err, setErr] = useState('');
  return (
    <form className="gate" onSubmit={async (e) => { e.preventDefault(); ownerKey.set(k); const s = await studio<{ ok: boolean }>({ action: 'status' }).catch(() => ({ ok: false })); s.ok ? onOk() : setErr('הסיסמה לא נכונה.'); }}>
      <p className="kicker dark">אטלייה</p>
      <h2>הסטודיו נעול.</h2>
      <p>הכתיבה דורשת את סיסמת העורכת. התצוגה פתוחה לכולם.</p>
      <label className="pw"><input type={show ? 'text' : 'password'} autoComplete="current-password" name="password" value={k} onChange={(e) => setK(e.target.value)} placeholder="סיסמת העורכת" />
        <button type="button" onClick={() => setShow((s) => !s)}>{show ? 'הסתרה' : 'הצגה'}</button></label>
      {err && <p className="err">{err}</p>}
      <button className="dot" type="submit"><i aria-hidden="true" />כניסה לאטלייה</button>
    </form>
  );
}

const THINK = ['קורא את הדימוי', 'מזקק את התובנה', 'בוחר שם ומילים', 'משרטט שלושה לוקים', 'בוחר בדים וצבעים', 'מתכנן את התפאורה', 'כותב פרומפטים לצילום'];

function Intake({ onMade }: { onMade: (c: Collection) => void }) {
  const [img, setImg] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [over, setOver] = useState(false); const [step, setStep] = useState(0);
  const take = async (f?: File | null) => { if (!f || !f.type.startsWith('image/')) return; setErr(''); setImg(await shrink(f)); };
  useEffect(() => { const p = (e: ClipboardEvent) => { const f = [...(e.clipboardData?.files ?? [])][0]; if (f) take(f); }; addEventListener('paste', p); return () => removeEventListener('paste', p); }, []);
  useEffect(() => { if (!busy) return; setStep(0); const t = setInterval(() => setStep((s) => Math.min(THINK.length - 1, s + 1)), 4200); return () => clearInterval(t); }, [busy]);
  const run = async () => {
    setBusy(true); setErr('');
    try {
      const r = await studio<{ collection: Collection }>({ action: 'generate', image: img, note });
      const c = r.collection;
      onMade(c);
    }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <section className={`intake${over ? ' over' : ''}${busy ? ' busy' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
      <div className="in-stage">
        <SilkLive face="#f2f0ec" lining="#141312" seed={3} className="in-silk" />
        {img ? (
          <div className="in-img"><img src={img} alt="דימוי ההשראה" />{busy && <div className="scan" />}</div>
        ) : (
          <label className="in-empty">
            <input type="file" accept="image/*" onChange={(e) => take(e.target.files?.[0])} hidden />
            <b>הניחי כאן את ההשראה</b>
            <span>גרירה, הדבקה (Ctrl+V) או בחירת קובץ</span>
          </label>
        )}
      </div>
      <div className="in-side">
        <p className="kicker dark">קולקציה חדשה</p>
        <h2>מדימוי אחד לשלושה לוקים.</h2>
        <p className="muted">הדימוי נקרא פעם אחת ולא נשמר. השמות, ההייקו והפרשנות לא ירמזו עליו.</p>
        <Field label="כיוון אישי" multi rows={3} v={note} on={setNote} />
        <span className="hint">כיוון אישי, לא חובה: עונה, בד, למי, תחושה.</span>
        {!busy && <button className="dot big" disabled={!img} onClick={run}><i aria-hidden="true" />צור קולקציה</button>}
        {busy && (
          <ol className="think" aria-live="polite">
            {THINK.map((t, j) => <li key={t} className={j < step ? 'done' : j === step ? 'now' : ''}>{t}</li>)}
          </ol>
        )}
        {img && !busy && <button className="btn quiet" onClick={() => setImg('')}>החלפת דימוי</button>}
        {err && <p className="err">{err}</p>}
      </div>
    </section>
  );
}

/** What exists, not what was reached: each stage is full when its image or film is there. */
function Stepper({ l }: { l: Look }) {
  const done = (id: string) => (id === 'ready' ? l.stage === 'ready' : id === 'film' ? !!lead(l, 'film') : !!lead(l, id as Shot));
  const first = STAGES.slice(1).find((s) => !done(s.id))?.id;
  return (
    <ol className="stepper" aria-label="שלבי ההמחשה">
      {STAGES.slice(1).map((s) => <li key={s.id} className={done(s.id) ? 'done' : s.id === first ? 'now' : ''}><i />{s.label}</li>)}
    </ol>
  );
}

/** One haiku line with its syllable count beside it, like a note in the margin of a sketch. */
function HaikuLine({ v, j, on, big }: { v: string; j: number; on: (s: string) => void; big?: boolean }) {
  const c = syllables(v);
  const ok = c.n === TARGET[j];
  return (
    <div className="hk-line">
      <Field label={`שורה ${j + 1} בהייקו`} cls={`hk${big ? ' big' : ''}`} v={bare(v)} on={on} />
      <span className={`syl${ok ? ' ok' : ' off'}`} title={c.exact ? 'ספירה לפי הניקוד. שווא בראש מילה נספר.' : 'בלי ניקוד אפשר רק להעריך'}>{ok ? `${c.n} הברות` : `${c.exact ? '' : 'כ-'}${c.n} הברות, צריך ${TARGET[j]}`}</span>
    </div>
  );
}
export function HaikuEdit({ h, on, big }: { h: string[]; on: (h: string[]) => void; big?: boolean }) {
  return (
    <div className={`haiku-edit${big ? ' big' : ''}`}>
      {[0, 1, 2].map((j) => <HaikuLine key={j} j={j} big={big} v={h[j] ?? ''} on={(v) => { const x = [...h]; x[j] = v; on(x); }} />)}
    </div>
  );
}

type Up = (f: File | undefined, kind: Media['kind'], stage: Shot | 'film') => void;
type Move = (m: Media, toLook: string, stage: Shot) => void;
type Pull = (url: string, stage: Shot) => void;

function ShotCell({ c, l, st, busy, up, draft, choose, drop, flash, canDraft, move, pull }: { c: Collection; l: Look; st: (typeof SHOTS)[number]; busy: string; up: Up; draft: (s: Shot) => void; choose: (m: Media) => void; drop: (m: Media) => void; flash: Flash; canDraft: boolean; move: Move; pull: Pull }) {
  const inp = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drag = (x: Media) => (e: React.DragEvent) => { e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ ...x, look_id: l.id })); e.dataTransfer.setData('text/uri-list', x.url); e.dataTransfer.effectAllowed = 'copyMove'; };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const inner = e.dataTransfer.getData(DRAG_TYPE);
    if (inner) { const x = JSON.parse(inner) as Media; if (x.look_id === l.id && x.stage === st.id) return; move(x, l.id, st.id); return; }
    const files = [...e.dataTransfer.files];
    if (files.length) { for (const f of files) up(f, f.type.startsWith('video') ? 'video' : 'image', f.type.startsWith('video') ? 'film' : st.id); return; }
    const u = droppedUrl(e.dataTransfer);
    if (u) pull(u, st.id); else flash('לא זוהתה תמונה בגרירה.');
  };
  const m = lead(l, st.id);
  const all = l.media.filter((x) => (x.stage ?? (x.kind === 'video' ? 'film' : 'editorial')) === st.id);
  const p = l.prompts?.[st.id];
  return (
    <figure className={`cell cell-${st.id}${m ? ' has' : ''}${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = e.dataTransfer.types.includes(DRAG_TYPE) ? 'move' : 'copy'; setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <figcaption><b>{st.label}</b><span>{st.note}</span></figcaption>
      <button className="cell-media" onClick={() => inp.current?.click()} aria-label={`העלאת ${st.label}`}>
        {m ? <img src={m.url} alt={`${st.label}: ${plain(l.name)}`} draggable onDragStart={drag(m)} title="אפשר לגרור לשלב אחר או ללוק אחר" /> : <span className="cell-empty" aria-hidden="true"><i /><i /><em>{over ? 'כאן' : 'טרם'}</em></span>}
        {over && <span className="cell-drop" aria-hidden="true">שחררי כאן</span>}
      </button>
      <input ref={inp} type="file" accept="image/*" multiple hidden onChange={(e) => { for (const f of [...(e.target.files ?? [])]) up(f, 'image', st.id); e.target.value = ''; }} />
      {all.length > 1 && (
        <div className="cell-tray">{all.map((x) => (
          <span key={x.id} className={x.is_primary ? 'on' : ''}>
            <button onClick={() => choose(x)} title={`${SOURCE_LABEL[x.source]}${x.is_primary ? ' · נבחר' : ''} · גרירה לשלב אחר`}><img src={x.url} alt="" draggable onDragStart={drag(x)} /></button>
            <button className="x" onClick={() => drop(x)} aria-label="מחיקה">×</button>
          </span>
        ))}</div>
      )}
      {p && <p className="cell-brief">{promptBrief(p.he)}</p>}
      <div className="cell-act">
        {p && <button className="link" onClick={() => copy(p.en, flash, `פרומפט ה${st.label}`)} title={p.en}>פרומפט</button>}
        {p && <button className="link" onClick={() => copy(p.he, flash, `פרומפט ה${st.label} בעברית`)} title={p.he}>בעברית</button>}
        <button className="link" onClick={() => inp.current?.click()}>עוד תמונה</button>
        {canDraft && <button className="link" disabled={!!busy} onClick={() => draft(st.id)}>טיוטה</button>}
      </div>
    </figure>
  );
}

function Lane({ c, l, patch, setMedia, flash, canDraft, move }: { c: Collection; l: Look; patch: (p: Partial<Look>) => void; setMedia: (f: (m: Media[]) => Media[]) => void; flash: Flash; canDraft: boolean; move: Move }) {
  const [busy, setBusy] = useState(''); const [pct, setPct] = useState(0); const [open, setOpen] = useState(false);
  const vidIn = useRef<HTMLInputElement>(null);
  const img = primary(l, 'image'), vid = primary(l, 'video');
  const films = l.media.filter((m) => m.kind === 'video').sort((a, b) => b.created_at.localeCompare(a.created_at));
  const work = async (label: string, f: () => Promise<void>) => { setBusy(label); setPct(0); try { await f(); } catch (e) { flash((e as Error).message); } finally { setBusy(''); } };
  const stageOf = (m: Media) => m.stage ?? (m.kind === 'video' ? 'film' : 'editorial');
  const add = (m: Media) => setMedia((all) => [...all.map((x) => (stageOf(x) === stageOf(m) && m.is_primary ? { ...x, is_primary: false } : x)), m]);
  const bump = (st: string) => { if (stageIndex(l.stage) < stageIndex(st as Look['stage'])) patch({ stage: st as Look['stage'] }); };
  const draft = (st: Shot) => work(`מצייר טיוטת ${SHOTS.find((x) => x.id === st)!.label}`, async () => { const r = await studio<{ media: Media }>({ action: 'draft', look_id: l.id, stage: st }); add(r.media); bump(st); flash('הטיוטה מוכנה'); });
  const up: Up = (f, kind, st) => { if (!f) return; work(kind === 'image' ? 'מעלה' : 'מעלה סרטון', async () => {
    const ext = (f.name.split('.').pop() || (kind === 'image' ? 'jpg' : 'mp4')).toLowerCase();
    const m = await uploadMedia(l.id, kind, 'mj', f, ext, st); add(m); bump(kind === 'video' ? 'film' : st); flash('נשמר');
  }); };
  const film = () => img && work('מצלם סרטון מסלול', async () => {
    const { blob, ext } = await makeFilm({ image: img.url, name: plain(l.name), haiku: l.haiku, accent: accentOf(c), onProgress: setPct });
    const m = await uploadMedia(l.id, 'video', 'film', blob, ext, 'film'); add(m); bump('film'); flash('הסרטון נשמר');
  });
  const pull: Pull = (url, st) => work('מביא את התמונה', async () => { const r = await mediaFn<{ media: Media }>({ action: 'import_url', look_id: l.id, stage: st, url }); add(r.media); bump(st); flash('התמונה נוספה'); });
  const choose = (m: Media) => work('', async () => { await studio({ action: 'set_primary', media_id: m.id }); setMedia((all) => all.map((x) => (stageOf(x) === stageOf(m) ? { ...x, is_primary: x.id === m.id } : x))); });
  const drop = (m: Media) => work('', async () => { await studio({ action: 'delete_media', media_id: m.id }); setMedia((all) => all.filter((x) => x.id !== m.id)); });

  const missing = SHOTS.find((s) => !lead(l, s.id));
  const next = missing ? { label: `${missing.label}: העתקת הפרומפט`, run: () => l.prompts?.[missing.id] && copy(l.prompts[missing.id]!.en, flash, `פרומפט ה${missing.label}`) }
    : !vid ? { label: 'סרטון מסלול מהצילום', run: film }
    : l.stage !== 'ready' ? { label: 'אישור למסלול', run: () => patch({ stage: 'ready' }) } : null;

  return (
    <article className={`lane st-${l.stage}`}>
      <header className="lane-side">
        <span className="lane-n">{String(l.n).padStart(2, '0')}</span>
        <Field label="שם הלוק" cls="lane-name" v={l.name} on={(v) => patch({ name: v })} />
        <div className="lane-haiku"><HaikuEdit h={l.haiku} on={(h) => patch({ haiku: h })} big /></div>
        <p className="lane-distill"><Rich t={l.distill} /></p>
        <Stepper l={l} />
        {next && <button className="dot" disabled={!!busy} onClick={next.run}><i aria-hidden="true" />{next.label}</button>}
        {l.stage === 'ready' && <p className="ready">מוכן למסלול.</p>}
        {busy && <p className="busy-line">{busy}{pct > 0 && <i style={{ width: `${pct * 100}%` }} />}</p>}
      </header>
      <div className="cells">
        {SHOTS.map((st) => <ShotCell key={st.id} c={c} l={l} st={st} busy={busy} up={up} draft={draft} choose={choose} drop={drop} flash={flash} canDraft={canDraft} move={move} pull={pull} />)}
        <figure className={`cell cell-film${vid ? ' has' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); for (const f of [...e.dataTransfer.files]) if (f.type.startsWith('video')) up(f, 'video', 'film'); }}>
          <figcaption><b>סרטונים</b><span>מהצילום, או העלאה של כמה</span></figcaption>
          <div className="cell-media">{vid ? <video src={vid.url} poster={img?.url} muted loop autoPlay playsInline controls /> : <span className="cell-empty" aria-hidden="true"><i /><i /><em>טרם</em></span>}</div>
          {films.length > 1 && (
            <div className="cell-tray">{films.map((x) => (
              <span key={x.id} className={x.is_primary ? 'on' : ''}>
                <button onClick={() => choose(x)} title={`${SOURCE_LABEL[x.source]}${x.is_primary ? ' · מוצג במסלול' : ' · להציג במסלול'}`}><video src={x.url} muted preload="metadata" /></button>
                <button className="x" onClick={() => drop(x)} aria-label="מחיקה">×</button>
              </span>
            ))}</div>
          )}
          <div className="cell-act">
            <button className="link" disabled={!img || !!busy} onClick={film}>יצירה</button>
            <button className="link" onClick={() => copy(l.motion_en, flash, 'הוראת התנועה')}>תנועה</button>
            <button className="link" onClick={() => vidIn.current?.click()}>העלאה</button>
            {vid && <a className="link" href={vid.url} download>הורדה</a>}
          </div>
          <input ref={vidIn} type="file" accept="video/*" multiple hidden onChange={(e) => { for (const f of [...(e.target.files ?? [])]) up(f, 'video', 'film'); e.target.value = ''; }} />
        </figure>
      </div>
      <button className="more" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? 'סגירת הטקסטים' : 'הטקסטים של הלוק'}</button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="lane-text" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div><label>זיקוק</label><Field label="זיקוק" multi v={l.distill} on={(v) => patch({ distill: v })} />
              <label>פרשנות</label><Field label="פרשנות" multi v={l.reading} on={(v) => patch({ reading: v })} /></div>
            <div><label>בד וגזרה</label><Field label="בד וגזרה" multi v={l.garment.text ?? ''} on={(v) => patch({ garment: { ...l.garment, text: v } })} />
              <a className="link" href={MJ} target="_blank" rel="noreferrer">פתיחת מידג'רני</a></div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function Editor({ c, apply, onDelete, canDraft }: { c: Collection; apply: (f: (c: Collection) => Collection) => void; onDelete: () => void; canDraft: boolean }) {
  const [msg, setMsg] = useState(''); const [tab, setTab] = useState<'prod' | 'text'>('prod');
  const flash = useCallback((m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 2600); }, []);
  const save = async (p: () => Promise<unknown>) => { setMsg('שומר'); try { await p(); setMsg('נשמר'); } catch (e) { setMsg((e as Error).message); } };
  const patchC = (p: Partial<Collection>) => { apply((x) => ({ ...x, ...p })); save(() => studio({ action: 'update_collection', id: c.id, patch: p })); };
  const patchL = (l: Look) => (p: Partial<Look>) => { apply((k) => ({ ...k, looks: k.looks.map((x) => (x.id === l.id ? { ...x, ...p } : x)) })); save(() => studio({ action: 'update_look', id: l.id, patch: p })); };
  const setMedia = (l: Look) => (f: (m: Media[]) => Media[]) => apply((k) => ({ ...k, looks: k.looks.map((x) => (x.id === l.id ? { ...x, media: f(x.media) } : x)) }));
  const stageOfM = (m: Media) => m.stage ?? (m.kind === 'video' ? 'film' : 'editorial');
  const move: Move = (m, toLook, stage) => {
    const from = { look: m.look_id, stage: stageOfM(m) };
    const order = ['prompt', 'sketch', 'model', 'editorial', 'film', 'ready'];
    apply((k) => ({ ...k, looks: k.looks.map((x) => {
      let media = x.media;
      if (x.id === from.look) {
        media = media.filter((y) => y.id !== m.id);
        if (m.is_primary) { const next = media.filter((y) => stageOfM(y) === from.stage).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]; if (next) media = media.map((y) => (y.id === next.id ? { ...y, is_primary: true } : y)); }
      }
      if (x.id === toLook) {
        media = [...media.map((y) => (stageOfM(y) === stage ? { ...y, is_primary: false } : y)), { ...m, look_id: toLook, stage, is_primary: true }];
        return { ...x, media, stage: order.indexOf(x.stage) < order.indexOf(stage) ? stage : x.stage };
      }
      return { ...x, media };
    }) }));
    save(() => mediaFn({ action: 'move', media_id: m.id, look_id: toLook, stage }));
  };
  const ready = c.looks.filter((l) => l.stage === 'ready').length;
  const shot = c.looks.filter((l) => lead(l, 'editorial')).length;
  const publish = () => { const s = c.status === 'published' ? 'draft' : 'published'; apply((x) => ({ ...x, status: s })); save(() => studio({ action: 'publish', id: c.id, status: s })); };

  return (
    <section className="editor" style={{ ['--accent' as string]: accentOf(c) }}>
      <header className="spread">
        <div className="spread-main">
          <p className="kicker dark">{c.status === 'published' ? 'במסלול' : 'באטלייה'} · {shot}/3 במגזין · {ready}/3 מוכנים</p>
          <Field label="שם הקולקציה" cls="title" v={plain(c.name)} on={(v) => patchC({ name: v })} />
          <p className="spread-ins"><Rich t={c.insight} /></p>
        </div>
        <div className="spread-haiku">{c.haiku.map((h) => <span key={h}>{bare(h)}</span>)}</div>
        <div className="spread-pal">
          {c.palette.map((p, j) => (
            <label key={j} style={{ background: p.hex }} title="שינוי הצבע">
              <input type="color" value={p.hex} onChange={(e) => patchC({ palette: c.palette.map((x, q) => (q === j ? { ...x, hex: e.target.value } : x)) })} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
        <div className="spread-act">
          <span className="saved" role="status">{msg}</span>
          <a className="btn" href={`#/show/${c.id}`}>צפייה בתצוגה</a>
          <button className="dot" onClick={publish}><i aria-hidden="true" />{c.status === 'published' ? 'החזרה לאטלייה' : 'העלאה למסלול'}</button>
          <button className="btn quiet danger" onClick={async () => { if (confirm(`למחוק את "${plain(c.name)}" עם כל הצילומים והסרטונים?`)) { await studio({ action: 'delete', id: c.id }).catch((e) => flash(e.message)); onDelete(); } }}>מחיקה</button>
        </div>
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'prod'} className={tab === 'prod' ? 'on' : ''} onClick={() => setTab('prod')}>קו הייצור</button>
        <button role="tab" aria-selected={tab === 'text'} className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>הקולקציה במילים</button>
      </div>

      {tab === 'prod' ? (
        <div className="lanes">{c.looks.map((l) => <Lane key={l.id} c={c} l={l} patch={patchL(l)} setMedia={setMedia(l)} flash={flash} canDraft={canDraft} move={move} />)}</div>
      ) : (
        <div className="words">
          <div>
            <label>שורת תובנה</label><Field label="שורת תובנה" v={c.insight} on={(v) => patchC({ insight: v })} />
            <span className="hint">מילה בין ** ** מקבלת מרקר.</span>
            <label>הייקו הקולקציה</label>
            <HaikuEdit big h={c.haiku} on={(h) => patchC({ haiku: h })} />
            <label>פרשנות</label><Field label="פרשנות" multi v={c.reading} on={(v) => patchC({ reading: v })} />
            <label>מניפסט</label>
            {c.manifesto.map((m, j) => <Field key={j} label={`שורה ${j + 1}`} v={m} on={(v) => patchC({ manifesto: c.manifesto.map((x, q) => (q === j ? v : x)) })} />)}
          </div>
          <div>
            <label>חתימת העיצוב</label>
            <h3>{c.signature.name}</h3><p><Rich t={c.signature.text} /></p>
            <label>עקרונות</label>
            <ol className="principles">{c.principles.map((p) => <li key={p.title}><b>{p.title}</b> <Rich t={p.text} /></li>)}</ol>
            <label>תפאורה</label>
            <h3>{c.set_design.concept}</h3><p><Rich t={c.set_design.text} /></p>
            <p className="muted">{c.set_design.place_he} <span className="en">{c.set_design.place_en}</span></p>
          </div>
        </div>
      )}
    </section>
  );
}

export function Studio({ id }: { id?: string }) {
  const [list, setList] = useState<Collection[]>([]);
  const [cur, setCur] = useState<Collection | null>(null);
  const [st, setSt] = useState<{ locked: boolean; drafts: boolean } | null>(null);
  useEffect(() => {
    listCollections().then(setList);
    studio<{ locked: boolean; ok: boolean; drafts: boolean }>({ action: 'status' }).then((s) => setSt({ locked: s.locked && !s.ok, drafts: s.drafts })).catch(() => setSt({ locked: false, drafts: false }));
  }, []);
  useEffect(() => { if (id) getCollection(id).then(setCur); else setCur(null); }, [id]);
  if (st?.locked) return <main className="studio"><Gate onOk={() => setSt({ ...st, locked: false })} /></main>;
  const update = (f: (c: Collection) => Collection) => setCur((prev) => { if (!prev) return prev; const n = f(prev); setList((l) => l.map((x) => (x.id === n.id ? n : x))); return n; });
  return (
    <main className="studio">
      <aside className="rack" aria-label="המתלה">
        <a className={`rack-new${!id ? ' on' : ''}`} href="#/studio">קולקציה חדשה</a>
        <p className="kicker dark">על המתלה</p>
        {list.map((c) => (
          <a key={c.id} href={`#/studio/${c.id}`} className={c.id === id ? 'on' : ''} style={{ ['--accent' as string]: accentOf(c) }}>
            <span className="rack-looks">{c.looks.map((l) => <Plate key={l.id} c={c} l={l} video={false} />)}</span>
            <b>{plain(c.name)}</b>
            <span className="rack-dots">{c.looks.map((l) => <i key={l.id} className={`st-${l.stage}`} title={`לוק ${l.n}: ${STAGES[stageIndex(l.stage)].label}`} />)}<small>{c.status === 'published' ? 'במסלול' : 'באטלייה'}</small></span>
          </a>
        ))}
      </aside>
      {cur ? <Editor key={cur.id} c={cur} apply={update} canDraft={!!st?.drafts} onDelete={() => { setList((l) => l.filter((x) => x.id !== cur.id)); go('#/studio'); }} />
        : <Intake onMade={(c) => { setList((l) => [c, ...l]); go(`#/studio/${c.id}`); }} />}
    </main>
  );
}
