#!/usr/bin/env node
/**
 * 诊断 + 注入 + 截图，一次性跑完，结果写盘：audit.json / audit.png
 * 会轮询等待调试端口，并对所有渲染窗口注入。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.WORKBUDDY_REMOTE_DEBUGGING_PORT || '9342';
const ASSET = pathToFileURL(path.join(__dirname, 'assets')).href;
const CSS = fs.readFileSync(path.join(__dirname, 'theme.css'), 'utf8').split('__ASSET__').join(ASSET);
const LOG = path.join(__dirname, 'inject.log');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => { const s = `[${new Date().toISOString()}] [audit] ${m}`; console.log(s); try { fs.appendFileSync(LOG, s + '\n'); } catch {} };

let seq = 0;
function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const t = setTimeout(() => { ws.removeEventListener('message', on); reject(new Error('timeout ' + method)); }, 20000);
    function on(e) {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.id !== id) return;
      clearTimeout(t); ws.removeEventListener('message', on);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
    ws.addEventListener('message', on);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const PROBE = String.raw`(() => {
  const out = { href: location.href, title: document.title, t: Date.now(), vw: innerWidth, vh: innerHeight };
  const skin = document.getElementById('byakuru-skin');
  out.skin = !!skin;
  out.skinLen = skin ? skin.textContent.length : 0;
  out.htmlClass = document.documentElement.className;
  out.bodyClass = document.body ? document.body.className : '';
  const gv = (el, p) => getComputedStyle(el).getPropertyValue(p).trim();
  out.vars = {};
  for (const v of ['--cb-bg','--cb-bg-secondary','--cb-sidebar-bg','--cb-text-primary','--cb-accent']) {
    out.vars[v] = { html: gv(document.documentElement, v), body: document.body ? gv(document.body, v) : '' };
  }
  const els = [...document.querySelectorAll('*')].filter(e => {
    const r = e.getBoundingClientRect();
    return r.width > 200 && r.height > 100;
  }).slice(0, 600);
  out.regions = els.map(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { tag: e.tagName.toLowerCase(), cls: String(e.className || '').slice(0, 90), bg: cs.backgroundColor,
             w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
  }).filter(r => r.bg !== 'rgba(0, 0, 0, 0)').slice(0, 25);
  out.varRules = [];
  for (const ss of document.styleSheets) {
    let rules; try { rules = ss.cssRules; } catch { continue; }
    if (!rules) continue;
    for (const r of rules) {
      if (!r.style) continue;
      const v = r.style.getPropertyValue('--cb-bg');
      if (v) out.varRules.push({ sel: r.selectorText, val: v });
      if (out.varRules.length > 20) break;
    }
  }
  return JSON.stringify(out);
})()`.split('__ASSET__').join(ASSET);

const INJECT = `(() => {
  const ID='byakuru-skin', CSS=${JSON.stringify(CSS)};
  const head=document.head||document.documentElement;
  let el=document.getElementById(ID);
  if(!el){el=document.createElement('style');el.id=ID;}
  el.textContent=CSS;
  head.appendChild(el);
  try{
    const k='__byakuruSheet';
    let sh=window[k];
    if(!sh){ sh=new CSSStyleSheet(); window[k]=sh; }
    sh.replaceSync(CSS);
    document.adoptedStyleSheets=[...document.adoptedStyleSheets.filter(x=>x!==sh), sh];
  }catch(e){}

  try {
    var M = document.getElementById('byakuru-mascot');
    if (M && M.dataset.v !== 'v4') { M.parentNode.removeChild(M); M = null; }
    if (!M) {
      M = document.createElement('div');
      M.id = 'byakuru-mascot';
      M.dataset.v = 'v4';
      M.title = '白龙 · 云澜';
      var inner = document.createElement('div');
      inner.className = 'inner';
      for (var i = 1; i <= 6; i++) {
        var f = document.createElement('img');
        f.className = 'face' + (i === 1 ? ' on' : '');
        f.src = '__ASSET__/expr/face' + i + '.png';
        f.alt = '';
        inner.appendChild(f);
      }
      M.appendChild(inner);
      document.body.appendChild(M);
    }
    var faces = M.querySelectorAll('.face');
    var cur = 1;
    var setFace = function (n) {
      if (n === cur) return;
      faces[cur - 1].classList.remove('on');
      faces[n - 1].classList.add('on');
      cur = n;
    };
    if (!M.dataset.ready) {
      M.dataset.ready = '1';
      var shyT = null, idleT = null;
      var scheduleIdle = function () { clearTimeout(idleT); idleT = setTimeout(function () { setFace(5); }, 45000); };
      M.addEventListener('mouseenter', function () {
        setFace(2); clearTimeout(idleT); clearTimeout(shyT);
        shyT = setTimeout(function () {
          setFace(4); M.classList.add('shy');
          setTimeout(function () { M.classList.remove('shy'); }, 700);
        }, 2200);
      });
      M.addEventListener('mouseleave', function () { clearTimeout(shyT); setFace(1); scheduleIdle(); });
      M.addEventListener('click', function () {
        setFace(3); M.classList.remove('pop'); void M.offsetWidth; M.classList.add('pop');
        clearTimeout(shyT); setTimeout(function () { setFace(1); }, 1100);
      });
      scheduleIdle();
    }
  try {
    var UIMG = '__ASSET__/ava-user.png';
    var applyBranding = function () {
      document.querySelectorAll('.user-menu-trigger-avatar img').forEach(function (im) {
        if (im.getAttribute('src') !== UIMG) im.setAttribute('src', UIMG);
      });
    };
    applyBranding();
    if (!window.__byakuruBrandObs) {
      var pending = false;
      window.__byakuruBrandObs = new MutationObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; try { applyBranding(); } catch (e) {} });
      });
      window.__byakuruBrandObs.observe(document.body, { childList: true, subtree: true });
    }
  } catch (e) {}
    var place = function () {
      // 首页和对话页的输入框可能同时挂在 DOM 上，取屏幕最靠下、且可见的那个
      var cands = document.querySelectorAll('.cr-input-container');
      var c = null, bestBottom = -1;
      for (var ci = 0; ci < cands.length; ci++) {
        var rr = cands[ci].getBoundingClientRect();
        if (rr.width > 0 && rr.height > 0 && rr.bottom > bestBottom) { bestBottom = rr.bottom; c = cands[ci]; }
      }
      if (!c) return;
      var r = c.getBoundingClientRect();
      var left = Math.round(r.right - 98);
      var top = Math.round(r.top - 100);
      // 上方没空间（欢迎页输入框居中）时，改扒下沿，保持"贴着输入框"这一关系
      if (r.top < window.innerHeight * 0.35) {
        top = Math.round(r.bottom - 46);
      }
      if (M.style.left !== left + 'px') M.style.left = left + 'px';
      if (M.style.top !== top + 'px') M.style.top = top + 'px';
    };
    place();
    window.__byakuruPlace = place;
    if (!window.__byakuruTimer) {
      window.__byakuruTimer = setInterval(function () { try { window.__byakuruPlace(); } catch (e) {} }, 600);
      window.addEventListener('resize', function () { try { window.__byakuruPlace(); } catch (e) {} });
    }
  } catch (e) {}
  return 'ok:'+CSS.length;
})()`.split('__ASSET__').join(ASSET);

async function targets() {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(2500) });
  return r.json();
}

async function open(list) {
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  pages.sort((a, b) => {
    const score = (t) => (/windowKind=settings/.test(t.url) ? 0 : 2) + (/renderer\/index\.html/.test(t.url) ? 2 : 0);
    return score(b) - score(a);
  });
  if (!pages.length) return [];
  const out = [];
  for (const p of pages) {
    try {
      const ws = new WebSocket(p.webSocketDebuggerUrl);
      await new Promise((res, rej) => {
        ws.addEventListener('open', res, { once: true });
        ws.addEventListener('error', () => rej(new Error('ws fail')), { once: true });
        setTimeout(() => rej(new Error('ws timeout')), 6000);
      });
      await send(ws, 'Runtime.enable');
      out.push({ ws, page: p });
    } catch { /* skip */ }
  }
  return out;
}

