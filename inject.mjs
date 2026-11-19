#!/usr/bin/env node
/**
 * 白龍 · 雲瀾 — WorkBuddy 皮肤注入器（守护版）
 * 每 8 秒扫描所有窗口，缺样式就补 —— 新开的设置页/结果区也会自动上色。
 *
 *   node inject.mjs               守护
 *   node inject.mjs --once        只跑一次
 *   node inject.mjs --port 9342
 *   node inject.mjs --ttl 0       永不退出
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET = pathToFileURL(path.join(__dirname, 'assets')).href;
const CSS = fs.readFileSync(path.join(__dirname, 'theme.css'), 'utf8').split('__ASSET__').join(ASSET);
const LOG = path.join(__dirname, 'inject.log');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => { const s = `[${new Date().toISOString()}] ${m}`; console.log(s); try { fs.appendFileSync(LOG, s + '\n'); } catch {} };

const args = process.argv.slice(2);
const once = args.includes('--once');
const argOf = (f, d) => { const i = args.indexOf(f); return i > -1 && args[i + 1] ? args[i + 1] : d; };
const PORT = argOf('--port', process.env.WORKBUDDY_REMOTE_DEBUGGING_PORT || '9342');
const TTL = Number(argOf('--ttl', '0'));

let seq = 0;
const send = (ws, method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  const t = setTimeout(() => { ws.removeEventListener('message', on); rej(new Error('timeout ' + method)); }, 10000);
  function on(e) {
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m.id !== id) return;
    clearTimeout(t); ws.removeEventListener('message', on);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
  ws.addEventListener('message', on);
  ws.send(JSON.stringify({ id, method, params }));
});

const EXPR = `(() => {
  const ID='byakuru-skin', CSS=${JSON.stringify(CSS)};
  const head=document.head||document.documentElement;
  let el=document.getElementById(ID);
  if(!el){el=document.createElement('style');el.id=ID;}
  if(el.textContent.length!==CSS.length) el.textContent=CSS;
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
  return CSS.length;
})()`.split('__ASSET__').join(ASSET);

async function targets() {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(2500) });
  return r.json();
}

/** 给所有窗口注入；返回 [{title, ok}] */
async function injectAll() {
  const list = await targets();
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  const done = [];
  for (const p of pages) {
    try {
      const ws = new WebSocket(p.webSocketDebuggerUrl);
      await new Promise((res, rej) => {
        ws.addEventListener('open', res, { once: true });
        ws.addEventListener('error', () => rej(new Error('ws')), { once: true });
        setTimeout(() => rej(new Error('ws timeout')), 6000);
      });
      await send(ws, 'Runtime.enable');
      const r = await send(ws, 'Runtime.evaluate', { expression: EXPR, returnByValue: true });
      ws.close();
      done.push({ title: p.title || '', url: p.url.slice(0, 70), len: r?.result?.value });
    } catch { /* 单个窗口失败不影响其它 */ }
  }
  return done;
}

async function main() {
  log(`start  port=${PORT} once=${once} css=${CSS.length}`);

  for (let i = 0; i < 5; i++) {
    try { const t = await targets(); if (t.length) break; } catch { /* wait */ }
    await sleep(1000);
  }

  const first = await injectAll();
  if (first.length) {
    for (const d of first) log(`ok ${d.len}  ${d.title}  ${d.url}`);
  } else {
    log('no window yet, waiting for WorkBuddy...');
    if (once) process.exit(1);
  }
  if (once) return;

  if (TTL > 0) setTimeout(() => { log('ttl exit'); process.exit(0); }, TTL * 60000);

  let lastCount = -1;
  setInterval(async () => {
    try {
      const r = await injectAll();
      if (r.length !== lastCount) { log(`windows=${r.length}`); lastCount = r.length; }
    } catch { /* port closed, retry */ }
  }, 8000);

  log('watching…');
}

main().catch((e) => { log('FATAL ' + e.message); process.exit(1); });
