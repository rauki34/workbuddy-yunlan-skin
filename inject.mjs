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
  // 已注入且维护脚本为最新版：直接返回，跳过全部重解析/DOM 维护
  if(el && el.dataset.ready==='1' && el.textContent.length===CSS.length) {
    var _m=document.getElementById('byakuru-mascot');
    if(_m && _m.dataset.m==='v5') return CSS.length;
  }
  if(!el){el=document.createElement('style');el.id=ID;}
  if(el.textContent.length!==CSS.length) el.textContent=CSS;
  el.dataset.ready='1';
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
    if (M.dataset.m !== 'v5') {
      M.dataset.m = 'v5';
      var UIMG = '__ASSET__/ava-user.png';
      var applyBranding = function () {
        var imgs = document.querySelectorAll('.user-menu-trigger-avatar img');
        for (var i = 0; i < imgs.length; i++) {
          if (imgs[i].getAttribute('src') !== UIMG) imgs[i].setAttribute('src', UIMG);
        }
      };
      applyBranding();

      // 统一一次布局计算：头像替换 + 小龙定位合并到一个 rAF，避免多次强制同步布局
      var rectCache = null;
      var relayout = function () {
        var c = null, bestBottom = -1, cr, cl;
        var cands = document.querySelectorAll('.cr-input-container');
        for (var ci = 0; ci < cands.length; ci++) {
          cr = cands[ci].getBoundingClientRect();
          if (cr.width > 0 && cr.height > 0 && cr.bottom > bestBottom) { bestBottom = cr.bottom; c = cands[ci]; }
        }
        if (c) {
          var r = c.getBoundingClientRect();
          cl = Math.round(r.right - 98);
          var ct = Math.round(r.top - 100);
          if (r.top < window.innerHeight * 0.35) ct = Math.round(r.bottom - 46);
          rectCache = [cl, ct];
        }
        try { applyBranding(); } catch (e) {}
        if (rectCache) {
          if (M.style.left !== rectCache[0] + 'px') M.style.left = rectCache[0] + 'px';
          if (M.style.top !== rectCache[1] + 'px') M.style.top = rectCache[1] + 'px';
        }
      };

      // rAF 合帧：一个刷新周期内多次触发只算一次
      var raf = 0;
      var schedule = function () {
        if (raf) return;
        raf = requestAnimationFrame(function () { raf = 0; try { relayout(); } catch (e) {} });
      };
      window.__byakuruPlace = schedule;

      // 事件驱动：DOM 结构变化 / 窗口尺寸变化时才重排。去掉 2.5s 无条件定时器。
      if (!window.__byakuruBrandObs) {
        var pending = false;
        window.__byakuruBrandObs = new MutationObserver(function () {
          if (pending) return;
          pending = true;
          schedule();
          setTimeout(function () { pending = false; }, 120); // 120ms 内合帧
        });
        window.__byakuruBrandObs.observe(document.body, { childList: true, subtree: true });
      }
      if (!window.__byakuruResize) {
        window.__byakuruResize = true;
        window.addEventListener('resize', schedule);
      }
      schedule();
    }
  } catch (e) {}
  return CSS.length;
})()`.split('__ASSET__').join(ASSET);

async function targets() {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(2500) });
  return r.json();
}

/** 守护模式：吞掉瞬时错误（重启时端口会短暂关闭），永不退出 */
async function safeInjectAll() {
  try { return await injectAll(); } catch (e) { return []; }
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

  if (!once) {
    // 守护模式先等端口，最多等 15 轮后仍继续轮询（WorkBuddy 可能暂时没开）
    for (let i = 0; i < 15; i++) {
      try { const t = await targets(); if (t.length) break; } catch { /* wait */ }
      await sleep(1000);
    }
  }

  const first = once ? await injectAll() : await safeInjectAll();
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
    const r = await safeInjectAll();
    if (r.length !== lastCount) { log(`windows=${r.length}`); lastCount = r.length; }
  }, 12000);

  log('watching…');
}

main().catch((e) => {
  log('ERR ' + e.message);
  if (once) process.exit(1);
  // 守护模式：即使初始化抛错也继续挂住，等待 WorkBuddy
  if (TTL > 0) setTimeout(() => process.exit(0), TTL * 60000);
  let last = -1;
  setInterval(async () => {
    const r = await safeInjectAll();
    if (r.length !== last) { log(`windows=${r.length}`); last = r.length; }
  }, 12000);
});
