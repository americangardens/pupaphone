/**
 * pupaphone — RP bridge
 *
 * Parses <!--pupa:*--> tags from AI responses and updates chat metadata.
 * Called on MESSAGE_RECEIVED. Never writes to ctx.chat — only to metadata.
 */

import { eventSource, event_types } from '../../../../../script.js';
import { addMessage, upsertThread, getContact, upsertContact, addGalleryItem, addEvent } from './state.js';

const SMS_TAG    = /<!--pupa:sms:(\{.*?\})-->/g;
const PHOTO_TAG  = /<!--pupa:photo:(\{.*?\})-->/g;

export function initRpBridge() {
  eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onMessageReceived);
}

function onMessageReceived() {
  const ctx = SillyTavern.getContext();
  const chat = ctx.chat;
  if (!chat || chat.length === 0) return;

  // Check the last message
  const lastMsg = chat[chat.length - 1];
  if (!lastMsg || lastMsg.is_user) return;

  const text = lastMsg.mes || '';

  parseSmsTag(text);
  parsePhotoTag(text);
}

function parseSmsTag(text) {
  SMS_TAG.lastIndex = 0;
  let match;
  while ((match = SMS_TAG.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (!data.to || !data.text) continue;

      // Build a thread key from the recipient name
      const key = normalizeKey(data.to);

      // Ensure contact exists
      if (!getContact(key)) {
        // Try to resolve from ST context
        const contact = resolveContactFromST(data.to);
        upsertContact(key, {
          displayName: data.to,
          canonicalName: contact?.canonicalName || data.to,
          aliases: contact?.aliases || [],
          source: contact?.source || 'rp-bridge',
        });

        // Ensure thread exists
        upsertThread(key, {
          displayName: data.to,
          unread: 0,
          messages: [],
        });
      }

      // Add the outgoing message
      addMessage(key, {
        direction: 'outgoing',
        text: data.text,
        fromRp: true,
      });

      addEvent({ text: `📱 Отправлено СМС → ${data.to}: «${data.text.slice(0, 50)}${data.text.length > 50 ? '…' : ''}»` });
    } catch (e) {
      console.warn('[pupaphone] SMS tag parse error', e, match[1]);
    }
  }
}

function parsePhotoTag(text) {
  PHOTO_TAG.lastIndex = 0;
  let match;
  while ((match = PHOTO_TAG.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (!data.desc) continue;

      addGalleryItem({
        desc: data.desc,
        who: data.who || [],
        source: data.source || 'unknown',
        generated: false,
        fromRp: true,
      });

      addEvent({ text: `📷 Фото: ${data.desc.slice(0, 60)}${data.desc.length > 60 ? '…' : ''}` });
    } catch (e) {
      console.warn('[pupaphone] photo tag parse error', e, match[1]);
    }
  }
}

// ── Contact resolution ──

function normalizeKey(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-яёa-z0-9_]/gi, '');
}

function resolveContactFromST(displayName) {
  try {
    const ctx = SillyTavern.getContext();
    const lore = ctx.worldInfoData || {};
    const charCard = ctx.characters?.find(c =>
      c.name?.toLowerCase() === displayName.toLowerCase()
    );

    if (charCard) {
      return {
        canonicalName: charCard.name,
        aliases: [charCard.name],
        source: 'character-card',
      };
    }

    // Try world info
    for (const book of Object.values(lore)) {
      for (const entry of (book.entries || [])) {
        const keys = entry.key || [];
        if (keys.some(k => k.toLowerCase() === displayName.toLowerCase())) {
          return {
            canonicalName: displayName,
            aliases: keys,
            source: 'lorebook',
          };
        }
      }
    }
  } catch (e) {
    // Non-critical, just log
    console.warn('[pupaphone] contact resolve error', e);
  }
  return null;
}

/**
 * Scan the full chat history for all contacts mentioned via pupa tags.
 * Called on demand from Settings → NPC → "Find NPCs from chat".
 * Returns an array of discovered contact objects.
 */
export function scanContactsFromHistory() {
  const ctx = SillyTavern.getContext();
  const chat = ctx.chat || [];
  const found = new Map();

  for (const msg of chat) {
    const text = msg.mes || '';

    SMS_TAG.lastIndex = 0;
    let match;
    while ((match = SMS_TAG.exec(text)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        if (data.to) {
          const key = normalizeKey(data.to);
          if (!found.has(key)) {
            const resolved = resolveContactFromST(data.to);
            found.set(key, {
              displayName: data.to,
              canonicalName: resolved?.canonicalName || data.to,
              aliases: resolved?.aliases || [],
              source: resolved?.source || 'rp-bridge',
            });
          }
        }
      } catch {}
    }
  }

  // Also find ST characters referenced in the chat by name
  try {
    const ctx2 = SillyTavern.getContext();
    const characters = ctx2.characters || [];
    for (const char of characters) {
      if (!char.name) continue;
      const key = normalizeKey(char.name);
      if (!found.has(key)) {
        // Check if mentioned in any message
        const mentioned = chat.some(m =>
          (m.mes || '').includes(char.name) || m.name === char.name
        );
        if (mentioned) {
          found.set(key, {
            displayName: char.name,
            canonicalName: char.name,
            aliases: [char.name],
            source: 'character-card',
          });
        }
      }
    }
  } catch {}

  return Array.from(found.values());
}
