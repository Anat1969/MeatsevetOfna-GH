import { useEffect, useState } from 'react';
import { KIND_COLOR, SEASONS } from '../data/sets2026';
import { listLinks, studio } from '../lib/api';
import type { LinkRow } from '../lib/types';
import { Rich } from '../lib/text';

const KINDS = Object.keys(KIND_COLOR) as (keyof typeof KIND_COLOR)[];

export function Sets() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [kind, setKind] = useState<string>('');
  const [form, setForm] = useState<LinkRow>({ season: 'סתיו-חורף 2026', house: '', city_he: '', city_en: '', idea: '', url: '' });
  const [msg, setMsg] = useState('');
  useEffect(() => { listLinks().then(setLinks); }, []);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await studio<{ link: LinkRow }>({ action: 'link', ...form }); setLinks((l) => [r.link, ...l]); setForm({ ...form, house: '', idea: '', url: '', city_he: '', city_en: '' }); setMsg('נשמר'); }
    catch (er) { setMsg((er as Error).message); }
  };
  return (
    <main className="sets">
      <header className="sets-head">
        <div>
          <p className="eyebrow">ארכיון השראה לתפאורה</p>
          <h1>ב-2026 <mark>התפאורה</mark> הפכה לסיפור עצמו.</h1>
          <p className="lede">מים, נוף, מבנה ושמיים: כל תצוגה בנתה עולם. לכל אחת, מה לקחת ממנה למסלול שלנו.</p>
        </div>
        <div className="legend-row" role="group" aria-label="סינון לפי חומר התפאורה">
          {KINDS.map((k) => (
            <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(kind === k ? '' : k)}><i style={{ background: KIND_COLOR[k] }} />{k}</button>
          ))}
          <button className={!kind ? 'on all' : 'all'} onClick={() => setKind('')}>הכול</button>
        </div>
      </header>

      {SEASONS.map((s) => (
        <section key={s.id} className="season">
          <h2>{s.title} <span className="en">{s.sub}</span></h2>
          <div className="set-grid">
            {s.entries.filter((e) => !kind || e.kind === kind).map((e) => (
              <article key={e.house + e.venue} className="set-card" style={{ ['--k' as string]: KIND_COLOR[e.kind] }}>
                {e.image && <img className="set-img" src={e.image} alt={`התפאורה של ${e.house}`} loading="lazy" onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
                <span className="kind">{e.kind}</span>
                <h3>{e.house}</h3>
                <p className="venue">{e.city_he} <span className="en">{e.city_en}</span>{e.venue !== e.city_en && <> · <span className="en">{e.venue}</span></>}</p>
                <p><Rich t={e.idea} /></p>
                <p className="lesson"><span>למסלול שלנו:</span><b>{e.lesson}</b></p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="season">
        <h2>קישורים ששמרתי</h2>
        <div className="set-grid">
          {links.map((l) => (
            <a key={l.id ?? l.url} className="set-card link" href={l.url} target="_blank" rel="noreferrer">
              <span className="kind">{l.season}</span>
              <h3>{l.house}</h3>
              {(l.city_he || l.city_en) && <p className="venue">{l.city_he} <span className="en">{l.city_en}</span></p>}
              <p>{l.idea}</p>
            </a>
          ))}
          <form className="set-card add" onSubmit={add}>
            <h3>קישור חדש</h3>
            <input className="fld" required placeholder="בית אופנה" value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value })} />
            <div className="two"><input className="fld" placeholder="עיר" value={form.city_he} onChange={(e) => setForm({ ...form, city_he: e.target.value })} /><input className="fld en" placeholder="City" value={form.city_en} onChange={(e) => setForm({ ...form, city_en: e.target.value })} /></div>
            <input className="fld" required placeholder="הרעיון במשפט" value={form.idea} onChange={(e) => setForm({ ...form, idea: e.target.value })} />
            <input className="fld en" required type="url" placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <select className="fld" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })}><option>סתיו-חורף 2026</option><option>אביב-קיץ 2026</option><option>Couture 2026</option><option>Resort 2026</option></select>
            <button className="btn dark sm" type="submit">שמירה</button>
            {msg && <span className="saved">{msg}</span>}
          </form>
        </div>
      </section>
      <p className="fine">התיאורים מסוכמים מכתבות שנבחרו כמקורות, ולא נבדקו מול הודעות המותגים.</p>
    </main>
  );
}
