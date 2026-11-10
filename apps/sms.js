/**
 * pupaphone — SMS app
 */

import { t } from '../core/i18n.js';
import {
  getChat,
  getThread,
  upsertThread,
  addMessage,
  getAllContacts,
} from '../core/state.js';
import { generate } from '../core/generator.js';
import { goTo, goBack, createAppScreen, showToast, openModal, closeModal } from '../ui/phone-shell.js';

// ── Init ──
export function initSmsApp(el) {
  el.innerHTML = _buildThreadList();
  _wireThreadList(el);
}

// ── Thread list ──
function _buildThreadList() {
  const chat = getChat();
  const threads = Object.entries(chat.threads || {});

  const threadHTML = threads.length > 0
    ? threads.map(([key, thread]) => _buildThreadItem(key, thread)).join('')
    : `<div style="text-align:center;color:#636366;padding:60px 20px;font-size:15px;">
         Пока тихо.<br>Сообщений нет.
       </div>`;

  return `
  <div class="pupa-app-shell" style="background:#000;">
    <div class="pupa-nav-bar" style="border-bottom:1px solid #2c2c2e;">
      <span class="pupa-back-btn" onclick="window.__pupa.goBack()">‹ ${t('home')}</span>
      <span class="pupa-nav-title">${t('sms_title')}</span>
      <span class="pupa-nav-action" style="color:#0a84ff;cursor:pointer;" title="${t('check_messages')}"
        onclick="window.__pupa_sms.checkMessages()">↻</span>
    </div>
    <div class="pupa-app-scroll">
      <div class="pupa-sms-search">
        <span>🔍</span><span>${t('search')}</span>
      </div>
      <div id="pupa-thread-list">
        ${threadHTML}
      </div>
    </div>
  </div>`;
}

