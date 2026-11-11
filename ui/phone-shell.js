/**
 * pupaphone — phone shell
 * Floating window, draggable by titlebar, scaleable (5 steps), closeable.
 */

import { t } from '../core/i18n.js';
import { getGlobal, setGlobal } from '../core/state.js';

// ── State ──
let currentScreen = 'lock';
let screenHistory = [];
let appRegistry = {};
let toastTimer = null;

const SCALES = [0.42, 0.52, 0.62, 0.72, 0.82];
let scaleIndex = 1;

// ── App registration ──
export function registerApp(id, { icon, label, render, order }) {
  appRegistry[id] = { id, icon, label, render, order: order || 99 };
}

// ── Mount ──
export function mountPhone() {
  if (document.getElementById('pupa-wrap')) return;

  const saved = getGlobal();
  scaleIndex = Math.min(SCALES.length - 1, Math.max(0, saved.phoneScale ?? 1));

  // Outer wrapper — pointer-events:none so ST still works behind it
  const wrap = document.createElement('div');
  wrap.id = 'pupa-wrap';
  wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10040;display:none;';

  // Floating window
  const win = document.createElement('div');
  win.id = 'pupa-win';
  win.innerHTML = `
    <div id="pupa-drag-handle"></div>
    <button id="pupa-close-btn" onclick="window.__pupa.close()" title="Закрыть">✕</button>
    <div id="pupa-scale-controls">
      <button class="pupa-scale-btn" onclick="window.__pupa.scaleDown()" title="Уменьшить">−</button>
      <button class="pupa-scale-btn" onclick="window.__pupa.scaleUp()" title="Увеличить">+</button>
    </div>
    <div id="pupa-frame-wrap">
      <div id="pupa-phone-frame">
        <div id="pupa-screen">
          <div id="pupa-island"></div>
          <div id="pupa-status-bar">
            <span class="pupa-time">9:41</span>
            <div class="pupa-status-icons">
              <svg width="17" height="12" viewBox="0 0 17 12">
                <rect x="0" y="8" width="3" height="4" rx="1" fill="white"/>
                <rect x="4.5" y="5.5" width="3" height="6.5" rx="1" fill="white"/>
                <rect x="9" y="3" width="3" height="9" rx="1" fill="white"/>
                <rect x="13.5" y="0" width="3" height="12" rx="1" fill="white"/>
              </svg>
              <svg width="16" height="12" viewBox="0 0 16 12">
                <path d="M8 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill="white"/>
                <path d="M8 5.5C5.9 5.5 4 6.4 2.7 7.8l1.4 1.4A5 5 0 018 7.5c1.4 0 2.6.6 3.5 1.5l1.5-1.5C11.7 6.3 9.9 5.5 8 5.5z" fill="white"/>
                <path d="M8 1.5C4.7 1.5 1.7 2.9 0 5.3l1.5 1.5A9 9 0 018 3.5c2.5 0 4.8 1 6.4 2.7L16 4.7C14 2.6 11.1 1.5 8 1.5z" fill="white"/>
              </svg>
              <svg width="25" height="12" viewBox="0 0 25 12">
                <rect x="0" y="1" width="22" height="10" rx="2" stroke="white" stroke-width="1.5" fill="none"/>
                <rect x="22.5" y="4" width="2" height="4" rx="1" fill="white" opacity=".6"/>
                <rect x="1.5" y="2.5" width="16" height="7" rx="1.5" fill="white"/>
              </svg>
            </div>
          </div>
          <div id="pupa-screen-lock" class="pupa-screen-view active">
            <div class="pupa-lock-wp"></div>
            <div class="pupa-lock-time">
              <div class="pupa-hour">9:41</div>
              <div class="pupa-date">среда, 11 ноября</div>
            </div>
            <button class="pupa-lock-unlock" onclick="window.__pupa.goHome()">${t('unlock')}</button>
          </div>
          <div id="pupa-screen-home" class="pupa-screen-view">
            <div class="pupa-home-wp"></div>
            <div id="pupa-app-grid"></div>
            <div id="pupa-dock"></div>
          </div>
          <div id="pupa-app-container"></div>
          <div id="pupa-modals"></div>
          <div id="pupa-home-indicator" onclick="window.__pupa.goHome()"></div>
          <div id="pupa-toast"></div>
        </div>
      </div>
    </div>`;

  wrap.appendChild(win);
  document.body.appendChild(wrap);

  _applyScale();
  _restorePosition();
  _applyWallpaper();
  _startClock();
  _wireDrag(win);
  _wireNavigation();
  _renderHomeScreen();
}

