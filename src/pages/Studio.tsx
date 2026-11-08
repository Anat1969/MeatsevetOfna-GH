import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plate } from '../components/Plate';
import { SilkLive } from '../components/silk/Silk';
import { makeFilm } from '../components/VideoMaker';
import { getCollection, listCollections, ownerKey, shrink, studio, uploadMedia } from '../lib/api';
import type { Collection, Look, Media } from '../lib/types';
import { SOURCE_LABEL, STAGES, accentOf, primary, stageIndex } from '../lib/types';
import { Rich, plain } from '../lib/text';
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
      <button className="btn dark" type="submit">כניסה לאטלייה</button>
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
    try { const r = await studio<{ collection: Collection }>({ action: 'generate', image: img, note }); onMade(r.collection); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <section className={`intake${over ? ' over' : ''}${busy ? ' busy' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
      <div className="in-stage">
        <SilkLive face="#efe7da" lining="#5E1F24" seed={3} className="in-silk" />
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
        {!busy && <button className="btn dark big" disabled={!img} onClick={run}>צור קולקציה</button>}
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

function Stepper({ l }: { l: Look }) {
  const at = stageIndex(l.stage);
  return (
    <ol className="stepper" aria-label="שלב הייצור">
      {STAGES.map((s, j) => <li key={s.id} className={j < at ? 'done' : j === at ? 'now' : ''}><i />{s.label}</li>)}
    </ol>
  );
}

function Lane({ c, l, patch, setMedia, flash, canDraft }: { c: Collection; l: Look; patch: (p: Partial<Look>) => void; setMedia: (f: (m: Media[]) => Media[]) => void; flash: Flash; canDraft: boolean }) {
  const [busy, setBusy] = useState(''); const [pct, setPct] = useState(0); const [open, setOpen] = useState(false);
  const imgIn = useRef<HTMLInputElement>(null); const vidIn = useRef<HTMLInputElement>(null);
  const img = primary(l, 'image'), vid = primary(l, 'video');
  const work = async (label: string, f: () => Promise<void>) => { setBusy(label); setPct(0); try { await f(); } catch (e) { flash((e as Error).message); } finally { setBusy(''); } };
  const lead = (m: Media) => setMedia((all) => [...all.map((x) => (x.kind === m.kind && m.is_primary ? { ...x, is_primary: false } : x)), m]);
  const draft = () => work('מצלם טיוטה, כחצי דקה', async () => { const r = await studio<{ media: Media }>({ action: 'draft', look_id: l.id }); lead(r.media); if (l.stage === 'prompt') patch({ stage: 'shot' }); flash('צילום הטיוטה מוכן'); });
  const up = (f: File | undefined, kind: Media['kind']) => f && work(kind === 'image' ? 'מעלה צילום' : 'מעלה סרטון', async () => {
    const ext = (f.name.split('.').pop() || (kind === 'image' ? 'jpg' : 'mp4')).toLowerCase();
    const m = await uploadMedia(l.id, kind, 'mj', f, ext); lead(m);
    patch({ stage: kind === 'video' ? 'film' : l.stage === 'prompt' ? 'shot' : l.stage }); flash('נשמר');
  });
  const film = () => img && work('מצלם סרטון מסלול', async () => {
    const { blob, ext } = await makeFilm({ image: img.url, name: plain(l.name), haiku: l.haiku, accent: accentOf(c), onProgress: setPct });
    const m = await uploadMedia(l.id, 'video', 'film', blob, ext); lead(m);
    if (stageIndex(l.stage) < 2) patch({ stage: 'film' }); flash('הסרטון נשמר');
  });
  const choose = (m: Media) => work('', async () => { await studio({ action: 'set_primary', media_id: m.id }); setMedia((all) => all.map((x) => (x.kind === m.kind ? { ...x, is_primary: x.id === m.id } : x))); });
  const drop = (m: Media) => work('', async () => { await studio({ action: 'delete_media', media_id: m.id }); setMedia((all) => all.filter((x) => x.id !== m.id)); });

  // the one next action, by stage
  const next = !img
    ? (canDraft ? { label: 'צילום טיוטה', run: draft } : { label: 'העלאת צילום', run: () => imgIn.current?.click() })
    : !vid ? { label: 'סרטון מסלול מהצילום', run: film }
    : l.stage !== 'ready' ? { label: 'אישור למסלול', run: () => patch({ stage: 'ready' }) }
    : null;

  return (
    <article className={`lane st-${l.stage}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) up(f, f.type.startsWith('video') ? 'video' : 'image'); }}>
      <header className="lane-head">
        <span className="lane-n">{String(l.n).padStart(2, '0')}</span>
        <Field label="שם הלוק" cls="lane-name" v={l.name} on={(v) => patch({ name: v })} />
      </header>
      <div className="lane-media">
        <Plate c={c} l={l} />
        {busy && <div className="busy"><span>{busy}</span>{pct > 0 && <i style={{ width: `${pct * 100}%` }} />}</div>}
      </div>
      <Stepper l={l} />
      {next && <button className="btn dark wide" disabled={!!busy} onClick={next.run}>{next.label}</button>}
      {l.stage === 'ready' && <p className="ready">מוכן למסלול.</p>}

      {l.media.length > 0 && (
        <div className="tray" aria-label="צילומים וסרטונים">
          {[...l.media].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((m) => (
            <figure key={m.id} className={m.is_primary ? 'on' : ''}>
              <button className="tray-pick" onClick={() => choose(m)} title={m.is_primary ? 'ראשי' : 'בחירה כראשי'}>
                {m.kind === 'video' ? <video src={m.url} muted playsInline preload="metadata" /> : <img src={m.url} alt="" loading="lazy" />}
              </button>
              <figcaption>{SOURCE_LABEL[m.source]}{m.is_primary ? ' · ראשי' : ''}</figcaption>
              <button className="tray-x" onClick={() => drop(m)} aria-label="מחיקה">×</button>
            </figure>
          ))}
        </div>
      )}

      <div className="bridge">
        <span className="kicker dark">גשר למידג'רני</span>
        <div className="row">
          <button className="btn sm" onClick={() => copy(l.prompt_en, flash, 'הפרומפט באנגלית')}>פרומפט באנגלית</button>
          <button className="btn sm" onClick={() => copy(l.prompt_he, flash, 'הפרומפט בעברית')}>בעברית</button>
          <a className="btn sm" href={MJ} target="_blank" rel="noreferrer">פתיחת מידג'רני</a>
        </div>
        <div className="row">
          <button className="btn sm" onClick={() => imgIn.current?.click()}>העלאת צילום</button>
          <button className="btn sm" onClick={() => copy(l.motion_en, flash, 'הוראת התנועה')}>הוראת תנועה</button>
          <button className="btn sm" onClick={() => vidIn.current?.click()}>העלאת סרטון</button>
          {img && canDraft && <button className="btn sm" onClick={draft} disabled={!!busy}>עוד טיוטה</button>}
          {img && vid && <button className="btn sm" onClick={film} disabled={!!busy}>סרטון חדש</button>}
        </div>
        <input ref={imgIn} type="file" accept="image/*" hidden onChange={(e) => up(e.target.files?.[0], 'image')} />
        <input ref={vidIn} type="file" accept="video/*" hidden onChange={(e) => up(e.target.files?.[0], 'video')} />
      </div>

      <button className="more" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? 'סגירת הטקסטים' : 'הטקסטים של הלוק'}</button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="lane-text" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <label>זיקוק</label><Field label="זיקוק" multi v={l.distill} on={(v) => patch({ distill: v })} />
            <label>הייקו</label>
            <div className="haiku-edit">{[0, 1, 2].map((j) => <Field key={j} label={`שורה ${j + 1}`} cls="hk" v={l.haiku[j] ?? ''} on={(v) => { const h = [...l.haiku]; h[j] = v; patch({ haiku: h }); }} />)}</div>
            <label>פרשנות</label><Field label="פרשנות" multi v={l.reading} on={(v) => patch({ reading: v })} />
            <label>בד וגזרה</label><Field label="בד וגזרה" multi v={l.garment.text ?? ''} on={(v) => patch({ garment: { ...l.garment, text: v } })} />
            <label>פרומפט באנגלית</label><Field label="פרומפט באנגלית" cls="en-fld" multi v={l.prompt_en} on={(v) => patch({ prompt_en: v })} />
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
  const ready = c.looks.filter((l) => l.stage === 'ready').length;
  const shot = c.looks.filter((l) => primary(l, 'image')).length;
  const publish = () => { const s = c.status === 'published' ? 'draft' : 'published'; apply((x) => ({ ...x, status: s })); save(() => studio({ action: 'publish', id: c.id, status: s })); };

  return (
    <section className="editor" style={{ ['--accent' as string]: accentOf(c) }}>
      <header className="spread">
        <div className="spread-main">
          <p className="kicker dark">{c.status === 'published' ? 'במסלול' : 'באטלייה'} · {shot}/3 צולמו · {ready}/3 מוכנים</p>
          <Field label="שם הקולקציה" cls="title" v={plain(c.name)} on={(v) => patchC({ name: v })} />
          <p className="spread-ins"><Rich t={c.insight} /></p>
        </div>
        <div className="spread-haiku">{c.haiku.map((h) => <span key={h}>{h}</span>)}</div>
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
          <button className={`btn ${c.status === 'published' ? '' : 'dark'}`} onClick={publish}>{c.status === 'published' ? 'החזרה לאטלייה' : 'העלאה למסלול'}</button>
          <button className="btn quiet danger" onClick={async () => { if (confirm(`למחוק את "${plain(c.name)}" עם כל הצילומים והסרטונים?`)) { await studio({ action: 'delete', id: c.id }).catch((e) => flash(e.message)); onDelete(); } }}>מחיקה</button>
        </div>
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'prod'} className={tab === 'prod' ? 'on' : ''} onClick={() => setTab('prod')}>קו הייצור</button>
        <button role="tab" aria-selected={tab === 'text'} className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>הקולקציה במילים</button>
      </div>

      {tab === 'prod' ? (
        <div className="lanes">{c.looks.map((l) => <Lane key={l.id} c={c} l={l} patch={patchL(l)} setMedia={setMedia(l)} flash={flash} canDraft={canDraft} />)}</div>
      ) : (
        <div className="words">
          <div>
            <label>שורת תובנה</label><Field label="שורת תובנה" v={c.insight} on={(v) => patchC({ insight: v })} />
            <span className="hint">מילה בין ** ** מקבלת מרקר.</span>
            <label>הייקו הקולקציה</label>
            <div className="haiku-edit">{[0, 1, 2].map((j) => <Field key={j} label={`שורה ${j + 1}`} cls="hk big" v={c.haiku[j] ?? ''} on={(v) => { const h = [...c.haiku]; h[j] = v; patchC({ haiku: h }); }} />)}</div>
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
