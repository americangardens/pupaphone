/**
 * pupaphone — storage layer
 *
 * Global settings  → extension_settings.pupaphone (survives across chats)
 * Per-chat state    → chat_metadata.pupaphone    (reset per new chat)
 * API keys          → secrets.json via writeSecret/readSecret (never in settings)
 */

import { extension_settings, saveMetadataDebounced } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';

// ── Defaults ──

const DEFAULT_GLOBAL = {
  enabled: true,
  language: 'ru',
  theme: 'dark',              // 'dark' | 'light'
  textProfile: '',            // Connection Manager profile name (empty = use main ST profile)
  useMainProfile: false,      // fallback to main ST profile
  // Image generation
  imgProvider: '',            // 'gemini' | 'openai' | 'custom'
  imgModel: '',               // model name
  imgUrl: '',                 // custom URL (for 'custom' provider)
  imgKeySecretName: '',       // name of the key stored in secrets.json
  // Context injection
  hintEnabled: true,           // inject phone digest into context
  injectionDepth: 0,           // depth for setExtensionPrompt
  maxEvents: 15,               // max events in digest
  // Stickers
  stickerPacks: [],            // [{ id, name, stickers: [{ id, name, meaning, dataUrl }] }]
  // Home screen layout
  appOrder: ['sms', 'instagram', 'twitter', 'telegram', 'bank', 'onlyfans', 'reddit', 'gallery', 'settings'],
  // Identity overrides (empty = auto from ST cards)
  userAppearance: '',          // manual override for user's photo-gen appearance
  npcAppearances: {},          // { contactKey: "appearance text" }
};

const DEFAULT_CHAT = {
  threads: {},                 // SMS/Telegram threads keyed by contact
  instagram: {
    posts: [],
    stories: [],
    dmThreads: {},
  },
  twitter: {
    feed: [],
    tweets: [],
  },
  bank: {
    balance: 0,
    currency: '',
    transactions: [],
  },
  onlyfans: {
    myPage: null,              // { posts: [], subscribers: 0, earnings: 0 }
    feed: [],
    dmThreads: {},
  },
  reddit: {
    feed: [],
    posts: [],
  },
  gallery: [],                 // [{ id, desc, who, source, dataUrl?, generated }]
  contacts: {},                // { key: { displayName, canonicalName, aliases, source } }
  events: [],                  // recent phone events for the digest
  unlocked: true,              // lock screen state
};

// ── Global settings ──

export function getGlobal() {
  if (!extension_settings.pupaphone) {
    extension_settings.pupaphone = {};
  }
  // Merge defaults so old settings never crash on a missing field
  return { ...DEFAULT_GLOBAL, ...extension_settings.pupaphone };
}

export function setGlobal(patch) {
  if (!extension_settings.pupaphone) {
    extension_settings.pupaphone = {};
  }
  Object.assign(extension_settings.pupaphone, patch);
  saveSettingsDebounced();
}

export function getGlobalSetting(key) {
  return getGlobal()[key];
}

export function setGlobalSetting(key, value) {
  setGlobal({ [key]: value });
}

// ── Per-chat state ──

export function getChat() {
  // chat_metadata is imported at the index level and passed in,
  // but we access it lazily to survive CHAT_CHANGED reloads
  const ctx = SillyTavern.getContext();
  const meta = ctx.chatMetadata;
  if (!meta.pupaphone) {
    meta.pupaphone = structuredClone(DEFAULT_CHAT);
  }
  // Merge any new default fields that didn't exist in old chats
  for (const key of Object.keys(DEFAULT_CHAT)) {
    if (meta.pupaphone[key] === undefined) {
      meta.pupaphone[key] = structuredClone(DEFAULT_CHAT[key]);
    }
  }
  return meta.pupaphone;
}

export function setChat(patch) {
  const chat = getChat();
  Object.assign(chat, patch);
  saveMetadataDebounced();
}

export function getChatSetting(key) {
  return getChat()[key];
}

export function setChatSetting(key, value) {
  const chat = getChat();
  chat[key] = value;
  saveMetadataDebounced();
}

// ── Contacts ──

export function getContact(key) {
  return getChat().contacts[key] || null;
}

export function upsertContact(key, data) {
  const contacts = getChat().contacts;
  contacts[key] = { ...contacts[key], ...data };
  saveMetadataDebounced();
  return contacts[key];
}

export function getAllContacts() {
  return getChat().contacts;
}

// ── Events (for the context digest) ──

export function addEvent(event) {
  const chat = getChat();
  const maxEvents = getGlobal().maxEvents || 15;
  chat.events.push({ ...event, ts: Date.now() });
  // Keep only the last N events
  if (chat.events.length > maxEvents * 2) {
    chat.events = chat.events.slice(-maxEvents);
  }
  saveMetadataDebounced();
}

export function getRecentEvents() {
  const events = getChat().events || [];
  const max = getGlobal().maxEvents || 15;
  return events.slice(-max);
}

// ── Threads ──

export function getThread(key) {
  return getChat().threads[key] || { messages: [], unread: 0 };
}

export function upsertThread(key, data) {
  const threads = getChat().threads;
  threads[key] = { ...threads[key], ...data };
  saveMetadataDebounced();
  return threads[key];
}

export function addMessage(threadKey, message) {
  const thread = getThread(threadKey);
  thread.messages.push({ ...message, ts: Date.now() });
  if (message.direction === 'incoming') thread.unread = (thread.unread || 0) + 1;
  upsertThread(threadKey, thread);
  return thread.messages[thread.messages.length - 1];
}

// ── Gallery ──

export function addGalleryItem(item) {
  const gallery = getChat().gallery;
  const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  gallery.push({ id, generated: false, ...item });
  saveMetadataDebounced();
  return gallery[gallery.length - 1];
}

export function getGallery() {
  return getChat().gallery || [];
}

// ── Reset (on CHAT_CHANGED when no chat is selected) ──

export function resetChatState() {
  // Do nothing — getChat() will lazy-init on next access.
  // This is called on CHAT_CHANGED so stale state doesn't bleed.
}
