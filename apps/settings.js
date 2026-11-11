/**
 * pupaphone — Settings app
 */
import { t, setLanguage, getLanguage } from '../core/i18n.js';
import { getGlobal, setGlobal, setGlobalSetting, getChat, upsertContact } from '../core/state.js';
import { getProfiles, fetchImageModels } from '../core/generator.js';
import { scanContactsFromHistory } from '../core/rp-bridge.js';
import { showToast } from '../ui/phone-shell.js';
import { writeSecret } from '../../../../secrets.js';

export function initSettingsApp(el) {
  el.innerHTML = _build();
  _wire(el);
}

function _build() {
  const settings = getGlobal();
  const lang = getLanguage();
  const profiles = getProfiles();
  const profileOpts = profiles.map(p =>
    `<option value="${p.name}" ${settings.textProfile === p.name ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  const loreStatus = _buildLorebookStatus();
  const npcList = _buildNpcList();

  return `
  <div class="pupa-app-shell" style="background:#000;">
    <div class="pupa-nav-bar" style="border-bottom:1px solid #2c2c2e;">
      <span class="pupa-back-btn" onclick="window.__pupa.goBack()">‹ ${t('home')}</span>
      <span class="pupa-nav-title">${t('settings_title')}</span>
    </div>
    <div class="pupa-app-scroll" style="background:#000;">
      <div style="padding-bottom:40px;">

        <!-- Телефон -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">${t('phone_section')}</div>
          <div class="pupa-settings-group">
            <div class="pupa-settings-row">
              <div class="pupa-settings-row-icon" style="background:#636366;">👤</div>
              <span class="pupa-settings-row-label">${t('owner_name')}</span>
              <span class="pupa-settings-row-value" id="pupa-s-owner-val">${settings.ownerName || 'Игрок'}</span>
              <span class="pupa-settings-chevron">›</span>
            </div>
            <div class="pupa-settings-row" style="cursor:default;">
              <div class="pupa-settings-row-icon" style="background:#1c1c1e;border:1px solid #636366;">🌐</div>
              <span class="pupa-settings-row-label">${t('language')}</span>
              <div style="display:flex;gap:6px;">
                <span id="pupa-s-lang-ru" onclick="window.__pupa_settings.setLang('ru')"
                  style="padding:4px 10px;border-radius:8px;font-size:14px;cursor:pointer;
                  background:${lang === 'ru' ? '#0a84ff' : '#2c2c2e'};
                  color:${lang === 'ru' ? '#fff' : '#636366'};font-weight:${lang === 'ru' ? '600' : '400'};">RU</span>
                <span id="pupa-s-lang-en" onclick="window.__pupa_settings.setLang('en')"
                  style="padding:4px 10px;border-radius:8px;font-size:14px;cursor:pointer;
                  background:${lang === 'en' ? '#0a84ff' : '#2c2c2e'};
                  color:${lang === 'en' ? '#fff' : '#636366'};font-weight:${lang === 'en' ? '600' : '400'};">EN</span>
              </div>
            </div>
          </div>
        </div>

        <!-- API — Текстовая модель -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">${t('api_text')}</div>
          <div class="pupa-settings-group">
            <div class="pupa-settings-row" style="cursor:default;">
              <div class="pupa-settings-row-icon" style="background:#0a84ff;">🔗</div>
              <span class="pupa-settings-row-label">${t('text_profile')}</span>
              <select id="pupa-s-profile" onchange="window.__pupa_settings.saveProfile(this.value)"
                style="background:#2c2c2e;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:14px;max-width:160px;">
                <option value="">${profiles.length === 0 ? 'Нет профилей' : 'Осн. профиль ST'}</option>
                ${profileOpts}
              </select>
            </div>
            <div class="pupa-settings-row" style="cursor:default;">
              <div class="pupa-settings-row-icon" style="background:#30d158;">⚡</div>
              <span class="pupa-settings-row-label">${t('use_main_profile')}</span>
              <div class="pupa-toggle ${settings.useMainProfile ? '' : 'off'}" id="pupa-s-main-toggle"
                onclick="window.__pupa_settings.toggleMainProfile()"></div>
            </div>
          </div>
        </div>

        <!-- API — Имадж -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">${t('api_img')}</div>
          <div class="pupa-settings-group">
            <div class="pupa-settings-row" style="cursor:default;">
              <div class="pupa-settings-row-icon" style="background:#ff9f0a;">🎨</div>
              <span class="pupa-settings-row-label">${t('img_provider')}</span>
              <select id="pupa-s-imgprovider" onchange="window.__pupa_settings.saveImgProvider(this.value)"
                style="background:#2c2c2e;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:14px;">
                <option value="" ${!settings.imgProvider ? 'selected' : ''}>Не задан</option>
                <option value="gemini" ${settings.imgProvider === 'gemini' ? 'selected' : ''}>Gemini</option>
                <option value="openai" ${settings.imgProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                <option value="custom" ${settings.imgProvider === 'custom' ? 'selected' : ''}>Custom URL</option>
              </select>
            </div>
            <div class="pupa-settings-row" id="pupa-s-imgurl-row" style="cursor:default;${settings.imgProvider !== 'custom' ? 'display:none;' : ''}">
              <div class="pupa-settings-row-icon" style="background:#636366;">🔗</div>
              <span class="pupa-settings-row-label">URL</span>
              <input id="pupa-s-imgurl" value="${settings.imgUrl || ''}" placeholder="https://..."
                style="flex:1;background:#2c2c2e;border:1px solid #3a3a3c;border-radius:8px;padding:6px 10px;color:#fff;font-size:14px;outline:none;"
                onchange="window.__pupa_settings.saveImgUrl(this.value)"/>
            </div>
            <div class="pupa-settings-row" style="cursor:default;padding-top:8px;padding-bottom:8px;">
              <div class="pupa-settings-row-icon" style="background:#5856d6;">🗝️</div>
              <div style="flex:1;">
                <div class="pupa-settings-row-label">${t('img_key')}</div>
                <div style="display:flex;gap:6px;margin-top:6px;">
                  <input id="pupa-s-imgkey" type="password"
                    placeholder="${settings.imgKeySecretName ? t('img_key_saved') : t('img_key_placeholder')}"
                    style="flex:1;background:#2c2c2e;border:1px solid #3a3a3c;border-radius:8px;padding:6px 10px;color:#fff;font-size:14px;font-family:monospace;outline:none;"/>
                  <button onclick="window.__pupa_settings.saveImgKey()"
                    style="background:#1c3a5c;color:#0a84ff;border:1px solid #0a4080;border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;white-space:nowrap;">
                    Сохранить
                  </button>
                </div>
                <div id="pupa-s-imgkey-hint" style="display:none;font-size:12px;color:#ff9f0a;margin-top:8px;line-height:1.5;">
                  ⚠️ Включи <code>allowKeysExposure: true</code> в <code>config.yaml</code>, чтобы расширение могло использовать ключ для генерации картинок.
                </div>
              </div>
            </div>
            <div class="pupa-settings-row" style="cursor:default;padding-top:8px;padding-bottom:8px;">
              <div class="pupa-settings-row-icon" style="background:#5856d6;">🤖</div>
              <div style="flex:1;">
                <div class="pupa-settings-row-label">${t('img_model')}</div>
                <div style="display:flex;gap:6px;margin-top:6px;">
                  <select id="pupa-s-imgmodel" onchange="window.__pupa_settings.saveImgModel(this.value)"
                    style="flex:1;background:#2c2c2e;color:#fff;border:1px solid #3a3a3c;border-radius:8px;padding:6px 10px;font-size:13px;">
                    ${settings.imgModel ? `<option value="${settings.imgModel}" selected>${settings.imgModel}</option>` : '<option value="">Не выбрана</option>'}
                  </select>
                  <button onclick="window.__pupa_settings.loadModels()"
                    style="background:#1c3a5c;color:#0a84ff;border:1px solid #0a4080;border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;white-space:nowrap;">
                    ${t('img_load_models')}
                  </button>
                </div>
              </div>
            </div>
            <div class="pupa-settings-row" style="cursor:pointer;" onclick="window.__pupa_settings.testImgApi()">
              <div class="pupa-settings-row-icon" style="background:#30d158;">✓</div>
              <span class="pupa-settings-row-label" id="pupa-s-imgtest-label">${t('img_test')}</span>
            </div>
          </div>
        </div>

        <!-- Контекст -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">${t('context_section')}</div>
          <div class="pupa-settings-group">
            <div class="pupa-settings-row" style="cursor:default;">
              <div class="pupa-settings-row-icon" style="background:#30d158;">📱</div>
              <span class="pupa-settings-row-label">${t('phone_hint')}</span>
              <div class="pupa-toggle ${settings.hintEnabled ? '' : 'off'}" id="pupa-s-hint-toggle"
                onclick="window.__pupa_settings.toggleHint()"></div>
            </div>
            <div class="pupa-settings-row" style="cursor:default;">
              <div class="pupa-settings-row-icon" style="background:#636366;">📏</div>
              <span class="pupa-settings-row-label">${t('injection_depth')}</span>
              <select id="pupa-s-depth" onchange="window.__pupa_settings.saveDepth(this.value)"
                style="background:#2c2c2e;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:14px;">
                ${[0,1,2,3,4,5].map(n => `<option value="${n}" ${settings.injectionDepth === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Лорбуки -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">${t('lorebooks_section')}</div>
          <div class="pupa-settings-group">
            ${loreStatus}
            <div class="pupa-settings-row" style="cursor:default;padding-top:10px;padding-bottom:10px;">
              <span style="font-size:13px;color:#636366;line-height:1.4;">${t('lorebooks_hint')}</span>
            </div>
          </div>
        </div>

        <!-- Я -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">${t('me_section')}</div>
          <div class="pupa-settings-group">
            <div class="pupa-settings-row" style="cursor:default;padding-top:8px;padding-bottom:8px;">
              <div class="pupa-settings-row-icon" style="background:#bf5af2;">💁</div>
              <div style="flex:1;">
                <div class="pupa-settings-row-label">${t('me_appearance')}</div>
                <div style="font-size:12px;color:#636366;margin-top:2px;">${t('me_appearance_auto')}</div>
                <textarea id="pupa-s-appearance" placeholder="${t('me_appearance_auto')}"
                  style="width:100%;margin-top:8px;background:#2c2c2e;border:1px solid #3a3a3c;border-radius:8px;padding:8px;color:#fff;font-size:13px;font-family:inherit;resize:none;height:60px;outline:none;"
                  onchange="window.__pupa_settings.saveAppearance(this.value)"
                >${settings.userAppearance || ''}</textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Wallpaper -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">🖼 Обои</div>
          <div class="pupa-settings-group">
            <!-- Preview -->
            <div class="pupa-settings-row" style="cursor:default;padding:10px 0;">
              <div id="pupa-wp-preview" style="
                width:60px;height:100px;border-radius:10px;
                background:${settings.wallpaper ? `url(${settings.wallpaper}) center/cover` : '#1c1c1e'};
                filter:blur(${settings.wallpaperBlur || 0}px);
                border:1px solid #3a3a3c;flex-shrink:0;overflow:hidden;
              "></div>
              <div style="flex:1;padding-left:12px;">
                <div class="pupa-settings-row-label">Фон и обои</div>
                <div style="font-size:12px;color:#636366;margin-top:2px;">Lock screen и Home screen</div>
                <label style="display:inline-block;margin-top:8px;padding:6px 14px;background:#0a84ff;color:#fff;border-radius:8px;font-size:13px;cursor:pointer;">
                  Выбрать фото
                  <input type="file" accept="image/*" style="display:none;"
                    onchange="window.__pupa_settings.setWallpaper(this)">
                </label>
                ${settings.wallpaper ? `<button onclick="window.__pupa_settings.clearWallpaper()"
                  style="margin-left:8px;padding:6px 14px;background:#2c2c2e;color:#ff453a;border:1px solid #3a3a3c;border-radius:8px;font-size:13px;cursor:pointer;">Убрать</button>` : ''}
              </div>
            </div>
            <!-- Blur slider -->
            <div class="pupa-settings-row" style="cursor:default;border-top:1px solid #3a3a3c;">
              <div class="pupa-settings-row-icon" style="background:#636366;">💧</div>
              <span class="pupa-settings-row-label">Размытие</span>
              <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:flex-end;">
                <input type="range" min="0" max="20" value="${settings.wallpaperBlur || 0}"
                  oninput="window.__pupa_settings.setBlur(this.value)"
                  style="width:120px;accent-color:#0a84ff;">
                <span id="pupa-wp-blur-val" style="font-size:13px;color:#636366;min-width:28px;text-align:right;">${settings.wallpaperBlur || 0}px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- NPC -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">${t('npc_section')}</div>
          <div class="pupa-settings-group">
            <div class="pupa-settings-row" onclick="window.__pupa_settings.scanNpcs()">
              <div class="pupa-settings-row-icon" style="background:#0a84ff;" id="pupa-s-scan-icon">🔄</div>
              <div style="flex:1;">
                <div class="pupa-settings-row-label">${t('npc_scan')}</div>
                <div style="font-size:12px;color:#636366;margin-top:2px;">${t('npc_scan_sub')}</div>
              </div>
            </div>
            <div id="pupa-s-npc-list">${npcList}</div>
            <div class="pupa-settings-row" onclick="window.__pupa.showToast('${t('npc_add')} — скоро')"
              style="border-top:1px solid #3a3a3c;">
              <div class="pupa-settings-row-icon" style="background:#0a84ff;font-size:20px;font-weight:300;">+</div>
              <span class="pupa-settings-row-label" style="color:#0a84ff;">${t('npc_add')}</span>
            </div>
          </div>
        </div>

        <!-- Diagnostics -->
        <div class="pupa-settings-section">
          <div class="pupa-settings-section-title">🔧 Диагностика</div>
          <div class="pupa-settings-group">
            <div class="pupa-settings-row" style="cursor:default;padding:12px 0;border-bottom:1px solid #3a3a3c;">
              <div style="flex:1;font-size:13px;line-height:1.5;color:#636366;">
                <div style="margin-bottom:6px;"><b>Статус:</b> <span style="color:#30d158;">✓ Работает</span></div>
                <div style="margin-bottom:6px;"><b>Стиль:</b> <span id="pupa-diag-css" style="color:#0a84ff;">✓ Загружен</span></div>
                <div style="margin-bottom:6px;"><b>Хранилище:</b> <span id="pupa-diag-storage" style="color:#30d158;">✓ OK</span></div>
                <div style="margin-bottom:6px;"><b>Имадж ключ:</b> <span id="pupa-diag-imgkey" style="color:#636366;">— не проверен</span></div>
                <div><b>Чатов:</b> <span id="pupa-diag-chats">0</span></div>
              </div>
            </div>
            <div class="pupa-settings-row" style="cursor:pointer;" onclick="window.__pupa_settings && window.__pupa_settings.runDiagnostics()">
              <div class="pupa-settings-row-icon" style="background:#5856d6;font-size:18px;">🔍</div>
              <span class="pupa-settings-row-label">Запустить проверку</span>
              <span class="pupa-settings-chevron">›</span>
            </div>
          </div>
        </div>

        <div style="height:40px;"></div>
      </div>
    </div>
  </div>`;
}

function _buildLorebookStatus() {
  try {
    const ctx = SillyTavern.getContext();
    const books = ctx.worldInfoData || {};
    const names = Object.keys(books);
    if (names.length === 0) return `<div class="pupa-settings-row" style="cursor:default;"><span style="font-size:13px;color:#636366;">Нет активных лорбуков</span></div>`;
    return names.map(name => `
      <div class="pupa-settings-row" style="cursor:default;">
        <div class="pupa-settings-row-icon" style="background:#30d158;">📖</div>
        <div style="flex:1;">
          <div class="pupa-settings-row-label">${name}</div>
        </div>
        <span style="font-size:12px;background:#1a3a1a;color:#30d158;padding:3px 8px;border-radius:6px;">${t('active')}</span>
      </div>`).join('');
  } catch {
    return `<div class="pupa-settings-row" style="cursor:default;"><span style="font-size:13px;color:#636366;">Лорбуки загрузятся при открытии чата</span></div>`;
  }
}

function _buildNpcList() {
  const chat = getChat();
  const contacts = Object.entries(chat.contacts || {});
  if (contacts.length === 0) return '';

  const sourceLabel = { 'character-card': t('npc_from_card'), 'lorebook': t('npc_from_lore'), 'rp-bridge': t('npc_from_chat') };
  return contacts.map(([key, c]) => {
    const initial = (c.displayName || '?')[0].toUpperCase();
    const src = sourceLabel[c.source] || c.source;
    return `
    <div class="pupa-settings-row">
      <div style="width:30px;height:30px;border-radius:15px;background:linear-gradient(135deg,#5856d6,#af52de);display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;flex-shrink:0">${initial}</div>
      <div style="flex:1;">
        <div class="pupa-settings-row-label">${c.displayName || key}</div>
        <div style="font-size:12px;color:#636366;margin-top:2px;">${c.canonicalName || ''} · ${src}</div>
      </div>
      <span class="pupa-settings-chevron">›</span>
    </div>`;
  }).join('');
}

function _wire(el) {
  window.__pupa_settings = {
    setLang: (lang) => {
      setLanguage(lang);
      setGlobalSetting('language', lang);
      // Update toggle styles
      document.getElementById('pupa-s-lang-ru').style.cssText += `background:${lang==='ru'?'#0a84ff':'#2c2c2e'};color:${lang==='ru'?'#fff':'#636366'};font-weight:${lang==='ru'?'600':'400'};`;
      document.getElementById('pupa-s-lang-en').style.cssText += `background:${lang==='en'?'#0a84ff':'#2c2c2e'};color:${lang==='en'?'#fff':'#636366'};font-weight:${lang==='en'?'600':'400'};`;
      showToast(lang === 'ru' ? 'Язык: Русский 🇷🇺' : 'Language: English 🇬🇧');
    },

    saveProfile: (name) => { setGlobalSetting('textProfile', name); },
    toggleMainProfile: () => {
      const s = getGlobal();
      setGlobalSetting('useMainProfile', !s.useMainProfile);
      document.getElementById('pupa-s-main-toggle')?.classList.toggle('off', !getGlobal().useMainProfile);
    },
    toggleHint: () => {
      const s = getGlobal();
      setGlobalSetting('hintEnabled', !s.hintEnabled);
      document.getElementById('pupa-s-hint-toggle')?.classList.toggle('off', !getGlobal().hintEnabled);
    },
    saveDepth: (v) => setGlobalSetting('injectionDepth', parseInt(v, 10)),

    saveImgProvider: (v) => {
      setGlobalSetting('imgProvider', v);
      document.getElementById('pupa-s-imgurl-row').style.display = v === 'custom' ? '' : 'none';
    },
    saveImgUrl: (v) => setGlobalSetting('imgUrl', v),
    saveImgModel: (v) => setGlobalSetting('imgModel', v),
    saveAppearance: (v) => setGlobalSetting('userAppearance', v),

    saveImgKey: async () => {
      const input = document.getElementById('pupa-s-imgkey');
      if (!input || !input.value.trim()) return;
      const key = input.value.trim();
      const secretName = 'pupaphone_img_key';
      try {
        await writeSecret(secretName, key, 'pupaphone image API key');
        setGlobalSetting('imgKeySecretName', secretName);
        input.value = '';
        input.placeholder = t('img_key_saved');

        // Probe allowKeysExposure — if 403, tell the user
        const ctx = SillyTavern.getContext();
        const probe = await fetch('/api/secrets/find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...ctx.getRequestHeaders() },
          body: JSON.stringify({ key: secretName }),
        });
        if (probe.status === 403) {
          showToast('✅ Ключ сохранён. Для генерации включи allowKeysExposure: true в config.yaml');
          const lbl = document.getElementById('pupa-s-imgkey-hint');
          if (lbl) { lbl.style.display = 'block'; lbl.style.color = '#ff9f0a'; }
        } else {
          showToast('✅ Ключ сохранён и доступен');
          const lbl = document.getElementById('pupa-s-imgkey-hint');
          if (lbl) lbl.style.display = 'none';
        }
      } catch (e) {
        showToast(`Ошибка: ${e.message}`);
      }
    },

    loadModels: async () => {
      showToast(t('img_load_models') + '...');
      try {
        const models = await fetchImageModels();
        const sel = document.getElementById('pupa-s-imgmodel');
        if (!sel) return;
        const current = getGlobal().imgModel || '';
        sel.innerHTML = `<option value="">Выбрать...</option>` +
          models.map(m => `<option value="${m}" ${m === current ? 'selected' : ''}>${m}</option>`).join('');
        showToast(`Загружено ${models.length} моделей`);
      } catch (e) {
        showToast(`Ошибка: ${e.message}`);
      }
    },

    testImgApi: async () => {
      const lbl = document.getElementById('pupa-s-imgtest-label');
      if (lbl) lbl.textContent = '⏳ Проверяю...';
      try {
        const { generateImage } = await import('../core/generator.js');
        await generateImage('a small red circle, test image');
        if (lbl) lbl.textContent = '✅ OK';
        showToast('Имадж-модель работает!');
      } catch (e) {
        if (lbl) lbl.textContent = '❌ Ошибка';
        showToast(e.message);
      }
    },

    scanNpcs: () => {
      const icon = document.getElementById('pupa-s-scan-icon');
      if (icon) { icon.style.transform = 'rotate(360deg)'; icon.style.transition = 'transform 0.6s'; }
      setTimeout(() => {
        try {
          const found = scanContactsFromHistory();
          for (const c of found) {
            const key = c.displayName.toLowerCase().replace(/\s+/g, '_');
            upsertContact(key, c);
          }
          const list = document.getElementById('pupa-s-npc-list');
          if (list) list.innerHTML = _buildNpcList();
          showToast(`✦ Найдено ${found.length} NPC`);
        } catch (e) {
          showToast(e.message);
        }
        if (icon) { icon.style.transform = ''; icon.style.transition = ''; }
      }, 600);
    },

    setWallpaper: (input) => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        setGlobalSetting('wallpaper', dataUrl);
        // Apply to backgrounds
        document.querySelectorAll('.pupa-lock-wp, .pupa-home-wp').forEach(el => {
          el.style.backgroundImage = `url(${dataUrl})`;
        });
        const blur = getGlobal().wallpaperBlur || 0;
        document.querySelectorAll('.pupa-lock-wp, .pupa-home-wp').forEach(el => {
          el.style.filter = blur > 0 ? `blur(${blur}px)` : '';
        });
        // Update preview
        const preview = document.getElementById('pupa-wp-preview');
        if (preview) preview.style.backgroundImage = `url(${dataUrl})`;
        showToast('✅ Обои установлены');
      };
      reader.readAsDataURL(file);
    },

    clearWallpaper: () => {
      setGlobalSetting('wallpaper', '');
      document.querySelectorAll('.pupa-lock-wp, .pupa-home-wp').forEach(el => {
        el.style.backgroundImage = '';
        el.style.filter = '';
      });
      const preview = document.getElementById('pupa-wp-preview');
      if (preview) { preview.style.backgroundImage = ''; preview.style.background = '#1c1c1e'; }
      showToast('Обои убраны');
    },

    setBlur: (val) => {
      const blur = parseInt(val, 10);
      setGlobalSetting('wallpaperBlur', blur);
      const wp = getGlobal().wallpaper;
      document.querySelectorAll('.pupa-lock-wp, .pupa-home-wp').forEach(el => {
        el.style.filter = blur > 0 ? `blur(${blur}px)` : '';
      });
      const preview = document.getElementById('pupa-wp-preview');
      if (preview) preview.style.filter = blur > 0 ? `blur(${blur}px)` : '';
      const label = document.getElementById('pupa-wp-blur-val');
      if (label) label.textContent = `${blur}px`;
    },

    runDiagnostics: async () => {
      const results = [];

      // 1. CSS loaded?
      const cssEl = document.getElementById('pupaphone-css');
      const cssOk = !!cssEl;
      const diag_css = document.getElementById('pupa-diag-css');
      if (diag_css) {
        diag_css.textContent = cssOk ? '✓ Загружен' : '✗ Не найден';
        diag_css.style.color = cssOk ? '#0a84ff' : '#ff453a';
      }
      results.push(`CSS: ${cssOk ? 'OK' : 'MISSING'}`);

      // 2. Storage readable?
      let storageOk = false;
      try {
        const s = getGlobal();
        storageOk = typeof s === 'object';
      } catch {}
      const diag_storage = document.getElementById('pupa-diag-storage');
      if (diag_storage) {
        diag_storage.textContent = storageOk ? '✓ OK' : '✗ Ошибка';
        diag_storage.style.color = storageOk ? '#30d158' : '#ff453a';
      }
      results.push(`Storage: ${storageOk ? 'OK' : 'ERROR'}`);

      // 3. ST context available?
      let ctxOk = false;
      let ctxDetail = '';
      try {
        const ctx = SillyTavern.getContext();
        ctxOk = !!ctx;
        ctxDetail = ctx.chatId ? ` (чат: ${ctx.chatId.slice(0, 20)}...)` : ' (нет чата)';
      } catch (e) {
        ctxDetail = ` (${e.message})`;
      }
      results.push(`Context: ${ctxOk ? 'OK' + ctxDetail : 'ERROR' + ctxDetail}`);

      // 4. Chat metadata count
      try {
        const ctx = SillyTavern.getContext();
        const count = Object.keys(ctx.chat_metadata?.pupaphone?.threads || {}).length;
        const diag_chats = document.getElementById('pupa-diag-chats');
        if (diag_chats) diag_chats.textContent = count;
        results.push(`Threads: ${count}`);
      } catch {}

      // 5. __pupa API
      const apiOk = typeof window.__pupa === 'object';
      results.push(`API: ${apiOk ? 'OK' : 'ERROR'}`);

      // 6. Image API key accessible?
      try {
        const s = getGlobal();
        if (!s.imgKeySecretName) {
          results.push('Image key: NOT SET');
          const lbl = document.getElementById('pupa-diag-imgkey');
          if (lbl) { lbl.textContent = '— не задан'; lbl.style.color = '#636366'; }
        } else {
          const ctx = SillyTavern.getContext();
          const res = await fetch('/api/secrets/find', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...ctx.getRequestHeaders() },
            body: JSON.stringify({ key: s.imgKeySecretName }),
          });
          const lbl = document.getElementById('pupa-diag-imgkey');
          if (res.status === 403) {
            results.push('Image key: BLOCKED (allowKeysExposure=false)');
            if (lbl) { lbl.textContent = '⚠️ закрыт (allowKeysExposure)'; lbl.style.color = '#ff9f0a'; }
          } else if (res.ok) {
            results.push('Image key: OK');
            if (lbl) { lbl.textContent = '✓ доступен'; lbl.style.color = '#30d158'; }
          } else {
            results.push(`Image key: NOT FOUND (${res.status})`);
            if (lbl) { lbl.textContent = '✗ не найден'; lbl.style.color = '#ff453a'; }
          }
        }
      } catch (e) {
        results.push(`Image key: ERROR (${e.message})`);
      }

      // Log to console for detailed debug
      console.log('[pupaphone] Diagnostics:\n' + results.join('\n'));

      showToast(`🔍 ${results.filter(r => !r.includes('ERROR') && !r.includes('MISSING')).length}/${results.length} проверок OK`);
    },
  };
}
