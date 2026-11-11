/**
 * pupaphone — bootstrap
 * Entry point loaded by SillyTavern.
 */

import {
  eventSource,
  event_types,
} from '../../../../script.js';

import { getGlobal, setGlobal, resetChatState } from './core/state.js';
import { setLanguage } from './core/i18n.js';
import { initContextInjection } from './core/context.js';
import { initRpBridge } from './core/rp-bridge.js';
import {
  mountPhone,
  togglePhone,
  registerApp,
  createAppScreen,
  showToast,
} from './ui/phone-shell.js';

import { initSmsApp } from './apps/sms.js';
import { initInstagramApp } from './apps/instagram.js';
import { initBankApp } from './apps/bank.js';
import { initSettingsApp } from './apps/settings.js';

// ── Boot ──
// Module is loaded dynamically after page is ready, so DOMContentLoaded already fired.
// Don't rely on jQuery ready — just run after a tick to let ST finish its own init.
jQuery(async () => {
  _boot();
});

function _boot() {
  try {
    console.log('[pupaphone] boot start');

    // Inject CSS via import.meta.url (same as travelers-folio)
    const cssId = 'pupaphone-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = new URL('./ui/styles.css', import.meta.url).href + '?t=' + Date.now();
      document.head.appendChild(link);
    }

    // Apply saved language
    const settings = getGlobal();
    setLanguage(settings.language || 'ru');

    // Register apps
    _registerApps();

    // Mount FAB + phone
    _mountFab();
    mountPhone();

    // Wire ST events
    initContextInjection();
    initRpBridge();

    eventSource.on(event_types.CHAT_CHANGED, () => {
      resetChatState();
    });

    // Add minimal placeholder to ST extensions panel
    _mountExtensionPanel();

    console.log('[pupaphone] boot OK — FAB and phone mounted');
  } catch (err) {
    console.error('[pupaphone] boot error:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _boot);
} else {
  // DOM is already ready — wait one tick so ST modules can finish init
  setTimeout(_boot, 0);
}

// ── Register all apps ──
function _registerApps() {
  registerApp('sms', {
    icon: '💬',
    label: 'sms',
    order: 1,
    render: (el) => initSmsApp(el),
  });

  registerApp('instagram', {
    icon: '📷',
    label: 'instagram',
    order: 2,
    render: (el) => initInstagramApp(el),
  });

  registerApp('twitter', {
    icon: '𝕏',
    label: 'twitter',
    order: 3,
    render: (el) => _comingSoon(el, 'Twitter / X'),
  });

  registerApp('telegram', {
    icon: '✈️',
    label: 'telegram',
    order: 4,
    render: (el) => _comingSoon(el, 'Telegram'),
  });

  registerApp('bank', {
    icon: '💳',
    label: 'bank',
    order: 5,
    render: (el) => initBankApp(el),
  });

  registerApp('onlyfans', {
    icon: '🔵',
    label: 'onlyfans',
    order: 6,
    render: (el) => _comingSoon(el, 'OnlyFans'),
  });

  registerApp('reddit', {
    icon: '👽',
    label: 'reddit',
    order: 7,
    render: (el) => _comingSoon(el, 'Reddit'),
  });

  registerApp('gallery', {
    icon: '🖼️',
    label: 'gallery',
    order: 8,
    render: (el) => _comingSoon(el, 'Галерея'),
  });

  registerApp('settings', {
    icon: '⚙️',
    label: 'settings',
    order: 9,
    render: (el) => initSettingsApp(el),
  });
}

// ── FAB ──
function _mountFab() {
  if (document.getElementById('pupa-fab')) return;

  const fab = document.createElement('div');
  fab.id = 'pupa-fab';
  fab.innerHTML = '📱<span class="pupa-badge" id="pupa-fab-badge" style="display:none">0</span>';
  fab.addEventListener('click', togglePhone);
  document.body.appendChild(fab);

  _makeDraggable(fab);
}

/**
 * Make the FAB draggable: tap to open phone, drag to reposition.
 * Uses pointer events for unified mouse/touch support.
 * Position is saved to extension_settings.
 */
function _makeDraggable(el) {
  let dragging = false;
  let startX = 0, startY = 0;
  let offsetX = 0, offsetY = 0;
  let moved = false;
  const DRAG_THRESHOLD = 6;

  // Restore saved position
  const saved = getGlobal();
  if (saved.fabX != null && saved.fabY != null) {
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = `${saved.fabX}px`;
    el.style.top = `${saved.fabY}px`;
  }

  el.addEventListener('pointerdown', (e) => {
    const rect = el.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    offsetX = rect.left;
    offsetY = rect.top;
    moved = false;
    dragging = true;
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  });

  document.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    moved = true;

    let nx = offsetX + dx;
    let ny = offsetY + dy;

    // Clamp to viewport with some margin
    const margin = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    nx = Math.max(margin, Math.min(nx, window.innerWidth - w - margin));
    ny = Math.max(margin, Math.min(ny, window.innerHeight - h - margin));

    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = `${nx}px`;
    el.style.top = `${ny}px`;
  });

  document.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = '';
    el.style.userSelect = '';

    if (moved) {
      // Save position
      const rect = el.getBoundingClientRect();
      setGlobal({ fabX: rect.left, fabY: rect.top });
      // Suppress the click that follows (so it doesn't toggle the phone)
      e.stopPropagation();
      e.preventDefault();
      el._suppressClick = true;
    }
  });

  // Suppress click if we just dragged
  el.addEventListener('click', (e) => {
    if (el._suppressClick) {
      e.stopPropagation();
      e.preventDefault();
      el._suppressClick = false;
    }
  }, true);
}

// ── Coming soon placeholder ──
function _comingSoon(el, name) {
  el.innerHTML = `
    <div class="pupa-app-shell" style="background:#000;align-items:center;justify-content:center;">
      <div style="text-align:center;color:#636366;padding:40px 20px;">
        <div style="font-size:60px;margin-bottom:16px;">🚧</div>
        <div style="font-size:20px;font-weight:600;color:#fff;margin-bottom:8px;">${name}</div>
        <div style="font-size:15px;">Скоро</div>
      </div>
      <div style="position:absolute;top:70px;left:16px;">
        <span class="pupa-back-btn" onclick="window.__pupa.goBack()">‹ Назад</span>
      </div>
    </div>`;
}

// ── ST extensions panel placeholder ──
function _mountExtensionPanel() {
  const container = document.getElementById('extensions_settings');
  if (!container) return;

  const panel = document.createElement('div');
  panel.id = 'pupa-ext-panel';
  panel.style.cssText = 'padding:12px 0;';
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="font-size:24px;">📱</div>
      <div>
        <div style="font-weight:600;">pupaphone</div>
        <div style="font-size:13px;color:var(--SmartThemeQuoteColor,#888);">Все настройки — внутри телефона ⚙️</div>
      </div>
      <button class="menu_button" style="margin-left:auto;" onclick="document.getElementById('pupa-phone').style.display='flex'">
        Открыть
      </button>
    </div>`;

  container.appendChild(panel);
}
