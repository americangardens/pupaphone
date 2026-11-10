/**
 * pupaphone — phone shell
 * Builds the phone frame, status bar, lock screen, home screen, and navigation.
 * App screens register here and get rendered when opened.
 */

import { t } from '../core/i18n.js';
import { getGlobal, getChat, getRecentEvents } from '../core/state.js';

// ── State ──
let currentScreen = 'lock';
let screenHistory = [];
let appRegistry = {};
let toastTimer = null;

// ── App registration ──
export function registerApp(id, { icon, label, render, order }) {
  appRegistry[id] = { id, icon, label, render, order: order || 99 };
}

// ── Mount the phone ──
export function mountPhone() {
  if (document.getElementById('pupa-phone')) return;

  const host = document.createElement('div');
  host.id = 'pupa-phone';
  host.innerHTML = _buildShell();
  document.body.appendChild(host);

  _startClock();
  _wireNavigation();
  _renderHomeScreen();
}

export function togglePhone() {
  const phone = document.getElementById('pupa-phone');
  if (!phone) return;
  const isVisible = phone.style.display === 'flex';
  phone.style.display = isVisible ? 'none' : 'flex';
}

// ── Navigation ──
export function goTo(screenId, pushHistory = true) {
  const prev = document.querySelector('.pupa-screen-view.active');
  const next = document.getElementById(`pupa-screen-${screenId}`);
  if (!next || screenId === currentScreen) return;

  if (pushHistory) screenHistory.push(currentScreen);

  if (prev) prev.classList.remove('active');
  next.classList.add('active', 'slide-in');
  setTimeout(() => next.classList.remove('slide-in'), 350);

  currentScreen = screenId;

  // If this is a registered app, render it
  if (appRegistry[screenId]?.render) {
    appRegistry[screenId].render(next);
  }
}

export function goBack() {
  if (screenHistory.length === 0) { goHome(); return; }
  const prev = screenHistory.pop();
  const curr = document.querySelector('.pupa-screen-view.active');
  const target = document.getElementById(`pupa-screen-${prev}`);
  if (!target) return;
  curr?.classList.remove('active');
  target.classList.add('active');
  currentScreen = prev;
}

export function goHome() {
  screenHistory = [];
  goTo('home', false);
}

// ── Toast ──
export function showToast(msg) {
  const el = document.getElementById('pupa-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

// ── Modals ──
export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// ── Build the phone shell HTML ──
function _buildShell() {
  return `
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

      <!-- Lock screen -->
      <div id="pupa-screen-lock" class="pupa-screen-view active">
        <div class="pupa-lock-wp"></div>
        <div class="pupa-lock-time">
          <div class="pupa-hour">9:41</div>
          <div class="pupa-date">среда, 11 ноября</div>
        </div>
        <button class="pupa-lock-unlock" onclick="window.__pupa.goHome()">${t('unlock')}</button>
      </div>

      <!-- Home screen -->
      <div id="pupa-screen-home" class="pupa-screen-view">
        <div class="pupa-home-wp"></div>
        <div id="pupa-app-grid"></div>
        <div id="pupa-dock"></div>
      </div>

      <!-- App screens get mounted here dynamically -->
      <div id="pupa-app-container"></div>

      <!-- Modals container -->
      <div id="pupa-modals"></div>

      <!-- Home indicator -->
      <div id="pupa-home-indicator" onclick="window.__pupa.goHome()"></div>

      <!-- Toast -->
      <div id="pupa-toast"></div>
    </div>
  </div>`;
}

// ── Clock ──
function _startClock() {
  function tick() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${h}:${m}`;

    document.querySelectorAll('.pupa-time, .pupa-lock-time .pupa-hour').forEach(el => {
      el.textContent = timeStr;
    });

    const days = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
    const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    const dateEl = document.querySelector('.pupa-lock-time .pupa-date');
    if (dateEl) {
      dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
    }
  }
  tick();
  setInterval(tick, 10000);
}

// ── Navigation wiring ──
function _wireNavigation() {
  // Expose navigation globally for inline onclick handlers
  window.__pupa = {
    goTo: goTo,
    goBack: goBack,
    goHome: goHome,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
  };
}

// ── Home screen rendering ──
function _renderHomeScreen() {
  const settings = getGlobal();
  const order = settings.appOrder || ['sms', 'instagram', 'twitter', 'telegram', 'bank', 'onlyfans', 'reddit', 'gallery', 'settings'];

  // App grid
  const grid = document.getElementById('pupa-app-grid');
  if (grid) {
    grid.innerHTML = order.map(id => {
      const app = appRegistry[id];
      if (!app) return '';
      return `
        <div class="pupa-app-icon-wrap" onclick="window.__pupa.goTo('${id}')">
          <div class="pupa-app-icon pupa-icon-${id}">${app.icon}</div>
          <span class="pupa-app-label">${t(id)}</span>
        </div>`;
    }).join('');
  }

  // Dock
  const dock = document.getElementById('pupa-dock');
  if (dock) {
    const dockApps = ['sms', 'instagram', 'telegram', 'settings'];
    dock.innerHTML = dockApps.map(id => {
      const app = appRegistry[id];
      if (!app) return '';
      return `<div class="pupa-dock-icon pupa-icon-${id}" onclick="window.__pupa.goTo('${id}')">${app.icon}</div>`;
    }).join('');
  }
}

// ── Create a screen view element for an app ──
export function createAppScreen(id) {
  let el = document.getElementById(`pupa-screen-${id}`);
  if (el) return el;

  el = document.createElement('div');
  el.id = `pupa-screen-${id}`;
  el.className = 'pupa-screen-view';
  document.getElementById('pupa-app-container')?.appendChild(el);
  return el;
}
