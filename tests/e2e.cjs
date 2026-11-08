// בדיקת קצה לקצה: דפים, סרגל, לוגו, גלילה אופקית, חפיפות, וסרטון מסלול שנוצר בדפדפן.
// Supabase מדומה (הסביבה לא מגיעה ל-supabase.co): REST מחזיר את הקולקציה, והפונקציה מחזירה כתובת העלאה.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const seed = require('../src/data/seed.json');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const ID = '0f1e2d3c-0000-4000-8000-000000000001';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'עבר' : 'נכשל'}: ${m}`); if (!c) fails++; };

(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  let png;
  {
    const p = await browser.newPage({ viewport: { width: 600, height: 600 } });
    await p.setContent('<div style="width:600px;height:600px;background:linear-gradient(135deg,#F3E6D2,#B5523B 60%,#5E1F24)"></div>');
    png = await p.screenshot(); await p.close();
  }
  const content = JSON.parse(JSON.stringify(seed));
  content.looks[0].image_url = 'https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/object/public/mo-media/test/look1.png';
  const row = { id: ID, created_at: '2026-11-08', updated_at: '2026-11-08', status: 'published', content };
  const uploads = [];
  async function mock(ctx) {
    await ctx.route('**/appofapp-gh.vercel.app/ai-menu.js', (r) => r.fulfill({ path: path.join(__dirname, 'ai-menu.local.js'), contentType: 'application/javascript' }));
    await ctx.route('**/rest/v1/mo_collections*', (r) => r.fulfill({ json: [row] }));
    await ctx.route('**/rest/v1/mo_links*', (r) => r.fulfill({ json: [] }));
    await ctx.route('**/storage/v1/object/public/mo-media/**', (r) => r.fulfill({ body: png, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }));
    await ctx.route('**/storage/v1/object/upload/sign/**', (r) => { uploads.push(r.request().postDataBuffer()?.length ?? 0); r.fulfill({ json: { Key: 'x' }, headers: { 'Access-Control-Allow-Origin': '*' } }); });
    await ctx.route('**/functions/v1/mo-studio', async (r) => {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
      const b = JSON.parse(r.request().postData() || '{}');
      const H = { 'Access-Control-Allow-Origin': '*' };
      if (b.action === 'status') return r.fulfill({ json: { locked: false, ok: true }, headers: H });
      if (b.action === 'sign') return r.fulfill({ json: { signedUrl: 'https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/object/upload/sign/mo-media/c/x?token=t', url: 'https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/object/public/mo-media/c/film.webm' }, headers: H });
      return r.fulfill({ json: { collection: row, ok: true }, headers: H });
    });
  }
  const B = 'http://localhost:4173/';
  for (const [w, h, tag] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await mock(ctx);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    for (const [hash, name] of [['#/', 'home'], [`#/show/${ID}`, 'show'], [`#/show/${ID}/1`, 'show-look'], ['#/studio', 'studio'], [`#/studio/${ID}`, 'editor'], ['#/sets', 'sets']]) {
      await page.goto(B + hash); await page.waitForTimeout(name.startsWith('show') ? 3200 : 1200);
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
      await page.getByRole('button', { name: 'סרטון מסלול מהתמונה' }).first().click();
      await page.waitForTimeout(4200);
      await page.screenshot({ path: path.join(OUT, 'desk-film-progress.png') });
      await page.waitForFunction(() => !document.querySelector('.busy'), null, { timeout: 20000 }).catch(() => {});
      ok(uploads.length > 0 && uploads[0] > 20000, `סרטון מסלול נוצר והועלה (${uploads[0] ?? 0} בתים)`);
      const kind = await page.evaluate(() => document.querySelector('.look-card video')?.getAttribute('src') || '');
      ok(kind.includes('film'), 'הסרטון מוצג בכרטיס הלוק');
    }
    ok(errs.length === 0, `${tag}: בלי שגיאות JS ${errs.join(' | ')}`);
    await ctx.close();
  }
  await browser.close(); srv.kill();
  console.log(fails ? `${fails} כשלים` : 'הכול ירוק');
  process.exit(fails ? 1 : 0);
})();
