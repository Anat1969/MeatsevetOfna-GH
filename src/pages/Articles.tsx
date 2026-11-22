import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { listCollections } from '../lib/api';
import type { Collection, Look, Shot } from '../lib/types';
import { accentOf, lead, primary } from '../lib/types';
import { Rich, bare, plain } from '../lib/text';
import { SilkStill } from '../components/silk/Silk';
import { WHITE, glossOf } from '../components/Plate';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const A4_PX = 793.7; // 210mm at 96dpi
const two = (n: number) => String(n).padStart(2, '0');

/** A collection is an article once every look has a photograph: there is something to show beside the words. */
export const isArticle = (c: Collection) => c.looks.length > 0 && c.looks.every((l) => primary(l, 'image'));
/** A smaller copy of a stored image (Supabase image rendering); any other address is left as it is. */
export const small = (url: string, w: number) => (url.includes('/storage/v1/object/public/') ? `${url.replace('/object/public/', '/render/image/public/')}?width=${w}&resize=contain&quality=82` : url);

function Shot({ l, stage, w }: { l: Look; stage: Shot; w: number }) {
  const m = lead(l, stage);
  return m ? <img src={small(m.url, w)} alt="" /> : null;
}

/**
 * One collection on one A4 page. Three bands, three registers:
 * the idea (poetic), three alternatives side by side (the reading of each), and how it is made (pragmatic).
 * The text size is fitted so the page is always full and never spills.
 */
export function Sheet({ c, n }: { c: Collection; n: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const f = () => setZoom(Math.min(1.25, el.clientWidth / A4_PX));
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = page.current; if (!el) return;
    const fit = () => {
      let lo = 0.6, hi = 1.5;
      for (let i = 0; i < 9; i++) {
        const k = (lo + hi) / 2;
        el.style.setProperty('--k', String(k));
        if (el.scrollHeight > el.clientHeight + 1) hi = k; else lo = k;
      }
      el.style.setProperty('--k', String(lo));
    };
    fit(); document.fonts?.ready.then(fit);
  }, [c]);

  const words = plain(c.name).split(/\s+/);
  const last = words.length > 1 ? words.pop() : '';
  const d = new Date(c.published_at || c.created_at);
  const accent = accentOf(c);
  return (
    <div className="sheet-wrap" ref={wrap}>
      <article className="sheet" ref={page} style={{ zoom, ['--accent' as string]: accent }}>
        <i className="sh-fold" aria-hidden="true" />
        <header className="sh-run">
          <span>מסלול · כתבה {two(n)}</span>
          <span>אופנה מתוך השראה · {MONTHS[d.getMonth()]} {d.getFullYear()}</span>
        </header>

        <section className="sh-idea">
          <div className="sh-title">
            <span className="sh-note">התובנה</span>
            <h2>{words.join(' ')}{last && <b>{last}</b>}</h2>
            <p className="sh-ins"><Rich t={c.insight} /></p>
            <div className="sh-manif">{c.manifesto.map((m) => <p key={m}>{plain(m)}</p>)}</div>
          </div>
          <div className="sh-poem">
            <span className="sh-note">שיר ופרשנות</span>
            <div className="sh-haiku">{c.haiku.map((h) => <span key={h}>{bare(h)}</span>)}</div>
            <p><Rich t={c.reading} /></p>
          </div>
        </section>

        <section className="sh-three" aria-label="שלוש חלופות">
          {c.looks.map((l) => {
            const img = primary(l, 'image');
            return (
              <figure key={l.id}>
                {img ? <img src={small(img.url, 900)} alt={plain(l.name)} /> : <SilkStill {...WHITE} gloss={glossOf(l.n)} seed={l.n} alt={`${plain(l.name)}: משי לבן, ממתין לצילום`} />}
                <figcaption><b>{two(l.n)}</b><span>{plain(l.name)}</span></figcaption>
              </figure>
            );
          })}
        </section>

        <section className="sh-looks">
          {c.looks.map((l) => (
            <div key={l.id} className="sh-look">
              <span className="sh-note">חלופה {two(l.n)}</span>
              <p className="sh-distill"><Rich t={l.distill} /></p>
              <div className="sh-pair">
                <div className="sh-haiku">{l.haiku.map((h) => <span key={h}>{bare(h)}</span>)}</div>
                <div className="sh-way"><Shot l={l} stage="sketch" w={300} /><Shot l={l} stage="model" w={300} /></div>
              </div>
              <p><Rich t={l.reading} /></p>
              <dl>
                <dt>בד וגזרה</dt><dd>{l.garment.text}</dd>
                <dt>מקום</dt><dd>{l.place_he} <span className="en">{l.place_en}</span></dd>
              </dl>
            </div>
          ))}
        </section>

        <section className="sh-make">
          <div className="sh-sign">
            <span className="sh-note">מהבד אל הגוף</span>
            {c.signature.name && <h3>{plain(c.signature.name)}</h3>}
            <p><Rich t={c.signature.text} /></p>
            <ul className="sh-pal">{c.palette.map((p, i) => <li key={p.hex + i}><i style={{ background: p.hex }} />{p.name}{i === 4 && <em>הצבע הנסתר</em>}</li>)}</ul>
          </div>
          <ol className="sh-rules">
            {c.principles.map((p) => <li key={p.title}><b>{plain(p.title)}</b><Rich t={p.text} /></li>)}
          </ol>
          <div className="sh-set">
            <span className="sh-note">התפאורה</span>
            {c.set_design.concept && <h3>{plain(c.set_design.concept)}</h3>}
            <p><Rich t={c.set_design.text} /></p>
            {c.set_design.place_he && <p className="sh-place">{c.set_design.place_he} <span className="en">{c.set_design.place_en}</span></p>}
          </div>
        </section>

        <footer className="sh-run">
          <span>אד׳ ענת שטיבלמן · A&amp;I</span>
          <span>התמונות: הדמיה · הקטנות: סקיצה ומודל</span>
          <span className="en">meatsevetofna-gh.vercel.app</span>
        </footer>
      </article>
    </div>
  );
}

