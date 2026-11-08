// בדיקת קצה לקצה: דפים, סרגל, לוגו, גלילה אופקית, חפיפות, וסרטון מסלול שנוצר בדפדפן.
// Supabase מדומה (הסביבה לא מגיעה ל-supabase.co): REST מחזיר את הקולקציה, והפונקציה מחזירה כתובת העלאה.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const seed = require('../src/data/seed.json');
const stages = require('../src/data/stages.json');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const ID = '0f1e2d3c-0000-4000-8000-000000000001';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'עבר' : 'נכשל'}: ${m}`); if (!c) fails++; };

(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  // stand-in photographs (the cloud environment cannot reach fal or Midjourney)
  const shots = [];
  {
    const p = await browser.newPage({ viewport: { width: 640, height: 640 } });
    const bgs = [['#cfc4b2', '#8d8170', '#F3E6D2', '#5E1F24'], ['#b9a68b', '#6d5d48', '#D8C3A0', '#B5523B'], ['#8b8f99', '#2c2f38', '#efe4ea', '#d9c9c2']];
    for (const [w1, w2, dress, accent] of bgs) {
      await p.setContent(`<body style="margin:0"><svg width="640" height="640" viewBox="0 0 640 640"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w1}"/><stop offset="1" stop-color="${w2}"/></linearGradient><radialGradient id="l" cx=".7" cy=".2" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="640" height="640" fill="url(#g)"/><rect width="640" height="640" fill="url(#l)"/><ellipse cx="320" cy="150" rx="34" ry="42" fill="#6b4f3f"/><path d="M280 200 Q320 185 360 200 L380 300 L260 300 Z" fill="${dress}"/><path d="M262 300 Q230 470 200 590 L440 590 Q410 470 378 300 Z" fill="${dress}"/><path d="M320 360 L300 590 L340 590 Z" fill="${accent}"/><ellipse cx="320" cy="600" rx="150" ry="14" fill="#000" opacity=".18"/></svg></body>`);
      shots.push(await p.screenshot());
    }
    await p.close();
  }
  const S = 'https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/object/public/mo-media/test/';
  const look = (l, i) => ({ id: `00000000-0000-4000-8000-00000000010${l.n}`, collection_id: ID, n: l.n, name: l.name, distill: l.distill, haiku: l.haiku, reading: l.reading,
    garment: { text: l.garment }, model: l.model, place_he: l.place_he, place_en: l.place_en, light: l.light, camera: l.camera,
    prompt_he: l.prompt_he, prompt_en: l.prompt_en, motion_en: l.motion_en, stage: i < 2 ? 'editorial' : 'prompt', prompts: stages[l.n],
    media: i < 2 ? [{ id: `00000000-0000-4000-8000-00000000020${l.n}`, look_id: `00000000-0000-4000-8000-00000000010${l.n}`, kind: 'image', source: i ? 'draft' : 'mj', stage: 'editorial', url: `${S}look${l.n}.png`, is_primary: true, created_at: '2026-11-08T10:00:00Z' }] : [] });
  const row = { id: ID, created_at: '2026-11-08', updated_at: '2026-11-08', status: 'published', name: seed.name, insight: seed.insight, manifesto: seed.manifesto,
    haiku: seed.haiku, reading: seed.reading, signature: seed.signature, principles: seed.principles, palette: seed.palette, set_design: seed.set, looks: seed.looks.map(look) };
  const uploads = [];
  const moves = [];
  async function mock(ctx) {
    await ctx.route('**/appofapp-gh.vercel.app/ai-menu.js', (r) => r.fulfill({ path: path.join(__dirname, 'ai-menu.local.js'), contentType: 'application/javascript' }));
    await ctx.route('**/rest/v1/mo_collections*', (r) => r.fulfill({ json: [row] }));
    await ctx.route('**/rest/v1/mo_links*', (r) => r.fulfill({ json: [] }));
    await ctx.route('**/storage/v1/object/public/mo-media/**', (r) => { const n = Number((r.request().url().match(/look(\d)/) || [0, 1])[1]); r.fulfill({ body: shots[(n - 1) % 3], contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }); });
    await ctx.route('**/storage/v1/object/upload/sign/**', (r) => { uploads.push(r.request().postDataBuffer()?.length ?? 0); r.fulfill({ json: { Key: 'x' }, headers: { 'Access-Control-Allow-Origin': '*' } }); });
    await ctx.route('**/functions/v1/mo-media', async (r) => {
      const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: H });
      const b = JSON.parse(r.request().postData() || '{}'); moves.push(b);
      return r.fulfill({ json: { media: { id: b.media_id, look_id: b.look_id, stage: b.stage, kind: 'image', is_primary: true } }, headers: H });
    });
    await ctx.route('**/functions/v1/mo-studio', async (r) => {
      const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: H });
      const b = JSON.parse(r.request().postData() || '{}');
      if (b.action === 'status') return r.fulfill({ json: { locked: false, ok: true, drafts: true }, headers: H });
      if (b.action === 'sign') return r.fulfill({ json: { signedUrl: 'https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/object/upload/sign/mo-media/c/x?token=t', url: `${S}c/film.webm`, path: 'c/film.webm' }, headers: H });
      if (b.action === 'add_media') return r.fulfill({ json: { media: { id: '00000000-0000-4000-8000-000000000999', look_id: b.look_id, kind: b.kind, source: b.source, url: b.url, is_primary: true, created_at: new Date().toISOString() } }, headers: H });
      return r.fulfill({ json: { ok: true }, headers: H });
    });
  }
  const B = 'http://localhost:4173/';
  for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await mock(ctx);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    for (const [hash, name] of [['#/', 'home'], [`#/show/${ID}`, 'show'], [`#/show/${ID}/1`, 'show-look'], [`#/show/${ID}/3`, 'show-empty'], [`#/show/${ID}/4`, 'show-finale'], ['#/studio', 'studio'], [`#/studio/${ID}`, 'editor'], ['#/sets', 'sets']]) {
      await page.goto(B + hash); await page.waitForTimeout(name.startsWith('show') ? 5200 : 3500);
      await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
      const hs = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(hs <= 1, `${tag} ${name}: בלי גלילה אופקית (${hs})`);
      if (name === 'home') {
        ok(await page.locator('ai-menu .logo').isVisible(), `${tag}: כפתור הלוגו A&I בסרגל`);
        ok(!(await page.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), `${tag}: אין כפתורי פיתוח חופשיים בסרגל`);
      }
      const text = await page.evaluate(() => document.body.innerText);
      ok(!/יעל|קלו מור|מאיפה את מתחילה|שמלת נפש/.test(text), `${tag} ${name}: אין רמז למקור ההשראה`);
    }
    if (tag === 'desk') {
      await page.goto(B + `#/studio/${ID}`); await page.waitForTimeout(1200);
      const fb = page.locator('.cell-film .cell-act button', { hasText: 'יצירה' }).first(); console.log('film btn', await fb.count(), await fb.isEnabled().catch(()=>'x')); await fb.click(); await page.waitForTimeout(1500); console.log('busy', await page.locator('.busy-line').first().textContent().catch(()=>'none'), await page.locator('.saved').textContent());
      await page.waitForTimeout(4200);
      await page.screenshot({ path: path.join(OUT, 'desk-film-progress.png') });
      await page.waitForFunction(() => !document.querySelector('.busy-line'), null, { timeout: 20000 }).catch(() => {});
      ok(uploads.length > 0 && uploads[0] > 20000, `סרטון מסלול נוצר והועלה (${uploads[0] ?? 0} בתים)`);
      const kind = await page.evaluate(() => [...document.querySelectorAll('.lane video')].map((v) => v.getAttribute('src')).join(' ')); console.log('videos:', kind, await page.locator('.saved').textContent());
      ok(kind.includes('film'), 'הסרטון מוצג בכרטיס הלוק');
      // no frames: no element in the studio draws a box border or a card shadow
      const framed = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => { const c = getComputedStyle(e); if (e.offsetParent === null || c.opacity === '0' || e.type === 'file' || e.type === 'color') return false; return (parseFloat(c.borderTopWidth) > 0 && c.borderTopStyle !== 'none' && parseFloat(c.borderLeftWidth) > 0) || /rgba\(0, 0, 0, 0\.0[5-9]\).*px \d+px/.test(c.boxShadow); }).map((e) => e.tagName + '.' + e.className).slice(0, 5));
      ok(framed.length === 0, `בלי מסגרות בסטודיו ${framed.join(', ')}`);
      // drag the magazine image of look 1 onto its model cell
      const lane = page.locator('.lane').first();
      await lane.locator('.cell-editorial .cell-media img').dragTo(lane.locator('.cell-model .cell-media'));
      await page.waitForTimeout(800);
      ok(moves.some((m) => m.action === 'move' && m.stage === 'model'), `גרירה בין שלבים נשלחה לשרת (${JSON.stringify(moves[0] || {})})`);
      ok(await lane.locator('.cell-model .cell-media img').count() === 1 && await lane.locator('.cell-editorial .cell-media img').count() === 0, 'התמונה עברה למשבצת המודל ויצאה מהמגזין');
      console.log('editorial after move:', await lane.locator('.cell-editorial .cell-media img').count(), 'model:', await lane.locator('.cell-model .cell-media img').count()); await page.screenshot({ path: path.join(OUT, 'desk-drag.png') });
      await page.locator('.more').first().click(); await page.waitForTimeout(600);
      ok((await page.locator('.syl.ok').count()) >= 3, `מונה הברות לכל שורת הייקו (${await page.locator('.syl').count()})`);
    }
    ok(errs.length === 0, `${tag}: בלי שגיאות JS ${errs.join(' | ')}`);
    await ctx.close();
  }
  await browser.close(); srv.kill();
  console.log(fails ? `${fails} כשלים` : 'הכול ירוק');
  process.exit(fails ? 1 : 0);
})();
