import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Theatre, Figure, useWalk } from '../components/Theatre';
import { Plate } from '../components/Plate';
import { listCollections, seedCollection } from '../lib/api';
import type { Collection } from '../lib/types';
import { STAGES, accentOf, primary, stageIndex } from '../lib/types';
import { Rich, plain } from '../lib/text';
import { go } from '../router';
import { SEASONS } from '../data/sets2026';

export function Home() {
  const [list, setList] = useState<Collection[]>([seedCollection]);
  useEffect(() => { listCollections().then(setList); }, []);
  const pub = list.filter((c) => c.status === 'published');
  const hero = pub[0] ?? list[0];
  const [walker, setWalker] = useState(0);
  useEffect(() => { const t = setInterval(() => setWalker((w) => (w + 1) % 3), 7000); return () => clearInterval(t); }, []);
  const t = useWalk(walker, 0.95, 0.05, 5.5);

  // production line: how many looks stand at each stage, across all collections
  const line = useMemo(() => {
    const looks = list.flatMap((c) => c.looks);
    return STAGES.map((s, i) => ({ ...s, count: looks.filter((l) => stageIndex(l.stage) === i).length, total: looks.length }));
  }, [list]);
  const waiting = line[0].count;
  const others = hero.looks.filter((_, i) => i !== walker);

  return (
    <main className="home">
      <section className="hero">
        <Theatre accent={accentOf(hero)}>
          {others.map((l, i) => (
            <Figure key={l.id} t={0.62 + i * 0.12} x={i ? 26 : -26} onClick={() => go(`#/show/${hero.id}/${l.n}`)} label={`לוק ${l.n}: ${plain(l.name)}`}>
              <Plate c={hero} l={l} video={false} />
            </Figure>
          ))}
          <Figure key={`w${walker}`} t={t} onClick={() => go(`#/show/${hero.id}/${walker + 1}`)} label={`לוק ${walker + 1}`}>
            <Plate c={hero} l={hero.looks[walker]} />
          </Figure>
        </Theatre>
        <div className="hero-copy">
          <p className="kicker">מסלול · סטודיו ותצוגה</p>
          <h1>השראה נכנסת.<br /><em>קולקציה</em> יוצאת למסלול.</h1>
          <p className="lede">תמונה אחת הופכת לשלושה לוקים, להייקו, לצילום, לסרטון ולתצוגה. היצירה חיה בלי המקור שלה.</p>
          <div className="cta">
            <a className="btn light" href={`#/show/${hero.id}`}>לתצוגה: {plain(hero.name)}</a>
            <a className="btn ghost-light" href="#/studio">לסטודיו</a>
          </div>
        </div>
        <div className="hero-caption" aria-live="polite">
          <span className="num">{String(walker + 1).padStart(2, '0')} / 03</span>
          <b>{plain(hero.looks[walker]?.name)}</b>
          <span>{hero.looks[walker]?.place_he}</span>
        </div>
      </section>

      <section className="index">
        <header className="sec-head">
          <h2>התוכנייה</h2>
          <p><b>{pub.length}</b> במסלול · <b>{list.length - pub.length}</b> בסטודיו</p>
        </header>
        <ol className="index-list">
          {list.map((c, i) => (
            <motion.li key={c.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <a href={c.status === 'published' ? `#/show/${c.id}` : `#/studio/${c.id}`} style={{ ['--accent' as string]: accentOf(c) }}>
                <span className="ix-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="ix-title"><b>{plain(c.name)}</b><Rich t={c.insight} /></span>
                <span className="ix-looks">{c.looks.map((l) => <Plate key={l.id} c={c} l={l} video={false} />)}</span>
                <span className="ix-pal">{c.palette.map((p) => <i key={p.hex} style={{ background: p.hex }} title={p.name} />)}</span>
                <span className="ix-state">{c.status === 'published' ? 'במסלול' : 'בסטודיו'}</span>
              </a>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="line-sec">
        <header className="sec-head">
          <h2>{waiting ? <><mark>{waiting} לוקים</mark> מחכים לצילום.</> : 'כל הלוקים צולמו.'}</h2>
          <p>קו הייצור: מפרומפט ועד מסלול</p>
        </header>
        <div className="line">
          {line.map((s, i) => (
            <div key={s.id} className={`line-st${s.count ? ' has' : ''}`}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <b>{s.count}</b>
              <span>{s.label}</span>
              <i style={{ width: `${s.total ? (s.count / s.total) * 100 : 0}%` }} />
            </div>
          ))}
        </div>
        <p className="line-note">כל לוק עובר ארבע תחנות. התמונה הראשית נבחרת מתוך כמה צילומים, והסרטון נבנה ממנה.</p>
      </section>

      <section className="teaser">
        <a href="#/sets">
          <span className="kicker dark">ארכיון התפאורות</span>
          <b>ב-2026 התפאורה הפכה לסיפור עצמו.</b>
          <span>{SEASONS.reduce((n, s) => n + s.entries.length, 0)} תצוגות, ולכל אחת מה לקחת למסלול שלנו</span>
        </a>
        {hero.looks.some((l) => primary(l, 'image')) ? null : <p className="fine">הלוקים מוצגים כלוחות בד עד שמגיע צילום. בסטודיו: צילום טיוטה בלחיצה, או צילום ממידג'רני.</p>}
      </section>
    </main>
  );
}
