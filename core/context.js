/**
 * pupaphone — context injector
 *
 * Builds a compact phone digest and injects it into the generation context
 * via setExtensionPrompt on GENERATION_STARTED.
 *
 * Key rules:
 * - Skips quiet/impersonate/continue generations
 * - Never pushes to ctx.chat
 * - Caps the digest at ~1200 chars
 * - Labels itself as narrator background, not a player action
 */

import {
  eventSource,
  event_types,
  setExtensionPrompt,
  extension_prompt_types,
  extension_prompt_roles,
} from '../../../../../script.js';
import { getGlobal, getRecentEvents, getChat } from './state.js';
import { t } from './i18n.js';

const KEY = 'pupaphone';

export function initContextInjection() {
  eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);
  eventSource.on(event_types.GENERATION_ENDED, clearInjection);
  eventSource.on(event_types.GENERATION_STOPPED, clearInjection);
  eventSource.on(event_types.CHAT_CHANGED, clearInjection);
}

function clearInjection() {
  setExtensionPrompt(KEY, '', extension_prompt_types.IN_CHAT, 0);
}

function onGenerationStarted(type) {
  // Skip generation types that shouldn't see the phone state
  if (type === 'quiet' || type === 'impersonate' || type === 'continue' || type === 'dry') {
    return;
  }

  const settings = getGlobal();
  if (!settings.hintEnabled) return;

  const digest = buildDigest();
  if (!digest) return;

  setExtensionPrompt(
    KEY,
    digest,
    extension_prompt_types.IN_CHAT,
    settings.injectionDepth ?? 0,
    false,
    extension_prompt_roles.USER,
  );
}

function buildDigest() {
  const events = getRecentEvents();
  const chat = getChat();
  const lines = [];

  // ── Recent events ──
  if (events.length > 0) {
    lines.push('События:');
    for (const e of events) {
      lines.push(`• ${e.text}`);
    }
  }

  // ── Current phone state summary ──
  const statusLines = [];

  // Unread SMS/Telegram
  const threads = chat.threads || {};
  const unreadThreads = Object.entries(threads)
    .filter(([, t]) => (t.unread || 0) > 0)
    .map(([k, t]) => `${t.displayName || k} (${t.unread})`);
  if (unreadThreads.length > 0) {
    statusLines.push(`Непрочитанные: ${unreadThreads.join(', ')}`);
  }

  // Bank balance (if set)
  const bank = chat.bank || {};
  if (bank.balance !== undefined && bank.balance !== 0) {
    statusLines.push(`Баланс: ${bank.balance} ${bank.currency || '₽'}`);
  }

  if (statusLines.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Телефон:');
    lines.push(...statusLines);
  }

  if (lines.length === 0) return '';

  const content = lines.join('\n');

  // Also include the RP-bridge directive so the model knows to annotate
  const directive = buildRpDirective();

  const full = `[📱 Телефон — фон сцены, не реплика игрока]\n${content}\n\n${directive}`;

  // Hard cap at 1200 chars
  if (full.length > 1200) {
    return full.slice(0, 1197) + '...';
  }
  return full;
}

function buildRpDirective() {
  return `Если в ролевой персонаж отправляет СМС — добавь тег: <!--pupa:sms:{"to":"Имя","text":"текст сообщения"}-->
Если кто-то делает фото — добавь тег: <!--pupa:photo:{"desc":"краткое описание","who":["имена в кадре"],"source":"кто снял"}-->
Теги в тексте не видны игроку.`.trim();
}
