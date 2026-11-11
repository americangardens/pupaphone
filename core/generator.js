/**
 * pupaphone — generation engine
 *
 * Wraps generateQuietPrompt, handles Connection Manager profile routing,
 * and provides the image generation interface.
 *
 * Key rule: ALL generation is explicit (button press or "check messages").
 * Nothing fires automatically.
 */

import {
  generateQuietPrompt,
  saveSettingsDebounced,
} from '../../../../../script.js';
import { executeSlashCommands } from '../../../../slash-commands.js';
import { extension_settings } from '../../../../extensions.js';
import { getGlobal } from './state.js';

// ── Text generation ──

/**
 * Generate text via the configured profile (or fallback to main ST profile).
 *
 * @param {string} prompt   Full prompt to send
 * @param {object} opts     Extra generateQuietPrompt options
 * @returns {Promise<string>}
 */
export async function generate(prompt, opts = {}) {
  const settings = getGlobal();
  const profileName = settings.textProfile;

  if (!profileName || settings.useMainProfile) {
    // Use whatever ST is currently configured to use
    return generateQuietPrompt({
      quietPrompt: prompt,
      skipWIAN: false,  // include lorebooks and WI
      responseLength: opts.responseLength || 600,
      ...opts,
    });
  }

  // Apply Connection Manager profile temporarily
  const profiles = SillyTavern.getContext()?.extensionSettings?.connectionManager?.profiles || [];
  const profile = profiles.find(p => p.name === profileName || p.id === profileName);

  if (!profile) {
    console.warn(`[pupaphone] profile "${profileName}" not found, falling back to main`);
    return generateQuietPrompt({
      quietPrompt: prompt,
      skipWIAN: false,
      responseLength: opts.responseLength || 600,
      ...opts,
    });
  }

  // Snapshot the fields we're about to overwrite
  const API_FIELDS = ['main_api', 'api_server', 'openai_model', 'claude_model', 'google_model', 'mistral_model'];
  const snap = {};
  for (const f of API_FIELDS) {
    snap[f] = extension_settings[f] ?? SillyTavern.getContext()[f];
  }

  try {
    // Apply profile via slash commands (the safest method across ST versions)
    if (profile.api)     await executeSlashCommands(`/api ${profile.api}`, false, null, false);
    if (profile.api_url) await executeSlashCommands(`/api-url ${profile.api_url}`, false, null, false);
    if (profile.model)   await executeSlashCommands(`/model ${profile.model}`, false, null, false);

    return await generateQuietPrompt({
      quietPrompt: prompt,
      skipWIAN: false,
      responseLength: opts.responseLength || 600,
      ...opts,
    });
  } finally {
    // Always restore — even if generation throws
    if (snap.main_api)     await executeSlashCommands(`/api ${snap.main_api}`, false, null, false).catch(() => {});
    if (snap.api_server)   await executeSlashCommands(`/api-url ${snap.api_server}`, false, null, false).catch(() => {});
    saveSettingsDebounced();
  }
}

/**
 * Returns the list of Connection Manager profiles available.
 * @returns {Array<{name: string, id: string}>}
 */
export function getProfiles() {
  // extension_settings is the same object as SillyTavern.getContext().extensionSettings
  const profiles = extension_settings?.connectionManager?.profiles;
  if (!Array.isArray(profiles)) return [];
  return profiles.map(p => ({ name: p.name, id: p.id ?? p.name }));
}

// ── Image generation ──

/**
 * Generate an image using the configured image provider.
 * Returns a data URL or throws.
 *
 * @param {string} prompt   Image description
 * @param {object} subjects Map of subject name → appearance description
 * @returns {Promise<string>}  base64 data URL
 */
export async function generateImage(prompt, subjects = {}) {
  const { imgProvider, imgModel, imgUrl, imgKeySecretName } = getGlobal();

  if (!imgProvider || !imgModel) {
    throw new Error('Image provider not configured. Open Settings → API — Генерация изображений.');
  }

  // Build identity block
  const identityBlock = Object.entries(subjects)
    .filter(([, desc]) => desc)
    .map(([name, desc]) => `IDENTITY: ${name}\n${desc}`)
    .join('\n\n');

  const fullPrompt = identityBlock
    ? `${prompt}\n\nSubject identity reference (match faces exactly, do not transfer features between persons):\n${identityBlock}`
    : prompt;

  // Read the key from server-side secrets
  let apiKey = '';
  if (imgKeySecretName) {
    try {
      const response = await fetch('/api/secrets/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...SillyTavern.getContext().getRequestHeaders() },
        body: JSON.stringify({ key: imgKeySecretName }),
      });
      if (response.ok) {
        const data = await response.json();
        apiKey = data.value || '';
      }
    } catch (e) {
      console.warn('[pupaphone] could not read img key', e);
    }
  }

  if (!apiKey) {
    throw new Error('Image API key not set. Open Settings → API — Генерация изображений.');
  }

  const baseUrl = imgProvider === 'custom'
    ? imgUrl
    : imgProvider === 'gemini'
      ? 'https://generativelanguage.googleapis.com/v1beta'
      : 'https://api.openai.com/v1';

  if (imgProvider === 'gemini') {
    return _generateGemini(fullPrompt, imgModel, apiKey, baseUrl);
  } else {
    return _generateOpenAI(fullPrompt, imgModel, apiKey, baseUrl);
  }
}

async function _generateGemini(prompt, model, apiKey, baseUrl) {
  const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini image: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) throw new Error('Gemini: no image in response');
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

async function _generateOpenAI(prompt, model, apiKey, baseUrl) {
  const res = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n: 1, response_format: 'b64_json', size: '1024x1024' }),
  });
  if (!res.ok) throw new Error(`OpenAI image: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI: no image in response');
  return `data:image/png;base64,${b64}`;
}

/**
 * Fetch available models from the configured provider endpoint.
 * Returns an array of model name strings.
 */
export async function fetchImageModels() {
  const { imgProvider, imgUrl, imgKeySecretName } = getGlobal();
  if (!imgProvider) return [];

  let apiKey = '';
  if (imgKeySecretName) {
    try {
      const res = await fetch('/api/secrets/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...SillyTavern.getContext().getRequestHeaders() },
        body: JSON.stringify({ key: imgKeySecretName }),
      });
      if (res.status === 403) {
        throw new Error('Ключ скрыт SillyTavern. Включи allowKeysExposure: true в config.yaml');
      }
      if (res.ok) apiKey = (await res.json()).value || '';
    } catch (e) {
      if (e.message.includes('allowKeysExposure')) throw e;
    }
  }

  if (!apiKey) throw new Error('Нет ключа. Укажи его и нажми «Сохранить».');

  if (imgProvider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
  }

  const baseUrl = imgProvider === 'custom' ? imgUrl : 'https://api.openai.com/v1';
  const res = await fetch(`${baseUrl}/models`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map(m => m.id).filter(id => id.includes('image') || id.includes('dall'));
}