export function Articles({ id }: { id?: string }) {
  const [list, setList] = useState<Collection[] | null>(null);
  useEffect(() => { listCollections().then(setList); }, []);
  const arts = (list ?? []).filter(isArticle).reverse(); // oldest first, so an article keeps its number
  const waiting = (list ?? []).filter((c) => !isArticle(c));
  useEffect(() => { if (id && list) document.getElementById(`a-${id}`)?.scrollIntoView(); }, [id, list]);
  useEffect(() => {
    const done = () => { document.body.classList.remove('print-one'); document.querySelectorAll('.art.only').forEach((e) => e.classList.remove('only')); };
    addEventListener('afterprint', done); return () => removeEventListener('afterprint', done);
  }, []);
  const print = (cid?: string) => {
    if (cid) { document.body.classList.add('print-one'); document.getElementById(`a-${cid}`)?.classList.add('only'); }
    window.print();
  };

  return (
    <main className="arts">
      <header className="arts-head">
        <div>
          <p className="kicker dark">כתבות · עמוד A4 לכל קולקציה</p>
          <h1>כל קולקציה היא <mark>טיעון</mark> שנאמר בשלוש דרכים.</h1>
          <p className="lede">התובנה, השיר והפרשנות שלו, שלוש החלופות זו לצד זו, והדרך מהבד אל הגוף. כל כתבה בעמוד אחד, מוכנה להדפסה.</p>
        </div>
        {arts.length > 0 && <button className="dot" onClick={() => print()}><i aria-hidden="true" />הדפסת כל הכתבות</button>}
      </header>

      <nav className="arts-rail" aria-label="רשימת הכתבות">
        <ol>
          {arts.map((c, i) => (
            <li key={c.id}><a href={`#/articles/${c.id}`} style={{ ['--accent' as string]: accentOf(c) }}><b>{two(i + 1)}</b><span>{plain(c.name)}</span></a></li>
          ))}
        </ol>
        {waiting.length > 0 && (
          <p className="arts-wait"><b>{waiting.length}</b> קולקציות יהפכו לכתבה כשלכל לוק תהיה תמונה: {waiting.map((c) => plain(c.name)).join(', ')}.</p>
        )}
        <p className="arts-wait">כתבה חדשה נוספת לבד, כאן ובמגזין חוט.</p>
      </nav>

      <div className="arts-list">
        {list === null && <p className="empty">הכתבות נטענות</p>}
        {list !== null && arts.length === 0 && <p className="empty">עוד אין כתבה. קולקציה הופכת לכתבה כשלכל לוק יש תמונה.</p>}
        {arts.map((c, i) => (
          <section className="art" id={`a-${c.id}`} key={c.id}>
            <Sheet c={c} n={i + 1} />
            <div className="art-actions">
              <button className="btn" onClick={() => print(c.id)}>הדפסה או שמירה כ-PDF</button>
              <a className="btn" href={`#/show/${c.id}`}>לתצוגה</a>
              <a className="btn" href={`#/studio/${c.id}`}>לעריכה בסטודיו</a>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
