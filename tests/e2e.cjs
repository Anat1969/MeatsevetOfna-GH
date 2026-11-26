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
    media: i < 2 ? [...(i === 1 ? [{ id: '00000000-0000-4000-8000-000000000302', look_id: `00000000-0000-4000-8000-00000000010${l.n}`, kind: 'image', source: 'mj', stage: 'editorial', url: `${S}look3.png`, is_primary: false, created_at: '2026-11-08T09:00:00Z' }] : []), { id: `00000000-0000-4000-8000-00000000020${l.n}`, look_id: `00000000-0000-4000-8000-00000000010${l.n}`, kind: 'image', source: i ? 'draft' : 'mj', stage: 'editorial', url: `${S}look${l.n}.png`, is_primary: true, created_at: '2026-11-08T10:00:00Z' }] : [] });
  const row = { id: ID, created_at: '2026-11-08', updated_at: '2026-11-08', status: 'published', name: seed.name, insight: seed.insight, manifesto: seed.manifesto,
    haiku: seed.haiku, reading: seed.reading, signature: seed.signature, principles: seed.principles, palette: seed.palette, set_design: seed.set, looks: seed.looks.map(look) };
  const uploads = [];
  const moves = [];
  // the real <ai-menu> when a local copy exists (tests/ai-menu.local.js), otherwise a minimal stand-in, so the test never depends on the network
  const AI_MENU = path.join(__dirname, 'ai-menu.local.js');
  const AI_MENU_STUB = "if(!customElements.get('ai-menu'))customElements.define('ai-menu',class extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'}).innerHTML=\"<button class='logo' title=\\\"אד' ענת שטיבלמן A&I\\\" style='width:44px;height:44px'>A&amp;I</button>\";this.items=[];this.status=''}})";
  async function mock(ctx) {
    await ctx.route('**/appofapp-gh.vercel.app/ai-menu.js', (r) => (fs.existsSync(AI_MENU) ? r.fulfill({ path: AI_MENU, contentType: 'application/javascript' }) : r.fulfill({ body: AI_MENU_STUB, contentType: 'application/javascript' })));
    await ctx.route('**/rest/v1/mo_collections*', (r) => r.fulfill({ json: [row] }));
    await ctx.route('**/rest/v1/mo_links*', (r) => r.fulfill({ json: [] }));
    await ctx.route('**/storage/v1/object/public/mo-media/**', (r) => { const n = Number((r.request().url().match(/look(\d)/) || [0, 1])[1]); r.fulfill({ body: shots[(n - 1) % 3], contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }); });
    await ctx.route('**/storage/v1/render/image/public/mo-media/**', (r) => { const n = Number((r.request().url().match(/look(\d)/) || [0, 1])[1]); r.fulfill({ body: shots[(n - 1) % 3], contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }); });
    await ctx.route('**/storage/v1/object/upload/sign/**', (r) => { uploads.push(r.request().postDataBuffer()?.length ?? 0); r.fulfill({ json: { Key: 'x' }, headers: { 'Access-Control-Allow-Origin': '*' } }); });
    await ctx.route('**/functions/v1/mo-media', async (r) => {
      const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: H });
      const b = JSON.parse(r.request().postData() || '{}'); moves.push(b);
      if (b.action === 'soundtrack') return r.fulfill({ json: { soundtrack: b.patch }, headers: H });
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
    for (const [hash, name] of [['#/', 'home'], [`#/show/${ID}`, 'show'], [`#/show/${ID}/1`, 'show-look'], [`#/show/${ID}/3`, 'show-empty'], [`#/show/${ID}/4`, 'show-finale'], ['#/studio', 'studio'], [`#/studio/${ID}`, 'editor'], ['#/sets', 'sets'], ['#/fit', 'fit']]) {
      await page.goto(B + hash); await page.waitForTimeout(name.startsWith('show') ? 5200 : 3500);
      await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
      const hs = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(hs <= 1, `${tag} ${name}: בלי גלילה אופקית (${hs})`);
      if (name === 'home') {
        ok(await page.locator('ai-menu .logo').isVisible(), `${tag}: כפתור הלוגו A&I בסרגל`);
        ok(!(await page.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), `${tag}: אין כפתורי פיתוח חופשיים בסרגל`);
      }
      const text = await page.evaluate(() => document.body.innerText);
      ok(!/יעל|קלו מור|מאיפה את מתחילה|שמלת נפש|אהרן בס|עלית כבר, בן אדם/.test(text), `${tag} ${name}: אין רמז למקור ההשראה`);
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
      const framed = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => { const c = getComputedStyle(e); if (e.offsetParent === null || c.opacity === '0' || e.type === 'file' || e.type === 'color' || e.closest('.play')) return false; return (parseFloat(c.borderTopWidth) > 0 && c.borderTopStyle !== 'none' && parseFloat(c.borderLeftWidth) > 0) || /rgba\(0, 0, 0, 0\.0[5-9]\).*px \d+px/.test(c.boxShadow); }).map((e) => e.tagName + '.' + e.className).slice(0, 5));
      ok(framed.length === 0, `בלי מסגרות בסטודיו ${framed.join(', ')}`);
      // the play mark cycles the images of a stage every 4 seconds
      const lane2 = page.locator('.lane').nth(1);
      const before = await lane2.locator('.cell-editorial .cell-media img').getAttribute('src');
      await lane2.locator('.cell-editorial .play').click();
      await page.waitForTimeout(1000);
      const after = await lane2.locator('.cell-editorial .cell-media img').getAttribute('src');
      await page.waitForTimeout(4200);
      const later = await lane2.locator('.cell-editorial .cell-media img').getAttribute('src');
      ok(before !== after && later === before, `סימן ה-play מחליף תמונות כל 4 שניות (${before?.slice(-9)} ← ${after?.slice(-9)} ← ${later?.slice(-9)})`);
      await lane2.locator('.cell-editorial .play').click();
      const tw = await lane2.locator('.cell-editorial .cell-tray span').first().evaluate((e) => e.getBoundingClientRect().width).catch(() => 0);
      ok(tw >= 70, `התמונות הקטנות בסטודיו גדלו (${tw}px)`);
      const bg = await page.locator('.cell .link').first().evaluate((e) => getComputedStyle(e).backgroundColor);
      ok(bg !== 'rgba(0, 0, 0, 0)', `כפתורים על רקע אפור (${bg})`);
      // drag the magazine image of look 1 onto its model cell
      const lane = page.locator('.lane').first();
      await lane.locator('.cell-editorial .cell-media img').dragTo(lane.locator('.cell-model .cell-media'));
      await page.waitForTimeout(800);
      ok(moves.some((m) => m.action === 'move' && m.stage === 'model'), `גרירה בין שלבים נשלחה לשרת (${JSON.stringify(moves[0] || {})})`);
      ok(await lane.locator('.cell-model .cell-media img').count() === 1 && await lane.locator('.cell-editorial .cell-media img').count() === 0, 'התמונה עברה למשבצת המודל ויצאה מהמגזין');
      console.log('editorial after move:', await lane.locator('.cell-editorial .cell-media img').count(), 'model:', await lane.locator('.cell-model .cell-media img').count()); await page.screenshot({ path: path.join(OUT, 'desk-drag.png') });
      // a song returns from Partitura and the soundtrack tab opens
      await page.goto(B + `#/studio/${ID}?suno=${encodeURIComponent('https://suno.com/song/abc')}&song=s1&title=T`); await page.waitForTimeout(2500);
      ok(moves.some((m) => m.action === 'soundtrack' && m.patch?.suno_url === 'https://suno.com/song/abc'), 'שיר שחזר מפרטיטורה נשמר בקולקציה');
      ok(!page.url().includes('suno='), 'הכתובת נוקתה אחרי הקליטה');
      await page.getByRole('tab', { name: 'פס קול' }).click();
      const brief = await page.locator('.sound textarea').inputValue();
      ok(brief.length > 80 && !/יעל|קלו מור|מאיפה את מתחילה|שמלת נפש/.test(brief), 'התדריך לפס הקול נכתב מהקולקציה ובלי רמז למקור');
      await page.evaluate(() => { window.open = (u) => { window.__opened = String(u); return null; }; });
      await page.locator('.sound-brief .dot').click();
      const opened = await page.evaluate(() => window.__opened || '');
      ok(/[?&]key=[0-9a-f]{40}/.test(opened) && moves.some((m) => m.action === 'soundtrack' && /^[0-9a-f]{40}$/.test(m.patch?.handoff || '')), 'הקישור לפרטיטורה נושא מפתח חד־פעמי, והמפתח נשמר');
      ok(/^https:\/\/musicprompt-gh\.vercel\.app\/#\/create\?brief=.*&back=/.test(opened), `הכפתור פותח את פרטיטורה עם התדריך (${opened.slice(0, 60)})`);
      await page.screenshot({ path: path.join(OUT, 'desk-sound.png') });
    }
    // מדידה: a look with a magazine photo, her photo uploaded, one call to mo-fit, the result on the stage
    {
      const sent = []; let hf = 0;
      await page.route(/hf\.space|huggingface\.co/, (r) => { hf++; r.abort(); });
      await page.route('**/functions/v1/mo-fit', async (r) => { sent.push(JSON.parse(r.request().postData() || '{}')); await new Promise((d) => setTimeout(d, 300)); r.fulfill({ json: { url: 'https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/object/public/mo-media/test/look3-fit.png' }, headers: { 'Access-Control-Allow-Origin': '*' } }); });
      await page.goto(B + '#/fit'); await page.waitForSelector('.fit-looks button');
      ok(await page.locator('.fit-head h1').innerText().then((t) => /נשים אמיתיות/.test(t)), `${tag} מדידה: החזון בכותרת`);
      ok(await page.locator('.dot:has-text("מדידה")').isDisabled(), `${tag} מדידה: הכפתור סגור עד שיש צילום`);
      await page.locator('.fit-looks button').nth(1).click();
      await page.locator('.fit-src input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: shots[0] });
      await page.waitForSelector('.fit-pair img[alt="הצילום שלך"]');
      await page.locator('.dot:has-text("מדידה")').click();
      await page.waitForSelector('.fit-out img[alt^="את בלוק"]', { timeout: 8000 });
      const b = sent[0] || {};
      ok(sent.length === 1 && /^data:image\/jpeg;base64,/.test(b.photo || '') && /mo-media/.test(b.garment_url || '') && b.framing === 'body' && hf === 0, `${tag} מדידה: הכול עובר דרך השרת (המרחב החינמי רץ שם), צילום מוקטן וצילום המגזין של הלוק נשלחים פעם אחת`);
      ok(/#\/fit\/[0-9a-f-]+\/\d/.test(page.url()), `${tag} מדידה: הלוק שנבחר נשמר בכתובת`);
      ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, `${tag} מדידה: בלי גלילה אופקית אחרי התוצאה`);
      await page.screenshot({ path: path.join(OUT, `${tag}-fit-result.png`) });
      // no image credit on the server: the free bridge opens with the same instruction, and a result uploaded by hand lands on the stage
      await page.unroute('**/functions/v1/mo-fit');
      await page.route('**/functions/v1/mo-fit', (r) => r.fulfill({ status: 502, json: { error: 'המדידה לא רצה כרגע: המכסה החינמית של Gemini לתמונות נגמרה, והיתרה ב-fal נגמרה.' }, headers: { 'Access-Control-Allow-Origin': '*' } }));
      await page.locator('.dot:has-text("מדידה")').click();
      await page.waitForSelector('.fit-bridge[open]');
      ok(/real woman/.test(await page.locator('.fit-order').inputValue()) && /מכסה/.test(await page.locator('.fit-steps .saved').first().innerText()), `${tag} מדידה: כשאין קרדיט, הסיבה כתובה והגשר ל-Gemini נפתח עם ההוראה`);
      await page.locator('.fit-bridge input[type=file]').setInputFiles({ name: 'gemini.png', mimeType: 'image/png', buffer: shots[2] });
      await page.waitForFunction(() => /^data:image\/jpeg/.test(document.querySelector('.fit-out img')?.getAttribute('src') || ''));
      ok(true, `${tag} מדידה: התוצאה מ-Gemini עולה לבמה`);
      ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, `${tag} מדידה: בלי גלילה אופקית עם הגשר`);
      await page.screenshot({ path: path.join(OUT, `${tag}-fit-bridge.png`) });
    }
    ok(errs.length === 0, `${tag}: בלי שגיאות JS ${errs.join(' | ')}`);
    await ctx.close();
  }
  // the show with a soundtrack: a curtain, and shots timed by the song (30 s: opening 4.5 s, each look 6.5 s)
  {
    const wav = (() => { const n = 8000 * 30, b = Buffer.alloc(44 + n, 128); b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40); return b; })();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await mock(ctx);
    const sRow = { ...row, soundtrack: { title: 'פס', audio_url: `${S}c/${ID}/soundtrack-1.wav`, duration: 30 } };
    await ctx.route('**/rest/v1/mo_collections*', (r) => r.fulfill({ json: [sRow] }));
    await ctx.route('**/soundtrack-1.wav', (r) => r.fulfill({ body: wav, contentType: 'audio/wav', headers: { 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' } }));
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(B + `#/show/${ID}`); await page.waitForTimeout(2500);
    ok(await page.locator('.curtain').isVisible(), 'תצוגה עם פס קול נפתחת במסך כניסה');
    ok(/30 שניות/.test(await page.locator('.curtain').innerText()), 'מסך הכניסה יודע את אורך השיר');
    await page.screenshot({ path: path.join(OUT, 'desk-curtain.png') });
    await page.locator('.curtain-in').click(); await page.waitForTimeout(800);
    ok(!(await page.locator('.curtain').count()), 'הכניסה פותחת את התצוגה');
    const playing = await page.evaluate(() => { const a = document.querySelector('audio'); return a && !a.paused; });
    ok(playing, 'השיר מתנגן מהכניסה');
    await page.waitForTimeout(4600);
    ok(await page.locator('.programme button.on .num').innerText() === '01', 'אחרי הפתיחה (15% מהשיר) עולה לוק 01');
    const t0 = await page.evaluate(() => document.querySelector('audio').currentTime);
    const t1 = await page.evaluate(() => new Promise((ok) => { document.querySelectorAll('.programme button')[3].click(); requestAnimationFrame(() => setTimeout(() => ok(document.querySelector('audio').currentTime), 0)); }));
    const t = t1; void t0; // the headless audio clock runs faster than real time, so read it right after the click
    ok(t >= 17.4 && t < 20.5, `מעבר ידני ללוק 03 מזיז את השיר לנקודה שלו (${t.toFixed(1)} שניות)`);
    ok(/המוזיקה מתנגנת/.test(await page.locator('.programme .state').nth(1).innerText()) && await page.locator('.programme .state.is-on').count() === 2, 'שני עיגולים שחורים: התצוגה בתנועה והמוזיקה מתנגנת');
    await page.screenshot({ path: path.join(OUT, 'desk-show-sound.png') });
    ok(errs.length === 0, `פס קול: בלי שגיאות JS ${errs.join(' | ')}`);
    await ctx.close();
  }
  // each look runs its whole making: sketch, model, magazine, film
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await mock(ctx);
    const L1 = '00000000-0000-4000-8000-000000000101';
    const extra = [['sketch', 'image', 'look2.png'], ['model', 'image', 'look3.png'], ['film', 'video', 'film.webm']].map(([stage, kind, f], j) => ({ id: `00000000-0000-4000-8000-00000000050${j}`, look_id: L1, kind, source: 'upload', stage, url: `${S}${f}`, is_primary: true, created_at: '2026-11-08T08:00:00Z' }));
    const rRow = { ...row, looks: row.looks.map((l, j) => (j === 0 ? { ...l, media: [...extra, ...l.media] } : l)) };
    await ctx.route('**/rest/v1/mo_collections*', (r) => r.fulfill({ json: [rRow] }));
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    // the page itself records every stage it shows, so a slow load cannot hide the first image
    await page.addInitScript(() => { window.__seen = []; const f = () => { const t = document.querySelector('.reel-tag span')?.textContent || ''; if (t && window.__seen[window.__seen.length - 1] !== t) window.__seen.push(t); }; new MutationObserver(f).observe(document, { subtree: true, childList: true, characterData: true }); });
    await page.goto(B + `#/show/${ID}/1`, { waitUntil: 'commit' }); await page.waitForSelector('.reel-tag span');
    ok(await page.locator('.reel-ticks i').count() === 4, 'סימון של כל התמונות של הלוק');
    await page.waitForTimeout(1000); await page.screenshot({ path: path.join(OUT, 'desk-reel-sketch.png') });
    await page.waitForTimeout(9000);
    const seen = await page.evaluate(() => window.__seen);
    ok(seen.join('>').startsWith('סקיצה>מודל>מגזין') && seen.some((x) => x.startsWith('סרטון')), `לוק במסלול עובר סקיצה, מודל, מגזין וסרטון (${seen.join(' > ')})`);
    ok(errs.length === 0, `רצף הלוק: בלי שגיאות JS ${errs.join(' | ')}`);
    await ctx.close();
  }
  // a private Suno song: no file, the show opens Suno and starts when she comes back
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await mock(ctx);
    const sRow = { ...row, soundtrack: { suno_url: 'https://suno.com/s/abc', suno_id: 'x', suno_duration: 200, suno_state: 'private' } };
    await ctx.route('**/rest/v1/mo_collections*', (r) => r.fulfill({ json: [sRow] }));
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(B + `#/show/${ID}`); await page.waitForTimeout(2500);
    ok(/Suno/.test(await page.locator('.curtain').innerText()), 'שיר פרטי: מסך הכניסה מסביר שהשיר נפתח ב-Suno');
    await page.evaluate(() => { window.open = (u) => { window.__opened = String(u); return null; }; });
    await page.locator('.curtain-in').click(); await page.waitForTimeout(300);
    ok(await page.evaluate(() => window.__opened) === 'https://suno.com/s/abc' && await page.locator('.curtain-wait').isVisible(), 'הכניסה פותחת את השיר ב-Suno ומחכה לחזרה');
    await page.waitForTimeout(800);
    await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(500);
    ok(!(await page.locator('.curtain').count()) && /התצוגה בתנועה/.test(await page.locator('.programme .state').first().innerText()), 'בחזרה מ-Suno התצוגה מתחילה, והעיגול השחור מראה שהיא בתנועה');
    await page.goto(B + `#/studio/${ID}?tab=sound`); await page.waitForTimeout(2500);
    ok(/פרטי/.test(await page.locator('.sound-state').innerText()), 'בסטודיו: הסבר שהשיר פרטי ומה עושים');
    ok(errs.length === 0, `Suno: בלי שגיאות JS ${errs.join(' | ')}`);
    await ctx.close();
  }
  // the song link: its own place in the sound tab, an explicit save, and a clear state once the song is connected
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await mock(ctx);
    await ctx.route('**/functions/v1/mo-media', async (r) => {
      const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: H });
      const b = JSON.parse(r.request().postData() || '{}'); moves.push(b);
      return r.fulfill({ json: { soundtrack: { ...b.patch, ...(b.patch.suno_url ? { suno_state: 'stream', audio_url: `${S}song.mp4`, duration: 200 } : {}) } }, headers: H });
    });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(B + `#/studio/${ID}?tab=sound`); await page.waitForTimeout(2500);
    const save = page.locator('.sound-link .dot');
    ok(await page.locator('.sound-link input').isVisible() && await save.isDisabled(), 'פס קול: מקום משלו לקישור לשיר, והשמירה מחכה לקישור');
    await page.locator('.sound-link input').fill('https://suno.com/s/abcDEF123'); await save.click(); await page.waitForTimeout(800);
    ok(moves.some((m) => m.action === 'soundtrack' && m.patch && m.patch.suno_url === 'https://suno.com/s/abcDEF123'), 'פס קול: "שמירת הקישור" שומרת את הקישור לקולקציה');
    ok(/השיר מחובר/.test(await page.locator('.sound-state').innerText()) && await page.locator('.sound-link a', { hasText: 'לתצוגה עם המוזיקה' }).isVisible(), 'פס קול: אחרי השמירה כתוב שהשיר מחובר, עם דרך לתצוגה');
    await page.screenshot({ path: path.join(OUT, 'desk-sound-link.png') });
    ok(errs.length === 0, `קישור לשיר: בלי שגיאות JS ${errs.join(' | ')}`);
    await ctx.close();
  }
  // articles: every collection whose looks all have a photograph is one A4 page, listed for reading and printing
  for (const [tag, vp] of [['מחשב', { width: 1440, height: 900 }], ['נייד', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    await mock(ctx);
    const full = { ...row, looks: row.looks.map((l) => (l.media.length ? l : { ...l, media: [{ id: '00000000-0000-4000-8000-000000000703', look_id: l.id, kind: 'image', source: 'mj', stage: 'editorial', url: `${S}look3.png`, is_primary: true, created_at: '2026-11-08T10:00:00Z' }] })) };
    const bare = { ...row, id: '0f1e2d3c-0000-4000-8000-000000000002', name: 'קולקציה בלי תמונות', looks: row.looks.map((l) => ({ ...l, media: [] })) };
    await ctx.route('**/rest/v1/mo_collections*', (r) => r.fulfill({ json: [bare, full] }));
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(B + '#/'); await page.waitForTimeout(800);
    await page.locator('.nav a', { hasText: 'כתבות' }).click(); await page.waitForTimeout(2500);
    ok(await page.locator('.sheet').count() === 1 && await page.locator('.arts-rail ol a').count() === 1, `${tag} כתבות: כתבה אחת לקולקציה שיש לה תמונה לכל לוק, ורשימה לצדה`);
    ok(/קולקציה בלי תמונות/.test(await page.locator('.arts-wait').first().innerText()), `${tag} כתבות: קולקציה בלי תמונות מחכה ולא מוצגת ככתבה`);
    const fit = await page.evaluate(() => { const s = document.querySelector('.sheet'); const r = s.getBoundingClientRect(); return { over: s.scrollHeight - s.clientHeight, ratio: r.height / r.width, k: Number(s.style.getPropertyValue('--k')), wide: r.width, vw: innerWidth }; });
    ok(fit.over <= 1 && Math.abs(fit.ratio - 297 / 210) < 0.01, `${tag} כתבות: העמוד ביחס A4 והטקסט לא גולש (גלישה ${fit.over}, גודל טקסט ${fit.k.toFixed(2)})`);
    ok(fit.k > 0.75, `${tag} כתבות: הטקסט קריא (${fit.k.toFixed(2)})`);
    ok(fit.wide <= fit.vw && await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${tag} כתבות: בלי גלילה אופקית`);
    ok(await page.locator('.sheet .sh-three img').count() === 3 && await page.evaluate(() => [...document.querySelectorAll('.sheet .sh-three img')].every((i) => i.naturalWidth > 0)), `${tag} כתבות: שלוש החלופות עם תמונה`);
    ok(await page.locator('.sheet .sh-haiku').count() === 4 && await page.locator('.sheet .sh-rules li').count() === 3, `${tag} כתבות: ארבעה שירים עם פרשנות, ושלושה עקרונות`);
    ok(await page.locator('ai-menu .logo').isVisible(), `${tag} כתבות: כפתור הלוגו A&I בסרגל`);
    ok(!/יעל|קלו מור|מאיפה את מתחילה|שמלת נפש/.test(await page.locator('main').innerText()), `${tag} כתבות: אין רמז למקור ההשראה`);
    await page.screenshot({ path: path.join(OUT, `${vp.width === 390 ? 'mobile' : 'desk'}-articles.png`) });
    if (vp.width === 1440) {
      const dlBtn = page.locator('.art-actions button', { hasText: 'הורדה' }).first();
      ok(/מסלול - .+\.pdf/.test(await dlBtn.innerText()), `כתבות: כפתור הורדה עם שם הקולקציה (${await dlBtn.innerText()})`);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), dlBtn.click()]);
      const file = path.join(OUT, 'article.pdf'); await dl.saveAs(file);
      const bytes = fs.readFileSync(file);
      ok(bytes.slice(0, 5).toString() === '%PDF-' && bytes.length > 50000 && (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length === 1, `כתבות: ההורדה היא קובץ PDF של עמוד אחד (${Math.round(bytes.length / 1024)} ק"ב)`);
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      ok(pages === 1, `כתבות: ההדפסה יוצאת עמוד A4 אחד לכתבה (${pages})`);
      await page.goto(B + `#/articles/${ID}`); await page.waitForTimeout(1500);
      ok(await page.locator(`#a-${ID} .sheet`).isVisible(), 'כתבות: לכל כתבה כתובת משלה');
    }
    ok(errs.length === 0, `${tag} כתבות: בלי שגיאות JS ${errs.join(' | ')}`);
    await ctx.close();
  }
  await browser.close(); srv.kill();
  console.log(fails ? `${fails} כשלים` : 'הכול ירוק');
  process.exit(fails ? 1 : 0);
})();
