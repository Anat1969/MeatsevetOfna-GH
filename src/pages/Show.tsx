import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Stage } from '../components/Stage';
import { Sketch } from '../components/Sketch';
import { getCollection, listCollections } from '../lib/api';
import type { Collection } from '../lib/types';
import { Rich, plain } from '../lib/text';
import { go } from '../router';

const DWELL = 9000;

export function Show({ id, look }: { id?: string; look?: number }) {
  const [c, setC] = useState<Collection | null>(null);
  const [all, setAll] = useState<Collection[]>([]);
  const [i, setI] = useState(look ?? 0); // 0 = opening, 1..3 looks, 4 = finale
  const [play, setPlay] = useState(true);

  useEffect(() => {
    listCollections().then((l) => {
      setAll(l);
      const pick = id ? null : (l.find((x) => x.status === 'published') ?? l[0]);
      if (pick) setC(pick);
    });
    if (id) getCollection(id).then(setC);
  }, [id]);
  useEffect(() => { if (look != null) setI(look); }, [look]);

  const steps = 5;
  const move = useCallback((d: number) => setI((x) => (x + d + steps) % steps), []);
  useEffect(() => {
    if (!play) return;
    const t = setTimeout(() => move(1), i === 0 ? 6000 : DWELL);
    return () => clearTimeout(t);
  }, [i, play, move]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { setPlay(false); move(1); }
      if (e.key === 'ArrowRight') { setPlay(false); move(-1); }
      if (e.key === ' ') { e.preventDefault(); setPlay((p) => !p); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [move]);

  if (!c) return <main className="show"><p className="empty">טוענים את המסלול.</p></main>;
  const k = c.content;
  const L = i >= 1 && i <= 3 ? k.looks[i - 1] : null;
  const accent = k.palette[4]?.hex ?? '#5E1F24';

  return (
    <main className="show" style={{ ['--accent' as string]: accent }}>
      <Stage palette={k.palette} open={L ? (i - 1) * 2 : i === 4 ? 6 : -1}>
        <div className="runway">
          <AnimatePresence mode="wait">
            {L ? (
              <motion.figure key={`l${i}`} className="walker"
                initial={{ scale: 0.28, y: -150, opacity: 0, filter: 'blur(3px)' }}
                animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ scale: 1.08, x: i % 2 ? -260 : 260, opacity: 0 }}
                transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}>
                {L.video_url ? <video src={L.video_url} autoPlay muted loop playsInline poster={L.image_url || undefined} />
                  : L.image_url ? <img src={L.image_url} alt={plain(L.name)} />
                  : <div className="sketch-frame"><Sketch c={k} n={L.n} /><span>סקיצה. התמונה עוד בצילום.</span></div>}
              </motion.figure>
            ) : (
              <motion.div key={`t${i}`} className="title-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
                <p className="eyebrow">{i === 0 ? 'פתיחה' : 'סיום'}</p>
                <h1>{plain(k.name)}</h1>
                {i === 0 ? <p className="ins"><Rich t={k.insight} /></p> : <div className="manifesto">{k.manifesto.map((m) => <p key={m}>{m}</p>)}</div>}
                <div className="haiku big">{k.haiku.map((h) => <span key={h}>{h}</span>)}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Stage>

      <aside className="notes">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, delay: L ? 1.2 : 0.2 }}>
            {L ? (
              <>
                <span className="num">לוק {String(L.n).padStart(2, '0')} / 03</span>
                <h2>{plain(L.name)}</h2>
                <p className="distill"><Rich t={L.distill} /></p>
                <div className="haiku">{L.haiku.map((h) => <span key={h}>{h}</span>)}</div>
                <p className="reading"><Rich t={L.reading} /></p>
                <dl>
                  <dt>הבגד</dt><dd>{L.garment}</dd>
                  <dt>המקום</dt><dd>{L.place_he} <span className="en">{L.place_en}</span></dd>
                </dl>
              </>
            ) : (
              <>
                <span className="num">{i === 0 ? 'התפאורה' : 'החתימה'}</span>
                <h2>{i === 0 ? k.set.concept : k.signature.name}</h2>
                <p className="reading"><Rich t={i === 0 ? k.set.text : k.signature.text} /></p>
                {i === 0 && <p className="place">{k.set.place_he} <span className="en">{k.set.place_en}</span></p>}
                <div className="palette-row">{k.palette.map((p) => <span key={p.hex}><i style={{ background: p.hex }} />{p.name}</span>)}</div>
                <p className="legend">הפלטה של הקולקציה צובעת את התפאורה. הבטנה של הווילונות היא הצבע הנסתר.</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </aside>

      <nav className="program-strip" aria-label="סדר התצוגה">
        <button className={i === 0 ? 'on' : ''} onClick={() => { setPlay(false); setI(0); }}>פתיחה</button>
        {k.looks.map((l) => (
          <button key={l.n} className={i === l.n ? 'on' : ''} onClick={() => { setPlay(false); setI(l.n); }}>
            <b>{String(l.n).padStart(2, '0')}</b> {plain(l.name)}
          </button>
        ))}
        <button className={i === 4 ? 'on' : ''} onClick={() => { setPlay(false); setI(4); }}>סיום</button>
        <span className="sp" />
        <button className="ctl" onClick={() => setPlay((p) => !p)} aria-pressed={play}>{play ? 'עצירה' : 'הפעלה'}</button>
        {all.length > 1 && (
          <select aria-label="קולקציה" value={c.id} onChange={(e) => go(`#/show/${e.target.value}`)}>
            {all.map((x) => <option key={x.id} value={x.id}>{plain(x.content.name)}{x.status === 'draft' ? ' (טיוטה)' : ''}</option>)}
          </select>
        )}
        <div className="progress" key={`${i}${play}`} style={{ animationDuration: play ? `${i === 0 ? 6000 : DWELL}ms` : '0s', animationPlayState: play ? 'running' : 'paused' }} />
      </nav>
    </main>
  );
}