// ── Open / Close / Toggle ──
export function openPhone() {
  const wrap = document.getElementById('pupa-wrap');
  if (wrap) wrap.style.display = 'block';
}
export function closePhone() {
  const wrap = document.getElementById('pupa-wrap');
  if (wrap) wrap.style.display = 'none';
}
export function togglePhone() {
  const wrap = document.getElementById('pupa-wrap');
  if (!wrap) return;
  wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
}

// ── Wallpaper ──
function _applyWallpaper() {
  const s = getGlobal();
  if (!s.wallpaper) return;
  const blur = s.wallpaperBlur || 0;
  document.querySelectorAll('.pupa-lock-wp, .pupa-home-wp').forEach(el => {
    el.style.backgroundImage = `url(${s.wallpaper})`;
    el.style.filter = blur > 0 ? `blur(${blur}px)` : '';
  });
}

// ── Scale ──
function _applyScale() {
  const s = SCALES[scaleIndex];
  const fw = 393, fh = 852, tbh = 38;
  const win = document.getElementById('pupa-win');
  const fw2 = document.getElementById('pupa-frame-wrap');
  if (!win || !fw2) return;
  win.style.width  = `${Math.round(fw * s)}px`;
  win.style.height = `${Math.round(fh * s + tbh)}px`;
  fw2.style.width  = `${Math.round(fw * s)}px`;
  fw2.style.height = `${Math.round(fh * s)}px`;
  fw2.style.overflow = 'hidden';
  fw2.style.position = 'relative';
  const frame = document.getElementById('pupa-phone-frame');
  if (frame) {
    frame.style.position    = 'absolute';
    frame.style.top         = '0';
    frame.style.left        = '0';
    frame.style.width       = `${fw}px`;
    frame.style.height      = `${fh}px`;
    frame.style.transform   = `scale(${s})`;
    frame.style.transformOrigin = 'top left';
  }
}

function _scaleUp() {
  if (scaleIndex < SCALES.length - 1) { scaleIndex++; _applyScale(); _clamp(); setGlobal({ phoneScale: scaleIndex }); }
}
function _scaleDown() {
  if (scaleIndex > 0) { scaleIndex--; _applyScale(); setGlobal({ phoneScale: scaleIndex }); }
}

function _restorePosition() {
  const win = document.getElementById('pupa-win');
  if (!win) return;
  const saved = getGlobal();
  if (saved.winX != null) {
    win.style.left = `${saved.winX}px`;
    win.style.top  = `${saved.winY}px`;
  } else {
    // default: bottom-right
    win.style.right  = '24px';
    win.style.bottom = '80px';
  }
}

function _clamp() {
  const win = document.getElementById('pupa-win');
  if (!win) return;
  const r = win.getBoundingClientRect();
  const m = 8;
  const nx = Math.max(m, Math.min(r.left, window.innerWidth  - win.offsetWidth  - m));
  const ny = Math.max(m, Math.min(r.top,  window.innerHeight - win.offsetHeight - m));
  win.style.left = `${nx}px`; win.style.top = `${ny}px`;
  win.style.right = 'auto'; win.style.bottom = 'auto';
}

