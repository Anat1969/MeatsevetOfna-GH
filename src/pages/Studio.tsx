import { useCallback, useEffect, useRef, useState } from 'react';
import { Sketch } from '../components/Sketch';
import { makeFilm } from '../components/VideoMaker';
import { getCollection, listCollections, ownerKey, seedCollection, shrink, studio, uploadMedia } from '../lib/api';
import type { Collection, Content, Look } from '../lib/types';
import { Rich, plain } from '../lib/text';
import { go } from '../router';

const MJ = 'https://www.midjourney.com/imagine';
const copy = async (t: string, done: (m: string) => void) => { try { await navigator.clipboard.writeText(t); done('הועתק'); } catch { done('ההעתקה נחסמה בדפדפן'); } };

/** Editable line: looks like text, edits in place. */
function Field({ v, on, multi, cls, label }: { v: string; on: (s: string) => void; multi?: boolean; cls?: string; label: string }) {
  return multi
    ? <textarea aria-label={label} className={`fld ${cls ?? ''}`} value={v} rows={Math.max(2, Math.ceil(v.length / 46))} onChange={(e) => on(e.target.value)} />
    : <input aria-label={label} className={`fld ${cls ?? ''}`} value={v} onChange={(e) => on(e.target.value)} />;
}

function Gate({ onOk }: { onOk: () => void }) {
  const [k, setK] = useState(''); const [show, setShow] = useState(false); const [err, setErr] = useState('');
  return (
    <form className="gate" onSubmit={async (e) => { e.preventDefault(); ownerKey.set(k); const s = await studio<{ ok: boolean }>({ action: 'status' }).catch(() => ({ ok: false })); s.ok ? onOk() : setErr('הסיסמה לא נכונה.'); }}>
      <h2>הסטודיו נעול</h2>
      <p>כתיבה בסטודיו דורשת את סיסמת העורכת. הצפייה במסלול פתוחה לכולם.</p>
      <label className="pw"><input type={show ? 'text' : 'password'} autoComplete="current-password" name="password" value={k} onChange={(e) => setK(e.target.value)} placeholder="סיסמת העורכת" />
        <button type="button" onClick={() => setShow((s) => !s)}>{show ? 'הסתרה' : 'הצגה'}</button></label>
      {err && <p className="err">{err}</p>}
      <button className="btn dark" type="submit">כניסה</button>
    </form>
  );
}