function _buildThreadItem(key, thread) {
  const lastMsg = thread.messages?.[thread.messages.length - 1];
  const preview = lastMsg
    ? (lastMsg.sticker ? `📎 ${t('sticker_name') || 'Стикер'}` : lastMsg.text?.slice(0, 40) || '')
    : '';
  const time = lastMsg ? _formatTime(lastMsg.ts) : '';
  const unread = thread.unread || 0;
  const initial = (thread.displayName || '?')[0].toUpperCase();
  const color = _avatarColor(key);

  return `
  <div class="pupa-thread-item" onclick="window.__pupa_sms.openChat('${key}')">
    <div class="pupa-thread-avatar" style="background:${color}">${initial}</div>
    <div class="pupa-thread-info">
      <div class="pupa-thread-row1">
        <span class="pupa-thread-name">${thread.displayName || key}</span>
        <span class="pupa-thread-time">${time}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="pupa-thread-preview">${preview}</span>
        ${unread > 0 ? `<span class="pupa-thread-badge">${unread}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function _wireThreadList(el) {
  window.__pupa_sms = {
    openChat: (key) => _openChat(key),
    checkMessages: () => _checkMessages(),
  };
}

// ── Chat view ──
function _openChat(key) {
  const thread = getThread(key);
  // Mark as read
  upsertThread(key, { unread: 0 });

  const chatScreenId = `sms-chat-${key}`;
  let chatEl = createAppScreen(chatScreenId);
  chatEl.innerHTML = _buildChatView(key, thread);
  _wireChatView(chatEl, key);

  goTo(chatScreenId);
}

function _buildChatView(key, thread) {
  const name = thread.displayName || key;
  const initial = name[0].toUpperCase();
  const color = _avatarColor(key);
  const msgs = thread.messages || [];

  const msgsHTML = msgs.length > 0
    ? msgs.map(m => _buildMessageBubble(m, initial, color)).join('')
    : `<div style="text-align:center;color:#636366;padding:40px 20px;font-size:14px;">Начало переписки</div>`;

  return `
  <div class="pupa-app-shell" style="background:#000;">
    <div class="pupa-nav-bar" style="border-bottom:1px solid #1c1c1e;">
      <span class="pupa-back-btn" onclick="window.__pupa.goBack()">‹ ${t('back')}</span>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div class="pupa-thread-avatar" style="background:${color};width:36px;height:36px;border-radius:18px;font-size:16px;">${initial}</div>
        <span style="font-size:12px;color:#636366;">${name}</span>
      </div>
      <span style="min-width:70px;"></span>
    </div>
    <div class="pupa-app-scroll" id="pupa-chat-scroll-${key}">
      <div class="pupa-msg-list" id="pupa-msg-list-${key}">
        ${msgsHTML}
      </div>
    </div>
    <div class="pupa-chat-input-bar">
      <div class="pupa-chat-plus-btn" onclick="window.__pupa_sms.openPicker('${key}')">+</div>
      <input class="pupa-chat-input-field" id="pupa-chat-input-${key}"
        placeholder="${t('message_placeholder')}"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.__pupa_sms.sendMessage('${key}');}"/>
      <div class="pupa-chat-send-btn" onclick="window.__pupa_sms.sendMessage('${key}')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L7 13M7 1L2 6M7 1L12 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  </div>`;
}

function _buildMessageBubble(msg, initial, color) {
  const isOut = msg.direction === 'outgoing';
  const time = _formatTime(msg.ts);

  if (msg.sticker) {
    return `
    <div class="pupa-msg-row ${isOut ? 'outgoing' : 'incoming'}">
      ${!isOut ? `<div class="pupa-thread-avatar" style="background:${color};width:28px;height:28px;border-radius:14px;font-size:13px;">${initial}</div>` : ''}
      <div class="pupa-msg-bubble pupa-msg-sticker">
        <div style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:60px;">${msg.sticker}</div>
      </div>
      <span class="pupa-msg-time">${time}</span>
    </div>`;
  }

  return `
  <div class="pupa-msg-row ${isOut ? 'outgoing' : 'incoming'}">
    ${!isOut ? `<div class="pupa-thread-avatar" style="background:${color};width:28px;height:28px;border-radius:14px;font-size:13px;">${initial}</div>` : ''}
    <div class="pupa-msg-bubble">${_escapeHtml(msg.text || '')}</div>
    <span class="pupa-msg-time">${time}</span>
  </div>`;
}

function _wireChatView(el, key) {
  const thread = getThread(key);
  const name = thread.displayName || key;

  window.__pupa_sms.sendMessage = async (k) => {
    const input = document.getElementById(`pupa-chat-input-${k}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const msg = addMessage(k, { direction: 'outgoing', text });
    _appendMessageBubble(k, msg, _avatarColor(k));
    _scrollToBottom(k);

    // Generate reply
    await _generateReply(k, text);
  };

  window.__pupa_sms.openPicker = (k) => {
    // Simple picker modal
    const existing = document.getElementById('pupa-sms-picker-modal');
    if (existing) {
      openModal('pupa-sms-picker-modal');
      return;
    }
    const modal = document.createElement('div');
    modal.id = 'pupa-sms-picker-modal';
    modal.className = 'pupa-modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) closeModal('pupa-sms-picker-modal'); };
    modal.innerHTML = `
      <div class="pupa-modal-sheet">
        <div class="pupa-modal-handle"></div>
        <div class="pupa-modal-title">${t('attach_title')}</div>
        <div class="pupa-picker-item" onclick="closeModal('pupa-sms-picker-modal');window.__pupa.showToast('${t('attach_stickers')} — скоро')">
          <div class="pupa-picker-icon" style="background:#ff9f0a;">🐱</div>
          <span>${t('attach_stickers')}</span>
        </div>
        <div class="pupa-picker-item" onclick="closeModal('pupa-sms-picker-modal');window.__pupa.showToast('${t('attach_gallery')}')">
          <div class="pupa-picker-icon" style="background:#bf5af2;">🖼️</div>
          <span>${t('attach_gallery')}</span>
        </div>
        <div class="pupa-picker-item" onclick="closeModal('pupa-sms-picker-modal');window.__pupa.showToast('${t('attach_gen')} — настрой имадж-модель')">
          <div class="pupa-picker-icon" style="background:#30d158;">✦</div>
          <span>${t('attach_gen')}</span>
        </div>
      </div>`;
    document.getElementById('pupa-modals')?.appendChild(modal);
    requestAnimationFrame(() => openModal('pupa-sms-picker-modal'));
  };

  // Scroll to bottom on open
  setTimeout(() => _scrollToBottom(key), 100);
}

function _appendMessageBubble(key, msg, color) {
  const list = document.getElementById(`pupa-msg-list-${key}`);
  if (!list) return;
  const thread = getThread(key);
  const initial = (thread.displayName || '?')[0].toUpperCase();
  const html = _buildMessageBubble(msg, initial, color);
  list.insertAdjacentHTML('beforeend', html);
}

function _scrollToBottom(key) {
  const scroll = document.getElementById(`pupa-chat-scroll-${key}`);
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}

// ── Generate reply ──
async function _generateReply(key, userText) {
  const thread = getThread(key);
  const contact = getAllContacts()[key];
  const displayName = thread.displayName || key;
  const canonicalName = contact?.canonicalName || displayName;
  const aliases = (contact?.aliases || []).filter(a => a !== displayName && a !== canonicalName);

  // Show typing indicator
  const list = document.getElementById(`pupa-msg-list-${key}`);
  const typingId = `pupa-typing-${key}`;
  if (list) {
    list.insertAdjacentHTML('beforeend', `
      <div id="${typingId}" class="pupa-msg-row incoming">
        <div class="pupa-thread-avatar" style="background:${_avatarColor(key)};width:28px;height:28px;border-radius:14px;font-size:13px;">${displayName[0]}</div>
        <div class="pupa-msg-bubble" style="color:#636366;">···</div>
      </div>`);
    _scrollToBottom(key);
  }

  // Build history for context
  const history = (thread.messages || []).slice(-8).map(m =>
    m.direction === 'outgoing' ? `Я: ${m.text}` : `${displayName}: ${m.text}`
  ).join('\n');

  const aliasBlock = aliases.length > 0
    ? `\nАлиасы этого персонажа: ${aliases.join(', ')}`
    : '';

  const prompt = `[Ты отвечаешь за ${canonicalName} (отображается как "${displayName}"${aliasBlock}) в переписке.
Пиши кратко, живо, в характере персонажа.
История переписки:
${history}

Ответь на последнее сообщение игрока одним коротким сообщением. Только текст ответа, без имён и кавычек.]`;

  try {
    const raw = await generate(prompt, { responseLength: 150 });
    // Clean the response
    const text = _cleanReply(raw, displayName, canonicalName);

    document.getElementById(typingId)?.remove();

    if (text) {
      const msg = addMessage(key, { direction: 'incoming', text });
      _appendMessageBubble(key, msg, _avatarColor(key));
      _scrollToBottom(key);
    }
  } catch (e) {
    document.getElementById(typingId)?.remove();
    showToast(`Ошибка генерации: ${e.message}`);
  }
}

// ── Check messages (bot-initiated) ──
async function _checkMessages() {
  const chat = getChat();
  const contacts = getAllContacts();
  if (Object.keys(contacts).length === 0) {
    showToast('Нет контактов. Добавь NPC в настройках.');
    return;
  }

  showToast('Проверяю...');

  // Ask model who might have written something
  const names = Object.values(contacts).map(c => c.displayName || c.canonicalName).join(', ');
  const prompt = `[В телефоне игрока есть контакты: ${names}.
Реши, кто из них мог написать сообщение прямо сейчас, исходя из сюжета.
Ответь в формате: ИМЯ|ТЕКСТ СООБЩЕНИЯ
Если никто не написал — ответь: НИКТО
Только одна строка.]`;

  try {
    const raw = await generate(prompt, { responseLength: 80 });
    if (!raw || raw.trim().toUpperCase().startsWith('НИКТО')) {
      showToast('Пока тихо.');
      return;
    }

    const parts = raw.trim().split('|');
    if (parts.length < 2) { showToast('Пока тихо.'); return; }

    const [name, ...rest] = parts;
    const text = rest.join('|').trim();
    const key = name.trim().toLowerCase().replace(/\s+/g, '_');

    if (!getThread(key).messages) upsertThread(key, { displayName: name.trim(), messages: [] });
    const msg = addMessage(key, { direction: 'incoming', text });

    // Re-render thread list
    const listEl = document.getElementById('pupa-thread-list');
    if (listEl) {
      const updated = getChat();
      listEl.innerHTML = Object.entries(updated.threads || {})
        .map(([k, t]) => _buildThreadItem(k, t)).join('');
    }

    showToast(`💬 ${name.trim()} написал(а)`);
  } catch (e) {
    showToast(`Ошибка: ${e.message}`);
  }
}

// ── Helpers ──
function _cleanReply(text, ...names) {
  if (!text) return '';
  let clean = text.trim();
  // Strip leading "Name: " pattern
  for (const name of names) {
    const r = new RegExp(`^${name}\\s*:\\s*`, 'i');
    clean = clean.replace(r, '');
  }
  // Strip markdown, quotes, sign-offs
  clean = clean
    .replace(/^["«»"']|["«»"']$/g, '')
    .replace(/^#{1,6}[ \t]*/gm, '')
    .trim();
  // Min length guard
  if (!clean || clean.split(/\s+/).filter(Boolean).length < 1) return '';
  return clean;
}

function _formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  return days[d.getDay()];
}

function _avatarColor(key) {
  const colors = [
    'linear-gradient(135deg,#5856d6,#af52de)',
    'linear-gradient(135deg,#ff6b6b,#ee2a7b)',
    'linear-gradient(135deg,#f9ce34,#f7971e)',
    'linear-gradient(135deg,#4cd964,#34c759)',
    'linear-gradient(135deg,#0a84ff,#1e96c8)',
    'linear-gradient(135deg,#ff4500,#cc3700)',
  ];
  let hash = 0;
  for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

function _escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
