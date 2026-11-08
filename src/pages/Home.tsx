import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Stage } from '../components/Stage';
import { Sketch } from '../components/Sketch';
import { listCollections, seedCollection } from '../lib/api';
import type { Collection } from '../lib/types';
import { Rich, plain } from '../lib/text';

const STEPS = [
  { k: '01', t: 'השראה', d: 'תמונה של טקסט, שיר או דימוי. היא נקראת פעם אחת, ולא נשמרת.' },
  { k: '02', t: 'סטודיו', d: 'שם, תובנה, הייקו, שלושה לוקים, פלטה ותפאורה. כל פרומפט מוכן למידג\'רני.' },
  { k: '03', t: 'צילום', d: 'התמונה חוזרת מהמידג\'רני לסטודיו, והופכת לסרטון מסלול.' },
  { k: '04', t: 'מסלול', d: 'התצוגה עצמה: הלוקים יוצאים בין הווילונות, אחד אחרי השני.' },
];

export function Home() {
  const [list, setList] = useState<Collection[]>([seedCollection]);
  const [open, setOpen] = useState(0);
  useEffect(() => { listCollections().then(setList); }, []);
  useEffect(() => { const t = setInterval(() => setOpen((o) => (o + 1) % 7), 1600); return () => clearInterval(t); }, []);
  const pub = list.filter((c) => c.status === 'published');
  const hero = pub[0] ?? list[0];
  return (
    <main className="home">
      <section className="hero">
        <Stage palette={hero.content.palette} open={open} compact>
          <div className="hero-copy">
            <p className="eyebrow">סטודיו ומסלול תצוגה</p>
            <h1>השראה נכנסת. <em>קולקציה</em> יוצאת למסלול.</h1>
            <p className="lede">כל קולקציה מתחילה בתמונה אחת, ומקבלת חיים משלה: שם, הייקו, שלושה לוקים, פרומפטים לצילום, סרטון ותצוגה.</p>
            <div className="cta">
              <a className="btn dark" href="#/studio">לסטודיו</a>
              <a className="btn" href={`#/show/${hero.id}`}>לצפייה במסלול</a>
            </div>
          </div>
        </Stage>
      </section>

      <section className="flow" aria-label="איך זה עובד">
        {STEPS.map((s, i) => (
          <motion.div key={s.k} className="step" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
            <span className="num">{s.k}</span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </motion.div>
        ))}
      </section>

      <section className="program">
        <header className="sec-head">
          <h2>התוכנייה</h2>
          <p>{pub.length} קולקציות במסלול{list.length > pub.length ? `, ${list.length - pub.length} בסטודיו` : ''}</p>
        </header>
        <div className="prog-grid">
          {list.map((c) => (
            <a key={c.id} className="prog" href={c.status === 'published' ? `#/show/${c.id}` : `#/studio/${c.id}`}>
              <div className="prog-looks">
                {c.content.looks.map((l) => (l.image_url ? <img key={l.n} src={l.image_url} alt={l.name} loading="lazy" /> : <Sketch key={l.n} c={c.content} n={l.n} />))}
              </div>
              <div className="prog-text">
                <span className="tag">{c.status === 'published' ? 'במסלול' : 'בסטודיו'}</span>
                <h3>{plain(c.content.name)}</h3>
                <p><Rich t={c.content.insight} /></p>
                <div className="swatches">{c.content.palette.map((p) => <i key={p.hex} style={{ background: p.hex }} title={p.name} />)}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