function Intake({ onMade }: { onMade: (c: Collection) => void }) {
  const [img, setImg] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [over, setOver] = useState(false);
  const take = async (f?: File | null) => { if (!f || !f.type.startsWith('image/')) return; setErr(''); setImg(await shrink(f)); };
  useEffect(() => {
    const p = (e: ClipboardEvent) => { const f = [...(e.clipboardData?.files ?? [])][0]; if (f) take(f); };
    addEventListener('paste', p); return () => removeEventListener('paste', p);
  }, []);
  const run = async () => {
    setBusy(true); setErr('');
    try { const r = await studio<{ collection: Collection }>({ action: 'generate', image: img, note }); onMade(r.collection); setImg(''); setNote(''); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <section className={`intake${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
      <div className="drop">
        {img ? <img src={img} alt="הקלט" /> : (
          <label className="drop-empty">
            <input type="file" accept="image/*" onChange={(e) => take(e.target.files?.[0])} hidden />
            <b>תמונת השראה</b><span>גוררים, מדביקים או בוחרים קובץ</span>
          </label>
        )}
      </div>
      <div className="intake-side">
        <h2>קולקציה חדשה</h2>
        <p>התמונה נקראת פעם אחת ולא נשמרת. הקולקציה לא תרמוז על המקור.</p>
        <textarea className="fld" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="כיוון אישי, לא חובה: עונה, בד, תחושה, למי" aria-label="כיוון אישי" />
        <button className="btn dark" disabled={!img || busy} onClick={run}>{busy ? 'המעצב עובד, כחצי דקה' : 'צור קולקציה'}</button>
        {img && !busy && <button className="btn" onClick={() => setImg('')}>החלפת תמונה</button>}
        {err && <p className="err">{err}</p>}
      </div>
    </section>
  );
}

function LookCard({ c, l, set, flash }: { c: Collection; l: Look; set: (p: Partial<Look>) => void; flash: (m: string) => void }) {
  const k = c.content;
  const [busy, setBusy] = useState(''); const [pct, setPct] = useState(0);
  const imgIn = useRef<HTMLInputElement>(null); const vidIn = useRef<HTMLInputElement>(null);
  const up = async (f: File | undefined, kind: 'image' | 'video') => {
    if (!f) return;
    const ext = (f.name.split('.').pop() || (kind === 'image' ? 'jpg' : 'mp4')).toLowerCase();
    setBusy(kind === 'image' ? 'מעלה תמונה' : 'מעלה סרטון');
    try {
      const url = await uploadMedia(c.id, `l${l.n}-${kind}`, f, ext);
      set(kind === 'image' ? { image_url: url } : { video_url: url, video_kind: 'mj' });
      flash('נשמר');
    } catch (e) { flash((e as Error).message); } finally { setBusy(''); }
  };
  const film = async () => {
    if (!l.image_url) return;
    setBusy('מצלם סרטון מסלול'); setPct(0);
    try {
      const { blob, ext } = await makeFilm({ image: l.image_url, name: plain(l.name), haiku: l.haiku, accent: k.palette[4]?.hex ?? '#5E1F24', onProgress: setPct });
      const url = await uploadMedia(c.id, `l${l.n}-film`, blob, ext);
      set({ video_url: url, video_kind: 'studio' }); flash('הסרטון נשמר');
    } catch (e) { flash(`הסרטון נכשל: ${(e as Error).message}`); } finally { setBusy(''); }
  };
  return (
    <article className="look-card">
      <div className="media" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) up(f, f.type.startsWith('video') ? 'video' : 'image'); }}>
        {l.video_url ? <video src={l.video_url} muted loop autoPlay playsInline poster={l.image_url || undefined} />
          : l.image_url ? <img src={l.image_url} alt={plain(l.name)} />
          : <Sketch c={k} n={l.n} />}
        <span className="n">{String(l.n).padStart(2, '0')}</span>
        {busy && <div className="busy"><span>{busy}</span>{pct > 0 && <i style={{ width: `${pct * 100}%` }} />}</div>}
      </div>
      <div className="look-body">
        <Field label="שם הלוק" cls="h" v={l.name} on={(v) => set({ name: v })} />
        <Field label="זיקוק" multi v={l.distill} on={(v) => set({ distill: v })} />
        <div className="haiku-edit">{[0, 1, 2].map((j) => <Field key={j} label={`שורה ${j + 1} בהייקו`} cls="hk" v={l.haiku[j] ?? ''} on={(v) => { const h = [...l.haiku]; h[j] = v; set({ haiku: h }); }} />)}</div>
        <Field label="פרשנות" multi v={l.reading} on={(v) => set({ reading: v })} />
        <p className="meta">{l.place_he} <span className="en">{l.place_en}</span></p>
        <div className="steps">
          <span className="step-l">1. צילום</span>
          <button className="btn sm" onClick={() => copy(l.prompt_en, flash)} title={l.prompt_en}>העתקת פרומפט באנגלית</button>
          <button className="btn sm" onClick={() => copy(l.prompt_he, flash)} title={l.prompt_he}>בעברית</button>
          <a className="btn sm" href={MJ} target="_blank" rel="noreferrer">פתיחת מידג'רני</a>
          <button className="btn sm dark" onClick={() => imgIn.current?.click()}>העלאת התמונה</button>
          <input ref={imgIn} type="file" accept="image/*" hidden onChange={(e) => up(e.target.files?.[0], 'image')} />
        </div>
        <div className="steps">
          <span className="step-l">2. סרטון</span>
          <button className="btn sm dark" disabled={!l.image_url || !!busy} onClick={film} title="סרטון של 8 שניות מהתמונה, בתוך הדפדפן">סרטון מסלול מהתמונה</button>
          <button className="btn sm" onClick={() => copy(l.motion_en, flash)} title={l.motion_en}>הוראת תנועה למידג'רני</button>
          <button className="btn sm" onClick={() => vidIn.current?.click()}>העלאת סרטון</button>
          <input ref={vidIn} type="file" accept="video/*" hidden onChange={(e) => up(e.target.files?.[0], 'video')} />
          {l.video_url && <a className="btn sm" href={l.video_url} download>הורדה</a>}
        </div>
      </div>
    </article>
  );
}

function Editor({ c, onChange, onDelete }: { c: Collection; onChange: (c: Collection) => void; onDelete: () => void }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<number>();
  const flash = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2200); }, []);
  const persist = useCallback((next: Collection, status?: Collection['status']) => {
    onChange(next);
    clearTimeout(timer.current);
    setMsg('שומר');
    timer.current = window.setTimeout(async () => {
      try { await studio({ action: 'save', id: next.id, content: next.content, status }); setMsg('נשמר'); }
      catch (e) { setMsg((e as Error).message); }
    }, status ? 0 : 700);
  }, [c, onChange]);
  const setK = (p: Partial<Content>) => persist({ ...c, content: { ...c.content, ...p } });
  const setLook = (n: number) => (p: Partial<Look>) => setK({ looks: c.content.looks.map((l) => (l.n === n ? { ...l, ...p } : l)) });
  const k = c.content;
  return (
    <section className="editor">
      <header className="ed-head">
        <div className="ed-title">
          <span className="tag">{c.status === 'published' ? 'במסלול' : 'טיוטה'}</span>
          <Field label="שם הקולקציה" cls="title" v={plain(k.name)} on={(v) => setK({ name: v })} />
          <Field label="שורת תובנה (מילה בין ** ** מקבלת מרקר)" cls="ins" v={k.insight} on={(v) => setK({ insight: v })} />
        </div>
        <div className="ed-actions">
          <span className="saved" role="status">{msg}</span>
          <button className="btn dark" onClick={() => persist({ ...c, status: c.status === 'published' ? 'draft' : 'published' }, c.status === 'published' ? 'draft' : 'published')}>
            {c.status === 'published' ? 'החזרה לסטודיו' : 'העלאה למסלול'}</button>
          <a className="btn" href={`#/show/${c.id}`}>צפייה במסלול</a>
          <button className="btn ghost" onClick={async () => { if (confirm(`למחוק את "${plain(k.name)}" עם כל התמונות והסרטונים?`)) { await studio({ action: 'delete', id: c.id }).catch((e) => flash(e.message)); onDelete(); } }}>מחיקה</button>
        </div>
      </header>

      <div className="ed-grid">
        <div className="col-poem">
          <h3>הייקו הקולקציה</h3>
          <div className="haiku-edit">{[0, 1, 2].map((j) => <Field key={j} label={`שורה ${j + 1}`} cls="hk big" v={k.haiku[j] ?? ''} on={(v) => { const h = [...k.haiku]; h[j] = v; setK({ haiku: h }); }} />)}</div>
          <h3>פרשנות</h3>
          <Field label="פרשנות הקולקציה" multi v={k.reading} on={(v) => setK({ reading: v })} />
          <h3>מניפסט</h3>
          {k.manifesto.map((m, j) => <Field key={j} label={`שורת מניפסט ${j + 1}`} v={m} on={(v) => setK({ manifesto: k.manifesto.map((x, q) => (q === j ? v : x)) })} />)}
        </div>
        <div className="col-design">
          <h3>פלטה</h3>
          <div className="palette-edit">{k.palette.map((p, j) => (
            <label key={j}><input type="color" value={p.hex} onChange={(e) => setK({ palette: k.palette.map((x, q) => (q === j ? { ...x, hex: e.target.value } : x)) })} /><span>{p.name}</span></label>
          ))}</div>
          <h3>חתימה: {k.signature.name}</h3>
          <p><Rich t={k.signature.text} /></p>
          <h3>עקרונות</h3>
          <ol className="principles">{k.principles.map((p) => <li key={p.title}><b>{p.title}</b> <Rich t={p.text} /></li>)}</ol>
          <h3>תפאורה: {k.set.concept}</h3>
          <p><Rich t={k.set.text} /></p>
          <p className="meta">{k.set.place_he} <span className="en">{k.set.place_en}</span></p>
        </div>
      </div>

      <div className="looks">{k.looks.map((l) => <LookCard key={l.n} c={c} l={l} set={setLook(l.n)} flash={flash} />)}</div>
    </section>
  );
}

export function Studio({ id }: { id?: string }) {
  const [list, setList] = useState<Collection[]>([]);
  const [cur, setCur] = useState<Collection | null>(null);
  const [locked, setLocked] = useState<boolean | null>(null);
  useEffect(() => {
    listCollections().then(setList);
    studio<{ locked: boolean; ok: boolean }>({ action: 'status' }).then((s) => setLocked(s.locked && !s.ok)).catch(() => setLocked(false));
  }, []);
  useEffect(() => { if (id) getCollection(id).then(setCur); else setCur(null); }, [id]);
  if (locked) return <main className="studio"><Gate onOk={() => setLocked(false)} /></main>;
  return (
    <main className="studio">
      <aside className="shelf">
        <a className={`shelf-new${!id ? ' on' : ''}`} href="#/studio">קולקציה חדשה</a>
        <h3>על המתלה</h3>
        {list.map((c) => (
          <a key={c.id} href={`#/studio/${c.id}`} className={c.id === id ? 'on' : ''}>
            <span className="sw">{c.content.palette.slice(0, 5).map((p) => <i key={p.hex} style={{ background: p.hex }} />)}</span>
            <b>{plain(c.content.name)}</b>
            <small>{c.status === 'published' ? 'במסלול' : 'טיוטה'} · {c.content.looks.filter((l) => l.image_url).length}/3 צולמו</small>
          </a>
        ))}
      </aside>
      {cur ? (
        <Editor c={cur} onChange={(n) => { setCur(n); setList((l) => l.map((x) => (x.id === n.id ? n : x))); }}
          onDelete={() => { setList((l) => l.filter((x) => x.id !== cur.id)); go('#/studio'); }} />
      ) : (
        <Intake onMade={(c) => { setList((l) => [c, ...l]); go(`#/studio/${c.id}`); }} />
      )}
    </main>
  );
}
