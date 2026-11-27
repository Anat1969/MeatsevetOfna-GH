import { useEffect, useMemo, useState } from 'react';
import { listCollections } from '../lib/api';
import { lead, primary, type Collection } from '../lib/types';
import { plain } from '../lib/text';
import { listSaved, listWomen, type Saved, type Woman as W } from '../lib/fitGallery';
import { go } from '../router';

// כרטיס אישה (ענת, 27.11.2026, ההמלצה שאושרה: "דף לכל אישה, כל המדידות שלה בכל הלוקים, והשוואה של לוקים זה לצד זה").
// הדף נבנה רק מהגלריה הפרטית שלה (אותו מפתח), לפי קולקציה ולוק. ההשוואה: עד שלוש מדידות זו לצד זו,
// ובפתיחה כבר נבחרת המדידה האחרונה של כל לוק שונה. לוקים שעוד לא נמדדו מופיעים בסוף, עם קישור ישיר למדידה שלה בהם.

const MAX = 3;
export const womanHref = (name: string) => `#/women/${encodeURIComponent(name)}`;

type Group = { collection: string; looks: { look: string; items: Saved[]; src?: string; to?: string }[] };

export function Woman({ name }: { name: string }) {
  const [women, setWomen] = useState<W[]>([]);
  const [fits, setFits] = useState<Saved[] | null>(null);
  const [cols, setCols] = useState<Collection[]>([]);
  const [pickd, setPickd] = useState<string[] | null>(null);
  useEffect(() => { listWomen().then(setWomen); listSaved().then(setFits); listCollections().then(setCols); }, []);

  const me = women.find((w) => w.name === name);
  const mine = useMemo(() => (fits ?? []).filter((f) => (f.woman ?? '') === name).sort((a, b) => b.at - a.at), [fits, name]);
  // the magazine photo of each look, to show what she was dressed in, and the fitting link for her in it
  const lookOf = useMemo(() => {
    const m = new Map<string, { src?: string; to: string }>();
    for (const c of cols) for (const l of c.looks) {
      const p = lead(l, 'editorial') ?? primary(l, 'image');
      m.set(`${plain(c.name)}|${plain(l.name)}`, { src: p?.url, to: `#/fit/${c.id}/${l.n}?w=${encodeURIComponent(name)}` });
    }
    return m;
  }, [cols, name]);
  const groups = useMemo<Group[]>(() => {
    const g = new Map<string, Map<string, Saved[]>>();
    for (const f of mine) {
      const c = f.collection || 'בלי קולקציה';
      if (!g.has(c)) g.set(c, new Map());
      const looks = g.get(c)!; looks.set(f.look || 'לוק', [...(looks.get(f.look || 'לוק') ?? []), f]);
    }
    return [...g].map(([collection, looks]) => ({ collection, looks: [...looks].map(([look, items]) => ({ look, items, ...lookOf.get(`${collection}|${look}`) })) }));
  }, [mine, lookOf]);
  // the looks she has not worn yet: the next fitting is one click away
  const notYet = useMemo(() => {
    const worn = new Set(mine.map((f) => `${f.collection}|${f.look}`));
    return cols.flatMap((c) => c.looks.map((l) => ({ c, l, key: `${plain(c.name)}|${plain(l.name)}`, src: (lead(l, 'editorial') ?? primary(l, 'image'))?.url })))
      .filter((x) => x.src && !worn.has(x.key));
  }, [cols, mine]);

  // compare: by default the latest fitting of each different look, up to three
  const auto = useMemo(() => { const seen = new Set<string>(); return mine.filter((f) => { const k = `${f.collection}|${f.look}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, MAX).map((f) => f.id); }, [mine]);
  const chosen = (pickd ?? auto).filter((id) => mine.some((f) => f.id === id));
  const toggle = (id: string) => setPickd(() => { const cur = chosen; return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-MAX); });
  const compare = chosen.map((id) => mine.find((f) => f.id === id)!).filter(Boolean);

  const nLooks = groups.reduce((n, g) => n + g.looks.length, 0);
  if (fits === null) return <main className="fit woman"><p className="hint">טוען את הכרטיס…</p></main>;
  return (
    <main className="fit woman">
      <header className="woman-head">
        {me ? <img src={me.url} alt={`הצילום של ${name}`} /> : <i className="fit-blank" aria-hidden="true" />}
        <div>
          <p className="eyebrow"><a href="#/fit" onClick={(e) => { e.preventDefault(); go('#/fit'); }}>מדידה</a> · כרטיס אישה</p>
          <h1>{name}</h1>
          <p className="lede">{mine.length ? `${mine.length === 1 ? 'מדידה אחת' : `${mine.length} מדידות`}, ${nLooks === 1 ? 'בלוק אחד' : `ב-${nLooks} לוקים`}.` : 'עוד אין לה מדידות.'}{!me && ' היא כבר לא בתיקייה, והמדידות שלה נשמרו.'}</p>
          {me && <a className="dot" href={`#/fit?w=${encodeURIComponent(name)}`}><i aria-hidden="true" />להלביש אותה</a>}
        </div>
      </header>

      {compare.length > 0 && (
        <section className="woman-compare" aria-label="השוואה">
          <h2>זה לצד זה <span className="num">{compare.length}</span></h2>
          <p className="fit-note">{compare.length < 2 ? 'בוחרים עוד מדידה למטה, כדי להשוות.' : 'עד שלוש מדידות. לחיצה על "להשוואה" מתחת לתמונה מוסיפה או מוציאה.'}</p>
          <div className={`woman-side n${compare.length}`}>
            {compare.map((f) => (
              <figure key={f.id}>
                <img src={f.url} alt={`${name} בלוק ${f.look}`} />
                <figcaption><b>{f.look}</b><span>{f.collection}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {groups.map((g) => (
        <section className="woman-col" key={g.collection} aria-label={g.collection}>
          <h2>{g.collection}</h2>
          {g.looks.map((l) => (
            <div className="woman-look" key={l.look}>
              <div className="woman-look-head">
                {l.src && <img src={l.src} alt="" />}
                <h3>{l.look} <span className="num">{l.items.length}</span></h3>
                {l.to && <a className="link" href={l.to}>מדידה נוספת בלוק הזה</a>}
              </div>
              <ul>
                {l.items.map((f) => (
                  <li key={f.id} className={chosen.includes(f.id) ? 'on' : ''}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" aria-label={`פתיחת המדידה ${f.look} בגודל מלא`}><img src={f.url} alt="" loading="lazy" /></a>
                    <button className="woman-pick" aria-pressed={chosen.includes(f.id)} onClick={() => toggle(f.id)}>{chosen.includes(f.id) ? 'בהשוואה' : 'להשוואה'}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      {notYet.length > 0 && (
        <section className="woman-next" aria-label="עוד לא נמדדה">
          <h2>עוד לא נמדדה <span className="num">{notYet.length}</span></h2>
          <ul>
            {notYet.slice(0, 12).map((x) => (
              <li key={x.key}><a href={`#/fit/${x.c.id}/${x.l.n}?w=${encodeURIComponent(name)}`}><img src={x.src} alt="" loading="lazy" /><span>{plain(x.l.name)}</span></a></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
