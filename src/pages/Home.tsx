import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SilkLive } from '../components/silk/Silk';
import { Plate, lookColors } from '../components/Plate';
import { Kinetic } from '../components/Kinetic';
import { listCollections, seedCollection } from '../lib/api';
import type { Collection, Look } from '../lib/types';
import { STAGES, accentOf, lead, stageIndex } from '../lib/types';
import { Rich, plain } from '../lib/text';
import { SEASONS, KIND_COLOR } from '../data/sets2026';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function Spread({ c, l, flip }: { c: Collection; l: Look; flip: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.02, 1.08]);
  const ty = useTransform(scrollYProgress, [0, 1], [60, -60]);
  return (
    <section ref={ref} className={`spread-sec${flip ? ' flip' : ''}`} style={{ ['--accent' as string]: accentOf(c) }}>
      <a className="sp-media" href={`#/show/${c.id}/${l.n}`} aria-label={`לוק ${l.n} בתצוגה`}>
        <motion.div className="sp-img" style={{ y, scale }}><Plate c={c} l={l} /></motion.div>
        <div className="sp-shade" />
        <motion.div className="sp-on" style={{ y: ty }}>
          <span className="sp-n">{String(l.n).padStart(2, '0')}</span>
          <h2>{plain(l.name)}</h2>
          <p><Rich t={l.distill} /></p>
        </motion.div>
      </a>
      <motion.div className="sp-text" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-15%' }} transition={{ duration: 1 }}>
        <span className="kicker dark">לוק {String(l.n).padStart(2, '0')} מתוך 03</span>
        <div className="haiku big">{l.haiku.map((h) => <span key={h}>{h}</span>)}</div>
        <p className="reading"><Rich t={l.reading} /></p>
        <dl>
          <dt>בד וגזרה</dt><dd>{l.garment.text}</dd>
          <dt>מקום</dt><dd>{l.place_he} <span className="en">{l.place_en}</span></dd>
          <dt>אור</dt><dd>{l.light}</dd>
        </dl>
      </motion.div>
    </section>
  );
}

export function Home() {
  const [list, setList] = useState<Collection[]>([seedCollection]);
  useEffect(() => { listCollections().then(setList); }, []);
  const pub = list.filter((c) => c.status === 'published');
  const hero = pub[0] ?? list[0];
  const [tone, setTone] = useState(2);
  useEffect(() => { const t = setInterval(() => setTone((x) => (x % 3) + 1), 9000); return () => clearInterval(t); }, []);
  const silk = lookColors(hero, tone);
  const coverPhoto = lead(hero.looks[tone - 1] ?? hero.looks[0], 'editorial')?.url;
  const d = new Date();
  const line = useMemo(() => {
    const looks = list.flatMap((c) => c.looks);
    return STAGES.map((s, i) => ({ ...s, count: looks.filter((l) => stageIndex(l.stage) === i).length, total: looks.length }));
  }, [list]);
  const news = SEASONS.flatMap((s) => s.entries.map((e) => ({ ...e, season: s.title }))).slice(0, 6);

  return (
    <main className="home">
      <section className="cover" style={{ ['--accent' as string]: accentOf(hero) }}>
        <div className="cover-bg" />
        {coverPhoto
          ? <motion.img key={coverPhoto} className="cover-photo" src={coverPhoto} alt="" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.4, ease: 'easeOut' }} />
          : <SilkLive face="#f2f0ec" lining={silk.lining} seed={0} className="cover-silk" />}
        <div className="cover-shade" />
        <header className="mast">
          <span className="issue">גיליון {String(list.length).padStart(2, '0')} · {MONTHS[d.getMonth()]} {d.getFullYear()}</span>
          <Kinetic text="מסלול" className="masthead" step={0} />
          <span className="issue">אופנה מתוך השראה</span>
        </header>
        <div className="cover-lines">
          <motion.p className="kicker dark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>הקולקציה בשער</motion.p>
          <Kinetic text={plain(hero.name)} as="h2" className="cover-title" delay={0.35} />
          <motion.p className="cover-ins" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}><Rich t={hero.insight} /></motion.p>
          <motion.ol className="cover-toc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }}>
            {hero.looks.map((l) => (
              <li key={l.id} className={tone === l.n ? 'on' : ''} onMouseEnter={() => setTone(l.n)}><a href={`#/show/${hero.id}/${l.n}`}><b>{String(l.n).padStart(2, '0')}</b>{plain(l.name)}</a></li>
            ))}
          </motion.ol>
          <motion.div className="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
            <a className="dot" href={`#/show/${hero.id}`}><i aria-hidden="true" />לצפייה בתצוגה</a>
            <a className="btn" href="#/studio">לסטודיו</a>
          </motion.div>
        </div>
        <motion.div className="cover-haiku" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1.2 }}>
          {hero.haiku.map((h) => <span key={h}>{h}</span>)}
        </motion.div>
        <span className="scroll-cue" aria-hidden="true">גלילה לגיליון</span>
      </section>

      <section className="manif">
        <span className="kicker dark">המניפסט</span>
        {hero.manifesto.map((m, i) => (
          <motion.p key={m} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.9 }}>{m}</motion.p>
        ))}
      </section>

      {hero.looks.map((l, i) => <Spread key={l.id} c={hero} l={l} flip={i % 2 === 1} />)}

      <section className="index">
        <header className="sec-head">
          <h2>הגיליונות</h2>
          <p><b>{pub.length}</b> במסלול · <b>{list.length - pub.length}</b> בסטודיו · <b>{line[0].count}</b> לוקים מחכים לצילום</p>
        </header>
        <ol className="index-list">
          {list.map((c, i) => (
            <li key={c.id}>
              <a href={c.status === 'published' ? `#/show/${c.id}` : `#/studio/${c.id}`} style={{ ['--accent' as string]: accentOf(c) }}>
                <span className="ix-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="ix-title"><b>{plain(c.name)}</b><Rich t={c.insight} /></span>
                <span className="ix-looks">{c.looks.map((l) => <Plate key={l.id} c={c} l={l} video={false} />)}</span>
                <span className="ix-state">{c.status === 'published' ? 'במסלול' : 'בסטודיו'}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="news">
        <header className="sec-head">
          <h2>חדשות התפאורה <span className="thin">2026</span></h2>
          <a className="more-link" href="#/sets">כל הארכיון</a>
        </header>
        <div className="news-grid">
          {news.map((n, i) => (
            <motion.a key={n.house + n.venue} href="#/sets" className={`story${i === 0 ? ' lead' : ''}`} style={{ ['--k' as string]: KIND_COLOR[n.kind] }}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.1, duration: 0.8 }}>
              <div className="story-art" aria-hidden="true"><i /><i /><i /></div>
              <div className="story-text">
                <span className="kicker">{n.season} · {n.kind}</span>
                <h3>{n.house}</h3>
                <p><Rich t={n.idea} /></p>
                <span className="story-city">{n.city_he} <span className="en">{n.city_en}</span></span>
              </div>
            </motion.a>
          ))}
        </div>
      </section>
    </main>
  );
}
