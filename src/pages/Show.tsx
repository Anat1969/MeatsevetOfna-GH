import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SilkLive } from '../components/silk/Silk';
import { Plate, lookColors } from '../components/Plate';
import { Kinetic } from '../components/Kinetic';
import { getCollection, listCollections } from '../lib/api';
import type { Collection, Look } from '../lib/types';
import { accentOf, primary } from '../lib/types';
import { Rich, plain } from '../lib/text';
import { go } from '../router';

const DWELL = 11000, OPEN = 7000;

/** One look as a shot in a fashion film: slow push-in, words that rise, a band of the hidden colour between shots. */
function Shot({ c, l }: { c: Collection; l: Look }) {
  const has = !!(primary(l, 'image') || primary(l, 'video'));
  const col = lookColors(c, l.n);
  return (
    <motion.div className="shot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }} transition={{ duration: 1 }}>
      <motion.div className="shot-media" initial={{ scale: 1.14 }} animate={{ scale: 1.0 }} transition={{ duration: DWELL / 1000 + 2, ease: 'linear' }}>
        {has ? <Plate c={c} l={l} /> : <SilkLive face={col.face} lining={col.lining} seed={l.n} />}
      </motion.div>
      <motion.div className="wipe" initial={{ x: '0%' }} animate={{ x: '-110%' }} transition={{ duration: 1.1, ease: [0.7, 0, 0.2, 1] }} />
      <div className="shot-shade" />
      <div className="shot-text">
        <motion.span className="shot-n" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1 }}>{String(l.n).padStart(2, '0')}</motion.span>
        <Kinetic text={plain(l.name)} as="h2" className="shot-name" delay={0.9} />
        <motion.p className="shot-distill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1 }}><Rich t={l.distill} /></motion.p>
        <motion.div className="haiku" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 1.2 }}>{l.haiku.map((h) => <span key={h}>{h}</span>)}</motion.div>
        <motion.p className="shot-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3, duration: 1 }}>{l.place_he} <span className="en">{l.place_en}</span></motion.p>
      </div>
    </motion.div>
  );
}

export function Show({ id, look }: { id?: string; look?: number }) {
  const [c, setC] = useState<Collection | null>(null);
  const [all, setAll] = useState<Collection[]>([]);
  const [i, setI] = useState(look ?? 0);
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

  if (!c) return <main className="show"><p className="empty">מכינים את התצוגה.</p></main>;
  const L = i >= 1 && i <= 3 ? c.looks[i - 1] : null;
  const open = lookColors(c, 1);

  return (
    <main className="show" ref={root} style={{ ['--accent' as string]: accentOf(c) }}>
      <div className="film">
        <AnimatePresence mode="sync">
          {i === 0 && (
            <motion.div key="open" className="shot opening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }}>
              <div className="shot-media"><SilkLive face="#f2f0ec" lining={open.lining} seed={7} /></div>
              <div className="open-shade" />
              <div className="open-text">
                <motion.p className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>{c.set_design.concept} · {c.set_design.place_he} <span className="en">{c.set_design.place_en}</span></motion.p>
                <Kinetic text={plain(c.name)} className="open-title" delay={0.5} step={0.12} />
                <motion.p className="open-ins" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 1 }}><Rich t={c.insight} /></motion.p>
                <motion.div className="haiku big" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1.4 }}>{c.haiku.map((h) => <span key={h}>{h}</span>)}</motion.div>
              </div>
            </motion.div>
          )}
          {L && <Shot key={L.id} c={c} l={L} />}
          {i === 4 && (
            <motion.div key="fin" className="shot finale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="tri">
                {c.looks.map((l, j) => (
                  <motion.figure key={l.id} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + j * 0.25, duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}>
                    <Plate c={c} l={l} />
                    <figcaption><b>{String(l.n).padStart(2, '0')}</b>{plain(l.name)}</figcaption>
                  </motion.figure>
                ))}
              </div>
              <div className="fin-text">
                <p className="kicker dark">סיום · {c.signature.name}</p>
                {c.manifesto.map((m, j) => <motion.p key={m} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4 + j * 0.3, duration: 0.9 }}>{m}</motion.p>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
