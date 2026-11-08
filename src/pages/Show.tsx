import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Theatre, Figure, useWalk } from '../components/Theatre';
import { Plate } from '../components/Plate';
import { getCollection, listCollections } from '../lib/api';
import type { Collection, Look } from '../lib/types';
import { accentOf } from '../lib/types';
import { Rich, plain } from '../lib/text';
import { go } from '../router';

const DWELL = 10000, OPEN = 6500;

function Walking({ c, l }: { c: Collection; l: Look }) {
  const t = useWalk(l.id, 1, 0.02, 3.6);
  return (
    <motion.div className="walking" exit={{ opacity: 0, x: l.n % 2 ? '-30vw' : '30vw', transition: { duration: 1.1, ease: [0.5, 0, 0.75, 0] } }}>
      <Figure t={t}><Plate c={c} l={l} /></Figure>
    </motion.div>
  );
}

export function Show({ id, look }: { id?: string; look?: number }) {
  const [c, setC] = useState<Collection | null>(null);
  const [all, setAll] = useState<Collection[]>([]);
  const [i, setI] = useState(look ?? 0); // 0 opening, 1..3 looks, 4 finale
  const [play, setPlay] = useState(true);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    listCollections().then((l) => { setAll(l); if (!id) setC(l.find((x) => x.status === 'published') ?? l[0]); });
    if (id) getCollection(id).then(setC);
  }, [id]);
  useEffect(() => { if (look != null) setI(look); }, [look]);
  const move = useCallback((d: number) => setI((x) => Math.min(4, Math.max(0, x + d))), []);
  useEffect(() => {
    if (!play) return;
    if (i === 4) { setPlay(false); return; }
    const t = setTimeout(() => move(1), i === 0 ? OPEN : DWELL);
    return () => clearTimeout(t);
  }, [i, play, move]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { setPlay(false); move(1); }
      if (e.key === 'ArrowRight') { setPlay(false); move(-1); }
      if (e.key === ' ') { e.preventDefault(); setPlay((p) => !p); }
      if (e.key === 'f') root.current?.requestFullscreen?.();
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [move]);

  if (!c) return <main className="show"><p className="empty light">מכינים את האולם.</p></main>;
  const L = i >= 1 && i <= 3 ? c.looks[i - 1] : null;

  return (
    <main className="show" ref={root} style={{ ['--accent' as string]: accentOf(c) }}>
      <Theatre accent={accentOf(c)}>
        <AnimatePresence>
          {L && <Walking key={L.id} c={c} l={L} />}
          {i === 4 && c.looks.map((l, j) => (
            <motion.div key={`f${l.id}`} className="walking" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: j * 0.5, duration: 1.2 } }} exit={{ opacity: 0 }}>
              <Figure t={0.4} x={(j - 1) * 40}><Plate c={c} l={l} /></Figure>
            </motion.div>
          ))}
        </AnimatePresence>
      </Theatre>

      <AnimatePresence mode="wait">
        {i === 0 && (
          <motion.div key="open" className="show-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 1.4 }}>
            <p className="kicker">{c.set_design.concept} · {c.set_design.place_he} <span className="en">{c.set_design.place_en}</span></p>
            <h1>{plain(c.name)}</h1>
            <p className="ins"><Rich t={c.insight} /></p>
            <div className="haiku">{c.haiku.map((h) => <span key={h}>{h}</span>)}</div>
          </motion.div>
        )}
        {L && (
          <motion.aside key={`n${L.id}`} className="card" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0, transition: { delay: 2.6, duration: 0.9 } }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
            <span className="num">לוק {String(L.n).padStart(2, '0')} / 03</span>
            <h2>{plain(L.name)}</h2>
            <p className="distill"><Rich t={L.distill} /></p>
            <div className="haiku">{L.haiku.map((h) => <span key={h}>{h}</span>)}</div>
            <p className="reading"><Rich t={L.reading} /></p>
            <dl>
              <dt>בד וגזרה</dt><dd>{L.garment.text}</dd>
              <dt>מקום הצילום</dt><dd>{L.place_he} <span className="en">{L.place_en}</span></dd>
            </dl>
          </motion.aside>
        )}
        {i === 4 && (
          <motion.div key="fin" className="show-title fin" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.6, duration: 1.2 } }} exit={{ opacity: 0 }}>
            <p className="kicker">סיום · {c.signature.name}</p>
            <div className="manifesto">{c.manifesto.map((m) => <p key={m}>{m}</p>)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="programme" aria-label="סדר התצוגה">
        <button className={i === 0 ? 'on' : ''} onClick={() => { setPlay(false); setI(0); }}><span className="num">00</span>פתיחה</button>
        {c.looks.map((l) => (
          <button key={l.id} className={i === l.n ? 'on' : ''} onClick={() => { setPlay(false); setI(l.n); }}>
            <span className="thumb"><Plate c={c} l={l} video={false} /></span>
            <span className="num">{String(l.n).padStart(2, '0')}</span>{plain(l.name)}
          </button>
        ))}
        <button className={i === 4 ? 'on' : ''} onClick={() => { setPlay(false); setI(4); }}><span className="num">04</span>סיום</button>
        <span className="sp" />
        {all.length > 1 && (
          <select aria-label="בחירת קולקציה" value={c.id} onChange={(e) => go(`#/show/${e.target.value}`)}>
            {all.map((x) => <option key={x.id} value={x.id}>{plain(x.name)}{x.status === 'draft' ? ' · טיוטה' : ''}</option>)}
          </select>
        )}
        <button className="ctl" onClick={() => (i === 4 ? (setI(0), setPlay(true)) : setPlay((p) => !p))} aria-pressed={play}>{i === 4 ? 'מהתחלה' : play ? 'עצירה' : 'הפעלה'}</button>
        <button className="ctl" onClick={() => root.current?.requestFullscreen?.()} title="מסך מלא (F)">מסך מלא</button>
        <i className="bar-progress" key={`${i}${play}`} style={{ animationDuration: `${i === 0 ? OPEN : DWELL}ms`, animationPlayState: play && i < 4 ? 'running' : 'paused' }} />
      </nav>
    </main>
  );
}
