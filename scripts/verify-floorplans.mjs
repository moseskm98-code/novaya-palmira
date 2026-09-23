// Run against a running Hono server or the exported GitHub Pages site.
// PLAYWRIGHT_MODULE can point to a bundled Playwright index.mjs.
// CHROME_PATH can point to an installed Chrome executable.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.argv[2] || 'http://127.0.0.1:3012').replace(/\/$/, '');
const output = process.env.QA_OUTPUT || 'tmp/floorplan-browser-qa';
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile('qa/floorplans-2026-09-23/source-manifest.json', 'utf8'));
const byId = new Map(manifest.plans.map(plan => [plan.id, plan]));
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
const errors = [];
const routes = ['', '/upravlyayushchaya-kompaniya', '/zastroishchik', '/mansardy', '/kommercheskie-pomeshcheniya'];
const checkOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const active = page => page.locator('.plan-layout.is-active');
const planFromCard = async page => {
  const src = await active(page).locator('img').getAttribute('src');
  const id = src.split('/apartment-')[1].replace('.webp', '');
  const plan = byId.get(id);
  assert.ok(plan, `Unexpected plan: ${id}`);
  assert.equal(await active(page).locator('.plan-variant').textContent(), plan.variant);
  assert.equal((await active(page).locator('.plan-area').textContent()).replace('м²',''), plan.area);
  return plan;
};
try {
  const desktop = await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  desktop.on('pageerror', error => errors.push(error.message));
  for (const route of routes) {
    assert.equal((await desktop.goto(`${base}${route}/`)).status(), 200);
    await desktop.locator('.plan-image-button').first().waitFor();
    assert.equal(await desktop.getByRole('tab',{name:'Все',exact:true}).getAttribute('aria-selected'), 'true');
    assert.equal(await desktop.locator('.plan-layout').count(), 21);
    assert.ok(await checkOverflow(desktop), `Desktop overflow: ${route}`);
    assert.equal(await desktop.locator('.desktop-nav a').count(), 5);
  }
  await desktop.goto(`${base}/`);
  assert.ok(!(await desktop.locator('body').innerText()).includes('Дом, в котором продолжается забота'));
  assert.ok((await desktop.locator('body').innerText()).replace(/\s+/g,' ').includes('Посмотрите как живёт квартал'));
  assert.equal(await desktop.getByText('Визуализация',{exact:true}).count(),0);
  const seen = new Set();
  for (let i=0;i<21;i++) {
    const plan = await planFromCard(desktop);
    assert.ok(!seen.has(plan.id));seen.add(plan.id);
    await active(desktop).locator('.plan-image-button').click();
    assert.ok((await desktop.locator('#dialog-title').textContent()).includes(`${plan.area} м² · ${plan.variant}`));
    assert.ok((await desktop.locator('.dialog-plan').getAttribute('src')).endsWith(plan.asset.replace('public','')));
    const downloaded = desktop.waitForEvent('download');
    await desktop.getByRole('link',{name:'Скачать планировку'}).click();
    const file = await downloaded;
    assert.equal(file.suggestedFilename(),`Новая-Пальмира-${plan.id}.webp`);
    assert.equal(createHash('sha256').update(await readFile(await file.path())).digest('hex'),plan.sha256);
    await desktop.getByRole('dialog').getByRole('button',{name:'Узнать условия'}).click();
    const expected = `${plan.area} м² — ${plan.variant}`;
    assert.ok((await desktop.locator('.selected-request').textContent()).includes(expected));
    await desktop.locator('input[name=name]').fill('Проверка планировки');
    await desktop.locator('input[name=phone]').fill('+79990000000');
    await desktop.locator('input[name=consent]').check();
    await desktop.locator('form button[type=submit]').click();
    await desktop.locator('.message-preview').waitFor();
    assert.ok((await desktop.locator('.message-preview').textContent()).includes(expected));
    const url = await desktop.getByRole('link',{name:'Открыть WhatsApp',exact:true}).getAttribute('href');
    assert.ok(new URL(url).searchParams.get('text').includes(expected));
    // The external link is inspected only. No message is sent.
    await desktop.getByRole('button',{name:'Закрыть окно'}).click();
    await active(desktop).getByRole('button',{name:'Следующая планировка'}).click();
  }
  assert.equal(seen.size,21);
  for (const [label,key,count] of [['1-комнатные','1k',6],['Евроформат','e2',6],['2-комнатные','2k',6],['3-комнатные','3k',3],['Все',null,21]]) {
    await desktop.getByRole('tab',{name:label,exact:true}).click();
    assert.equal(await desktop.locator('.plan-layout').count(),count);
    for (const src of await desktop.locator('.plan-layout img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src')))) {
      const plan = byId.get(src.split('/apartment-')[1].replace('.webp',''));
      if(key)assert.equal(plan.category,key);
    }
  }
  await active(desktop).getByRole('button',{name:'Предыдущая планировка'}).click();
  assert.equal((await planFromCard(desktop)).id,'b4-t02-139-58');
  await desktop.getByRole('tab',{name:'Все',exact:true}).click();
  await desktop.locator('#plans').scrollIntoViewIfNeeded();
  await desktop.screenshot({path:`${output}/desktop.png`});
  console.log('PASS desktop: 5 routes, 21 unique plans/downloads/drafts, filters, arrows, copy');

  const mobile = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  mobile.on('pageerror', error => errors.push(error.message));
  for (const route of routes) {
    assert.equal((await mobile.goto(`${base}${route}/`)).status(),200);
    assert.ok(await checkOverflow(mobile), `Mobile overflow: ${route}`);
    assert.equal(await mobile.getByRole('tab',{name:'Все',exact:true}).getAttribute('aria-selected'),'true');
  }
  await mobile.goto(`${base}/`);
  await mobile.locator('.plan-track').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  const client=await mobile.context().newCDPSession(mobile);
  const swipe=async forward=>{
    const box=await active(mobile).locator('.plan-image-button').boundingBox();
    const y=Math.min(600,Math.max(200,box.y+box.height/2));
    const from=forward?340:50,to=forward?50:340;
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});
    for(let step=1;step<=14;step++) {
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*step/14,y}]});
      await mobile.waitForTimeout(25);
    }
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await mobile.waitForTimeout(800);
  };
  assert.equal(await active(mobile).getByRole('button',{name:'Следующая планировка'}).isVisible(),false);
  await swipe(true);
  assert.equal((await planFromCard(mobile)).id,'b37-t09-42-73');
  await swipe(false);
  assert.equal((await planFromCard(mobile)).id,'b37-t03-42-73');
  await swipe(true);
  await active(mobile).locator('.plan-image-button').tap();
  assert.ok((await mobile.locator('#dialog-title').textContent()).includes('Блоки 3 и 7, тип 9'));
  await mobile.waitForTimeout(500); // Let Chrome's transient touch highlight disappear.
  await mobile.screenshot({path:`${output}/mobile-modal.png`});
  await mobile.getByRole('dialog').getByRole('button',{name:'Узнать условия'}).tap();
  assert.ok((await mobile.locator('.selected-request').textContent()).includes('42,73 м² — Блоки 3 и 7, тип 9'));
  await mobile.getByRole('tab',{name:'Евроформат',exact:true}).tap();
  assert.equal((await planFromCard(mobile)).id,'b37-t05-55-3');
  assert.equal(await mobile.locator('.plan-track').evaluate(el=>el.scrollLeft),0);
  const ratio=await active(mobile).locator('.plan-area').evaluate(el=>parseFloat(getComputedStyle(el.querySelector('.plan-decimal')).fontSize)/parseFloat(getComputedStyle(el).fontSize));
  assert.ok(ratio<0.6);
  await mobile.locator('.plan-track').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await swipe(true);assert.equal((await planFromCard(mobile)).id,'b37-t06-59-4');
  await swipe(false);assert.equal((await planFromCard(mobile)).id,'b37-t05-55-3');
  await mobile.locator('#plans').evaluate(el=>window.scrollTo({top:el.offsetTop-75,behavior:'instant'}));
  await mobile.screenshot({path:`${output}/mobile.png`});
  for(const width of [360,430]) {
    await mobile.setViewportSize({width,height:932});
    assert.ok(await checkOverflow(mobile),`Overflow at ${width}px`);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS mobile: 5 routes, real touch swipes both ways, exact selection, filter reset, small decimals, 360/390/430px');
} finally { await browser.close(); }
