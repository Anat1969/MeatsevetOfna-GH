import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SilkLive } from '../components/silk/Silk';
import { Plate, WHITE, glossOf, lookColors } from '../components/Plate';
import { Kinetic } from '../components/Kinetic';
import { getCollection, listCollections } from '../lib/api';
import type { Collection, Look, Media } from '../lib/types';
import { accentOf, primary } from '../lib/types';
import { Rich, bare, plain } from '../lib/text';
import { go } from '../router';
import { audioDuration, choreography } from '../lib/soundtrack';

const DWELL = 11000, OPEN = 7000;

/** The look's whole making, in order: sketches, model studies, magazine images, then its films. */
const REEL = ['sketch', 'model', 'editorial', 'film'] as const;
const REEL_LABEL: Record<string, string> = { sketch: 'סקיצה', model: 'מודל', editorial: 'מגזין', film: 'סרטון' };
const stageOf = (m: Media) => m.stage ?? (m.kind === 'video' ? 'film' : 'editorial');
export function reelOf(l: Look): Media[] {
  return REEL.flatMap((st) => l.media.filter((m) => stageOf(m) === st && (st === 'film' ? m.kind === 'video' : m.kind === 'image'))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.created_at.localeCompare(b.created_at)));
}

/** One look as a shot in a fashion film: its images and films pass one after another inside the look's time (a film gets twice an image's time). */
function Shot({ c, l, sound, dwell, running }: { c: Collection; l: Look; sound: boolean; dwell: number; running: boolean }) {
  const items = useMemo(() => reelOf(l), [l]);
  const [k, setK] = useState(0);
  const weight = (m: Media) => (m.kind === 'video' ? 2 : 1);
  const total = items.reduce((a, m) => a + weight(m), 0) || 1;
  const cur = items[k];
  useEffect(() => {
    if (!running || !cur || k >= items.length - 1) return;
    const t = setTimeout(() => setK((x) => x + 1), (dwell * weight(cur)) / total);
    return () => clearTimeout(t);
  }, [k, running, dwell, total, items.length]);
  const st = cur ? stageOf(cur) : '';
  const nOfStage = cur ? items.filter((m) => stageOf(m) === st).indexOf(cur) + 1 : 0;
  const ofStage = cur ? items.filter((m) => stageOf(m) === st).length : 0;
  return (
    <motion.div className="shot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }} transition={{ duration: 1 }}>
      <div className={`shot-media reel-${st || 'none'}`}>
        {cur ? (
          <AnimatePresence mode="sync">
            <motion.div key={cur.id} className="reel-frame" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
              {cur.kind === 'video'
                ? <video className="plate" src={cur.url} autoPlay muted={!sound} playsInline />
                : <img className="plate" src={cur.url} alt={`${plain(l.name)}: ${REEL_LABEL[st]}`} draggable={false} />}
            </motion.div>
          </AnimatePresence>
        ) : <SilkLive {...WHITE} gloss={glossOf(l.n)} seed={l.n} />}
      </div>
      <motion.div className="wipe" initial={{ x: '0%' }} animate={{ x: '-110%' }} transition={{ duration: 1.1, ease: [0.7, 0, 0.2, 1] }} />
      <div className="shot-shade" />
      {cur && (
        <div className="reel-tag" aria-live="polite">
          <span>{REEL_LABEL[st]}{ofStage > 1 ? ` ${nOfStage}/${ofStage}` : ''}</span>
          <span className="reel-ticks" aria-hidden="true">{items.map((m, j) => <i key={m.id} className={`${j === k ? 'on' : j < k ? 'past' : ''} t-${stageOf(m)}`} />)}</span>
        </div>
      )}
      <div className="shot-text">
        <motion.span className="shot-n" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1 }}>{String(l.n).padStart(2, '0')}</motion.span>
        <Kinetic text={plain(l.name)} as="h2" className="shot-name" delay={0.9} />
        <motion.p className="shot-distill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1 }}><Rich t={l.distill} /></motion.p>
        <motion.div className="haiku" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 1.2 }}>{l.haiku.map((h) => <span key={h}>{bare(h)}</span>)}</motion.div>
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
  const [sound, setSound] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    listCollections().then((l) => { setAll(l); if (!id) setC(l.find((x) => x.status === 'published') ?? l[0]); });
    if (id) getCollection(id).then(setC);
  }, [id]);
  useEffect(() => { if (look != null) setI(look); }, [look]);

  // The soundtrack leads: a curtain gives the browser its click, then the song sets the length of every shot.
  const audio = useRef<HTMLAudioElement>(null);
  // a file that does not play (a broken copy, a blocked address) falls back to the Suno tab, so the show is never silent without saying so
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [c?.id, c?.soundtrack?.audio_url]);
  const track = bad ? undefined : c?.soundtrack?.audio_url;
  // no file (a private song in Suno): the music plays in a Suno tab, and the show keeps its time
  const suno = !track && c?.soundtrack?.suno_url ? c.soundtrack.suno_url : '';
  const [waiting, setWaiting] = useState(false);
  const [dur, setDur] = useState<number | undefined>();
  const [entered, setEntered] = useState(false);
  const [muted, setMuted] = useState(false);
  useEffect(() => { setDur(c?.soundtrack?.duration ?? c?.soundtrack?.suno_duration); setEntered(false); setWaiting(false); if (track && !c?.soundtrack?.duration) audioDuration(track).then((d) => d && setDur(d)); }, [c?.id, track]);
  const ch = track || suno ? choreography(dur ?? (suno ? 180 : undefined)) : null;
  const curtain = !!(track || suno) && !entered;
  const OPEN_MS = ch ? ch.open * 1000 : OPEN, DWELL_MS = ch ? ch.look * 1000 : DWELL;
  const fade = useRef<number>();
  const fadeOut = useCallback(() => {
    const a = audio.current; if (!a) return; clearInterval(fade.current);
    fade.current = window.setInterval(() => { a.volume = Math.max(0, a.volume - 0.05); if (a.volume <= 0.01) { clearInterval(fade.current); a.pause(); } }, 120);
  }, []);
  const seek = useCallback((n: number) => { const a = audio.current; if (a && ch && entered) { clearInterval(fade.current); a.volume = 0.85; a.currentTime = ch.at(n); if (play) a.play().catch(() => {}); } }, [ch, entered, play]);
  const start = () => { setWaiting(false); setEntered(true); setI(0); setPlay(true); setSound(false); };
  // Suno: open the song, and the show starts when she comes back to this tab (after pressing play there)
  const openSuno = () => { window.open(suno, 'maslul-suno'); setWaiting(true); };
  useEffect(() => {
    if (!waiting) return;
    const back = () => { if (document.visibilityState === 'visible') start(); };
    const t = window.setTimeout(() => { addEventListener('focus', back); document.addEventListener('visibilitychange', back); }, 600);
    return () => { clearTimeout(t); removeEventListener('focus', back); document.removeEventListener('visibilitychange', back); };
  }, [waiting]);
  const enter = () => {
    if (suno) { openSuno(); return; }
    setEntered(true); setI(0); setPlay(true); setSound(false);
    const a = audio.current; if (a) { a.currentTime = 0; a.volume = 0.85; a.muted = false; setMuted(false); a.play().catch(() => {}); }
  };
  useEffect(() => { const a = audio.current; if (!a || !entered) return; if (play && i < 4) { clearInterval(fade.current); a.volume = 0.85; a.play().catch(() => {}); } else if (!play && i < 4) a.pause(); }, [play, entered]);
  // the finale keeps the music to its end (or fades a long song)
  useEffect(() => { if (i !== 4 || !entered || !ch || suno) return; const a = audio.current; if (a && a.paused && play) a.play().catch(() => {}); const t = setTimeout(fadeOut, Math.max(0, ch.fin - 3) * 1000); return () => clearTimeout(t); }, [i, entered]);
  useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);

  const move = useCallback((d: number) => setI((x) => Math.min(4, Math.max(0, x + d))), []);
  // with a song the show keeps running and the music jumps with it; without one, a manual step pauses the show
  const jump = (n: number) => { n = Math.min(4, Math.max(0, n)); if (ch && entered) { setI(n); seek(n); } else { setPlay(false); setI(n); } };
  const jumpRef = useRef((_: number) => {});
  jumpRef.current = (d: number) => jump(i + d);
  useEffect(() => {
    if (!play || curtain) return;
    if (i === 4) { setPlay(false); return; }
    const t = setTimeout(() => move(1), i === 0 ? OPEN_MS : DWELL_MS);
    return () => clearTimeout(t);
  }, [i, play, move, curtain, OPEN_MS, DWELL_MS]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') jumpRef.current(1);
      if (e.key === 'ArrowRight') jumpRef.current(-1);
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
                <motion.div className="haiku big" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1.4 }}>{c.haiku.map((h) => <span key={h}>{bare(h)}</span>)}</motion.div>
              </div>
            </motion.div>
          )}
          {L && <Shot key={L.id} c={c} l={L} sound={sound} dwell={DWELL_MS} running={play && !curtain} />}
          {i === 4 && (
            <motion.div key="fin" className="shot finale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="tri">
                {c.looks.map((l, j) => (
                  <motion.figure key={l.id} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + j * 0.25, duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}>
                    <Plate c={c} l={l} video={false} alive />
                    <figcaption><b>{String(l.n).padStart(2, '0')}</b>{plain(l.name)}</figcaption>
                  </motion.figure>
                ))}
              </div>
              <div className="fin-text">
                <p className="kicker dark">סיום · {plain(c.name)}</p>
                <div className="haiku fin-haiku">{c.haiku.map((h, j) => <motion.span key={h} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4 + j * 0.35, duration: 0.9 }}>{bare(h)}</motion.span>)}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {track && <audio ref={audio} src={track} preload="auto" onError={() => setBad(true)} />}
      {curtain && (
        <div className="curtain" role="dialog" aria-label="כניסה לתצוגה">
          <p className="kicker">{plain(c.name)}</p>
          {!waiting ? (
            <>
              <button className="dot curtain-in" onClick={enter}><i aria-hidden="true" />כניסה</button>
              <p className="curtain-note">{suno ? 'השיר נפתח ב-Suno. לוחצים שם play, חוזרים לכאן, והתצוגה מתחילה' : `התצוגה עם פס קול${ch ? `, ${Math.round(ch.T)} שניות` : ''}`}</p>
            </>
          ) : (
            <>
              <p className="curtain-wait">לוחצים play בלשונית של Suno, וחוזרים לכאן</p>
              <button className="dot curtain-in" onClick={start}><i aria-hidden="true" />המוזיקה מתנגנת, מתחילים</button>
              <button className="link" onClick={openSuno}>פתיחת Suno שוב</button>
            </>
          )}
        </div>
      )}
      <nav className="programme" aria-label="סדר התצוגה">
        <button className={i === 0 ? 'on' : ''} onClick={() => jump(0)}><span className="num">00</span>פתיחה</button>
        {c.looks.map((l) => (
          <button key={l.id} className={i === l.n ? 'on' : ''} onClick={() => jump(l.n)}>
            <span className="thumb"><Plate c={c} l={l} video={false} /></span>
            <span className="num">{String(l.n).padStart(2, '0')}</span>{plain(l.name)}
          </button>
        ))}
        <button className={i === 4 ? 'on' : ''} onClick={() => jump(4)}><span className="num">04</span>סיום</button>
        <span className="sp" />
        {all.length > 1 && (
          <select aria-label="בחירת קולקציה" value={c.id} onChange={(e) => go(`#/show/${e.target.value}`)}>
            {all.map((x) => <option key={x.id} value={x.id}>{plain(x.name)}{x.status === 'draft' ? ' · טיוטה' : ''}</option>)}
          </select>
        )}
        <button className={`state${play && i < 4 && !curtain ? ' is-on' : ''}`} onClick={() => (curtain ? enter() : i === 4 ? (track && entered ? enter() : (setI(0), setPlay(true))) : setPlay((p) => !p))} aria-pressed={play && i < 4} title={i === 4 ? 'מהתחלה' : play ? 'לחיצה עוצרת' : 'לחיצה מפעילה'}><i aria-hidden="true" />{i === 4 ? 'מהתחלה' : play && !curtain ? 'התצוגה בתנועה' : 'התצוגה עצורה'}</button>
        {track && <button className={`state${entered && !muted ? ' is-on' : ''}`} onClick={() => (entered ? setMuted((m) => !m) : enter())} aria-pressed={entered && !muted}><i aria-hidden="true" />{entered && !muted ? 'המוזיקה מתנגנת' : 'המוזיקה כבויה'}</button>}
        {suno && <button className={`state${entered ? ' is-on' : ''}`} onClick={openSuno} title="השיר מתנגן בלשונית של Suno"><i aria-hidden="true" />{entered ? 'המוזיקה ב-Suno' : 'פתיחת המוזיקה'}</button>}
        {L && primary(L, 'video') && (!track || muted) && <button className="ctl" onClick={() => setSound((x) => !x)} aria-pressed={sound}>{sound ? 'השתקה' : 'סאונד'}</button>}
        <button className="ctl" onClick={() => root.current?.requestFullscreen?.()} title="מסך מלא (F)">מסך מלא</button>
        <i className="bar-progress" key={`${i}${play}`} style={{ animationDuration: `${i === 0 ? OPEN_MS : DWELL_MS}ms`, animationPlayState: play && i < 4 && !curtain ? 'running' : 'paused' }} />
      </nav>
    </main>
  );
}