async function main() {
  let list = null;
  for (let i = 0; i < 50; i++) {
    try { list = await targets(); if (list && list.length) break; } catch { /* wait */ }
    await sleep(1000);
  }
  if (!list) throw new Error('debug port never opened');

  const conns = await open(list);
  if (!conns.length) throw new Error('no injectable page');

  for (const c of conns) {
    try {
      const r = await send(c.ws, 'Runtime.evaluate', { expression: INJECT, returnByValue: true });
      log(`inject ${r?.result?.value} → ${c.page.title || ''} ${c.page.url.slice(0, 60)}`);
    } catch (e) { log('inject fail: ' + e.message); }
  }
  await sleep(900);

  const main = conns.find(c => !/windowKind=settings/.test(c.page.url)) || conns[0];
  const probe = await send(main.ws, 'Runtime.evaluate', { expression: PROBE, returnByValue: true });
  fs.writeFileSync(path.join(__dirname, 'audit.json'), probe?.result?.value || '{}', 'utf8');

  // 关掉可能打开的浮层
  try {
    for (const type of ['keyDown', 'keyUp']) {
      await send(main.ws, 'Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    }
    await sleep(400);
  } catch {}

  try {
    const shot = await send(main.ws, 'Page.captureScreenshot', { format: 'png' });
    if (shot?.data) fs.writeFileSync(path.join(__dirname, 'audit.png'), Buffer.from(shot.data, 'base64'));
    log('screenshot saved');
  } catch (e) { log('shot fail: ' + e.message); }

  for (const c of conns) { try { c.ws.close(); } catch {} }
  log('done');
}

main().catch((e) => { log('FAILED ' + e.message); process.exit(1); });