// ── Drag handle ──
function _wireDrag(win) {
  const handle = document.getElementById('pupa-drag-handle');
  if (!handle) return;
  let dr = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;

  handle.addEventListener('pointerdown', e => {
    const r = win.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    dr = true; moved = false;
    handle.setPointerCapture(e.pointerId);
    handle.style.cursor = 'grabbing';
  });
  handle.addEventListener('pointermove', e => {
    if (!dr) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    moved = true;
    const m = 8;
    const nx = Math.max(m, Math.min(ox + dx, window.innerWidth  - win.offsetWidth  - m));
    const ny = Math.max(m, Math.min(oy + dy, window.innerHeight - win.offsetHeight - m));
    win.style.left = `${nx}px`; win.style.top = `${ny}px`;
    win.style.right = 'auto'; win.style.bottom = 'auto';
  });
  handle.addEventListener('pointerup', () => {
    if (!dr) return; dr = false; handle.style.cursor = 'grab';
    if (moved) { const r = win.getBoundingClientRect(); setGlobal({ winX: r.left, winY: r.top }); }
  });
}

// ── Navigation ──
export function goTo(screenId, pushHistory = true) {
  const prev = document.querySelector('.pupa-screen-view.active');
  const next = document.getElementById(`pupa-screen-${screenId}`);
  if (!next || screenId === currentScreen) return;
  if (pushHistory) screenHistory.push(currentScreen);
  prev?.classList.remove('active');
  next.classList.add('active', 'slide-in');
  setTimeout(() => next.classList.remove('slide-in'), 350);
  currentScreen = screenId;
  if (appRegistry[screenId]?.render) appRegistry[screenId].render(next);
}
export function goBack() {
  if (!screenHistory.length) { goHome(); return; }
  const prev = screenHistory.pop();
  document.querySelector('.pupa-screen-view.active')?.classList.remove('active');
  document.getElementById(`pupa-screen-${prev}`)?.classList.add('active');
  currentScreen = prev;
}
export function goHome() {
  screenHistory = []; goTo('home', false);
}
export function showToast(msg) {
  const el = document.getElementById('pupa-toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}
export function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function _wireNavigation() {
  window.__pupa = {
    goTo, goBack, goHome, showToast, openModal, closeModal,
    open: openPhone, close: closePhone, toggle: togglePhone,
    scaleUp: _scaleUp, scaleDown: _scaleDown,
  };
}

// ── Clock ──
function _startClock() {
  const tick = () => {
    const n = new Date();
    const s = `${n.getHours().toString().padStart(2,'0')}:${n.getMinutes().toString().padStart(2,'0')}`;
    document.querySelectorAll('.pupa-time, #pupa-screen-lock .pupa-hour').forEach(e => e.textContent = s);
    const days   = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
    const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    const d = document.querySelector('#pupa-screen-lock .pupa-date');
    if (d) d.textContent = `${days[n.getDay()]}, ${n.getDate()} ${months[n.getMonth()]}`;
  };
  tick(); setInterval(tick, 10000);
}

// ── Home screen ──
function _renderHomeScreen() {
  const order = getGlobal().appOrder || ['sms','instagram','twitter','telegram','bank','onlyfans','reddit','gallery','settings'];
  const grid = document.getElementById('pupa-app-grid');
  if (grid) grid.innerHTML = order.map(id => {
    const a = appRegistry[id]; if (!a) return '';
    return `<div class="pupa-app-icon-wrap" onclick="window.__pupa.goTo('${id}')"><div class="pupa-app-icon pupa-icon-${id}">${a.icon}</div><span class="pupa-app-label">${t(id)}</span></div>`;
  }).join('');
  const dock = document.getElementById('pupa-dock');
  if (dock) dock.innerHTML = ['sms','instagram','telegram','settings'].map(id => {
    const a = appRegistry[id]; if (!a) return '';
    return `<div class="pupa-dock-icon pupa-icon-${id}" onclick="window.__pupa.goTo('${id}')">${a.icon}</div>`;
  }).join('');
}

// ── Create app screen ──
export function createAppScreen(id) {
  let el = document.getElementById(`pupa-screen-${id}`);
  if (el) return el;
  el = document.createElement('div');
  el.id = `pupa-screen-${id}`; el.className = 'pupa-screen-view';
  document.getElementById('pupa-app-container')?.appendChild(el);
  return el;
}
