// End-to-end checks using installed Chrome and its DevTools protocol.
// No production credentials, SMTP delivery, or existing customer database is used.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const chrome = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
if (!chrome) throw new Error('Chrome absent : définir CHROME_PATH.');
if (!existsSync(join(root, 'frontend/dist/index.html'))) throw new Error('Compiler le frontend avant le test.');
const port = await new Promise((done, reject) => {
  const socket = createServer(); socket.on('error', reject);
  socket.listen(0, '127.0.0.1', () => { const p = socket.address().port; socket.close(() => done(p)); });
});
const origin = `http://127.0.0.1:${port}`;
const folder = join(root, '.qa', `run-${Date.now()}`);
const profile = join(folder, 'chrome');
mkdirSync(profile, { recursive: true });
const password = randomBytes(24).toString('hex');
const server = spawn(process.env.PYTHON || 'python', ['server.py'], {
  cwd: root, windowsHide: true, stdio: 'ignore',
  env: { ...process.env, APP_ENV: 'development', PUBLIC_URL: origin, HOST: '127.0.0.1', PORT: String(port),
    ADMIN_PASSWORD: password, DATA_DIR: join(folder, 'data'), SMTP_HOST: '', CONTACT_EMAIL: '', CONTACT_PHONE: '', CONTACT_WHATSAPP: '' },
});
let browser, ws;
let id = 0;
const pending = new Map();
const runtimeErrors = [];
const postedRequests = [];
function call(method, params = {}) {
  return new Promise((accept, reject) => {
    const key = ++id;
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`CDP timeout: ${method}`)); }, 40000);
    pending.set(key, { accept, reject, timeout });
    ws.send(JSON.stringify({ id: key, method, params }));
  });
}
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function until(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if (await evaluate(expression)) return; }
    catch (error) { if (!/context|navigat/i.test(error.message)) throw error; }
    await delay(100);
  }
  throw new Error(`Condition non satisfaite: ${expression}`);
}
async function go(path) {
  console.log('Navigation:', path);
  await call('Page.navigate', { url: origin + path });
  await until(`location.pathname === ${JSON.stringify(new URL(path, origin).pathname)} && document.readyState === 'complete' && !!document.querySelector('main h1')`);
  await delay(200);
}
async function screenshot(name, width, height, bottom = false) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await evaluate(bottom ? 'window.scrollTo(0,document.body.scrollHeight)' : 'window.scrollTo(0,0)');
  await delay(850);
  const r = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(join(folder, name + '.png'), Buffer.from(r.data, 'base64'));
}
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(origin + '/api/health')).ok) break; } catch {}
    if (i > 80) throw new Error('Serveur de test indisponible.');
    await delay(100);
  }
  browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const activePort = join(profile, 'DevToolsActivePort');
  for (let i = 0; !existsSync(activePort); i++) {
    if (i > 100) throw new Error('Chrome ne démarre pas.');
    await delay(100);
  }
  const chromePort = readFileSync(activePort, 'utf8').split('\n')[0];
  const target = await (await fetch(`http://127.0.0.1:${chromePort}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  ws.addEventListener('message', e => {
    const message = JSON.parse(e.data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails);
    if (message.method === 'Network.requestWillBeSent' && message.params.request.method === 'POST') postedRequests.push(message.params.request.url);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    clearTimeout(waiter.timeout); pending.delete(message.id);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.accept(message.result);
  });
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  if (process.argv.includes('--showcase')) {
    await go('/services');
    await until(`Array.from(document.images).every(i => !i.complete || i.naturalWidth > 0)`);
    await go('/admin');
    assert.equal(await evaluate(`document.querySelector('input[type=password]') === null`), true, 'No online admin in showcase');
    await go('/brief?service=objets');
    await evaluate(`document.querySelector('form').requestSubmit()`);
    await until(`!!document.querySelector('textarea')`);
    assert.equal(await evaluate(`document.querySelector('input[type=file]') === null`), true, 'Files shared in WhatsApp, no server upload');
    await evaluate(`(() => {
      const form=document.querySelector('form');
      for(const select of form.querySelectorAll('select[required]')){select.value=select.options[1].value;select.dispatchEvent(new Event('change',{bubbles:true}));}
      for(const input of form.querySelectorAll('input[required],textarea[required]')){
        const proto=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto,'value').set.call(input,input.type==='email'?'test@example.com':input.type==='number'?'12':'Projet test vitrine');
        input.dispatchEvent(new Event('input',{bubbles:true}));
      }
    })()`);
    await evaluate(`document.querySelector('form').requestSubmit()`);
    await until(`!!document.querySelector('.recap')`);
    await evaluate(`window.open=url=>{window.__sharedUrl=url;return null;};document.querySelector('input[type=checkbox]').click()`);
    await evaluate(`document.querySelector('form').requestSubmit()`);
    await until(`typeof window.__sharedUrl === 'string'`);
    const shared = new URL(await evaluate('window.__sharedUrl'));
    assert.equal(shared.hostname,'wa.me');
    assert.equal(shared.pathname,'/22674033529');
    assert.ok(shared.searchParams.get('text').includes('Projet test vitrine'));
    assert.equal(postedRequests.some(url=>url.includes('/api/requests')),false,'No false server submission');
    await screenshot('vitrine-whatsapp-desktop',1440,1000);
    await screenshot('vitrine-whatsapp-mobile',390,844);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
    assert.equal(runtimeErrors.length,0,JSON.stringify(runtimeErrors));
    console.log(JSON.stringify({ok:true,screenshots:folder,checks:'Showcase brief shares prepared text through WhatsApp without requests POST, no admin, no files upload, responsive'}));
  } else if (process.argv.includes('--contact-only')) {
    await go('/contact');
    await until(`document.querySelectorAll('footer .social-links a').length === 4`);
    assert.equal(await evaluate(`!!document.querySelector('footer a[href^="https://wa.me/22674033529"]')`), true);
    assert.equal(await evaluate(`document.getElementById('localisation').innerText.includes('Ouagadougou, Karpala')`), true);
    await screenshot('contact-desktop', 1440, 1000);
    await screenshot('footer-desktop', 1440, 1000, true);
    await screenshot('footer-mobile', 390, 844, true);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Contact/footer mobile');
    assert.equal(runtimeErrors.length, 0, JSON.stringify(runtimeErrors));
    console.log(JSON.stringify({ok: true, screenshots: folder, checks: 'Contact, localisation, WhatsApp, 3 social links, desktop/mobile footer'}));
  } else if (process.argv.includes('--motion-only')) {
    await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await go('/');
    await until(`document.querySelectorAll('.motion-pending').length > 0`);
    await evaluate(`document.querySelector('.service-line').scrollIntoView({block:'center'})`);
    await until(`!document.querySelector('.service-line').classList.contains('motion-pending')`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.service-line')).transitionDuration.includes('0.52s')`), true, 'Scroll reveal');
    await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await until(`document.querySelectorAll('.motion-pending').length === 0`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.hero-copy')).animationName`), 'none', 'Reduced-motion intro');
    await go('/realisations');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.project')).animationName`), 'none', 'Reduced-motion gallery');
    await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await evaluate(`document.querySelectorAll('.filters button')[2].click()`);
    await until(`document.querySelectorAll('.projects-grid .project').length === 1`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.project')).animationName`), 'project-enter', 'Gallery animation');
    await evaluate(`document.querySelector('.project').click()`);
    await until(`!!document.querySelector('dialog[open]')`);
    await call('Page.bringToFront');
    await call('Input.dispatchKeyEvent', {type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
    await call('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
    await until(`!document.querySelector('dialog[open]')`);
    await go('/brief');
    await evaluate(`document.querySelector('form').requestSubmit()`);
    await until(`!!document.querySelector('textarea')`);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.brief-stage')).animationName`), 'stage-enter', 'Brief step animation');
    await call('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await go('/');
    await until(`document.querySelector('#navigation').inert === true`);
    await evaluate(`document.querySelector('.menu-toggle').click()`);
    await until(`document.querySelector('#navigation').inert === false`);
    await delay(300);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('#navigation')).visibility`), 'visible', 'Open mobile nav');
    await call('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape'});
    await until(`document.querySelector('#navigation').inert === true`);
    await delay(300);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('#navigation')).visibility`), 'hidden', 'Closed mobile nav');
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Motion mobile overflow');
    await screenshot('animations-mobile',390,844);
    await screenshot('animations-desktop',1440,1000);
    assert.equal(runtimeErrors.length,0,JSON.stringify(runtimeErrors));
    console.log(JSON.stringify({ok:true,screenshots:folder,checks:'Scroll reveal, live reduced-motion, gallery filter/dialog, brief step, mobile menu keyboard and overflow'}));
  } else {
  for (const path of ['/', '/services', '/realisations', '/a-propos', '/contact', '/brief', '/confidentialite', '/admin']) {
    await go(path);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Overflow desktop ${path}`);
    assert.equal(await evaluate('Array.from(document.images).filter(i => i.complete && !i.naturalWidth).length'), 0, `Images ${path}`);
  }
  await go('/'); await screenshot('accueil-desktop', 1440, 1000);
  assert.equal(await evaluate(`!!document.querySelector('footer a[href^="https://wa.me/22674033529"]')`), true, 'WhatsApp footer');
  await screenshot('footer-desktop', 1440, 1000, true);
  await screenshot('accueil-mobile', 390, 844);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Overflow mobile');
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'true');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'false');
  for (const path of ['/services', '/realisations', '/a-propos', '/contact', '/brief']) {
    await go(path);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Overflow mobile ${path}`);
  }
  await go('/contact');
  assert.equal(await evaluate(`document.getElementById('localisation').innerText.includes('Ouagadougou, Karpala')`), true, 'Localisation Karpala');
  assert.equal(await evaluate(`!!document.querySelector('#localisation a[href^="https://www.google.com/maps/search/"]')`), true, 'Carte du quartier');
  await screenshot('footer-mobile', 390, 844, true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Footer mobile');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const serviceUnderTest = process.argv.includes('--objects') ? 'objets' : 'impression';
  await go('/brief?service=' + serviceUnderTest);
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await until(`!!document.querySelector('textarea')`);
  if (serviceUnderTest === 'objets') {
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('select option')).some(o=>o.textContent==='Thermos portable')`), true, 'Thermos option');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('select option')).some(o=>o.textContent.includes('Tasse'))`), true, 'Mug option');
  }
  await evaluate(`(() => {
    const form = document.querySelector('form');
    for (const select of form.querySelectorAll('select[required]')) { select.value = select.options[1].value; select.dispatchEvent(new Event('change',{bubbles:true})); }
    for (const input of form.querySelectorAll('input[required],textarea[required]')) {
      const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const value = input.type==='email'?'qa@example.com':input.type==='number'?'100':'Projet de verification HASKE';
      Object.getOwnPropertyDescriptor(proto,'value').set.call(input,value);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  })()`);
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await until(`!!document.querySelector('.recap')`);
  await evaluate(`document.querySelector('input[type=checkbox]').click()`);
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await until(`/HD-[A-F0-9]+/.test(document.querySelector('main').innerText)`);
  await screenshot('brief-reception', 1440, 1000);
  await go('/admin');
  await until(`!!document.querySelector('input[type=password]')`);
  await evaluate(`(() => { const input=document.querySelector('input[type=password]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(password)});input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await until(`!!document.querySelector('.request-detail') && /qa@example.com/.test(document.querySelector('main').innerText)`);
  await evaluate(`(() => {const select=document.querySelector('.request-detail select');select.value='En discussion';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await delay(400);
  assert.equal(await evaluate(`(async()=>{const r=await fetch('/api/admin/requests');const d=await r.json();return d.requests[0].status;})()`), 'En discussion');
  assert.equal(await evaluate(`(async()=>{const r=await fetch('/api/admin/requests');const d=await r.json();return d.requests[0].payload.service;})()`), serviceUnderTest);
  await screenshot('administration-desktop', 1440, 1000);
  assert.equal(runtimeErrors.length, 0, JSON.stringify(runtimeErrors));
  console.log(JSON.stringify({ ok: true, screenshots: folder, checks: 'routes desktop/mobile, images, mobile menu, brief submission, admin login and status, runtime errors' }, null, 2));
  }
} finally {
  ws?.close();
  browser?.kill();
  server.kill();
}
