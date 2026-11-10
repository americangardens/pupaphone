/**
 * pupaphone — Instagram app (skeleton)
 */
import { t } from '../core/i18n.js';
import { getChat, setChatSetting } from '../core/state.js';
import { generate } from '../core/generator.js';
import { showToast, openModal, closeModal } from '../ui/phone-shell.js';

export function initInstagramApp(el) {
  const chat = getChat();
  el.innerHTML = _build(chat);
  _wire(el);
}

function _build(chat) {
  const posts = chat.instagram?.posts || [];
  return `
  <div class="pupa-app-shell" style="background:#000;">
    <div class="pupa-ig-top-bar">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="color:#0a84ff;font-size:22px;cursor:pointer;" onclick="window.__pupa.goBack()">‹</span>
        <div class="pupa-ig-logo">${t('ig_title')}</div>
      </div>
      <div class="pupa-ig-top-icons">
        <span class="pupa-ig-top-icon" onclick="window.__pupa.showToast('${t('ig_notifications')}')">🔔</span>
        <span class="pupa-ig-top-icon" onclick="window.__pupa.showToast('${t('ig_direct')}')">💬</span>
        <span class="pupa-ig-top-icon" style="font-size:20px;font-weight:300;" onclick="window.__pupa_ig.openCompose()">＋</span>
      </div>
    </div>
    <div class="pupa-app-scroll">
      <div class="pupa-ig-stories">
        <div class="pupa-story-item">
          <div class="pupa-story-ring add" onclick="window.__pupa_ig.openCompose()">+</div>
          <span class="pupa-story-name">Твоя</span>
        </div>
      </div>
      <div id="pupa-ig-feed">
        ${posts.length > 0
          ? posts.map(p => _buildPost(p)).join('')
          : `<div style="text-align:center;color:#636366;padding:60px 20px;font-size:15px;">
               Лента пуста.<br>Нажми ＋ чтобы создать первый пост.
             </div>`}
      </div>
    </div>
    <!-- Compose modal -->
    <div id="pupa-ig-compose-modal" class="pupa-modal-overlay" onclick="if(event.target===this)window.__pupa.closeModal('pupa-ig-compose-modal')">
      <div class="pupa-modal-sheet">
        <div class="pupa-modal-handle"></div>
        <div class="pupa-modal-title">${t('compose_title')}</div>
        <div class="pupa-modal-type-row">
          <div id="pupa-ig-type-post" class="pupa-modal-type-btn active" onclick="window.__pupa_ig.setType('post')">📸 ${t('compose_post')}</div>
          <div id="pupa-ig-type-story" class="pupa-modal-type-btn" onclick="window.__pupa_ig.setType('story')">⭕ ${t('compose_story')}</div>
        </div>
        <div class="pupa-modal-label">${t('compose_prompt_label')}</div>
        <textarea class="pupa-modal-textarea" id="pupa-ig-prompt" placeholder="Опиши что должно быть на фото..."></textarea>
        <div class="pupa-modal-label">${t('compose_caption_label')}</div>
        <textarea class="pupa-modal-textarea" id="pupa-ig-caption" style="height:60px;" placeholder="Текст публикации..."></textarea>
        <div class="pupa-modal-gen-btn" id="pupa-ig-gen-btn" onclick="window.__pupa_ig.generate()">✦ ${t('compose_btn')}</div>
      </div>
    </div>
  </div>`;
}

function _buildPost(post) {
  return `
  <div class="pupa-ig-post">
    <div class="pupa-ig-post-header">
      <div class="pupa-post-avatar" style="background:${post.authorColor||'linear-gradient(45deg,#f9ce34,#ee2a7b)'}">${(post.author||'?')[0]}</div>
      <div>
        <div class="pupa-post-username">${post.author || '?'}</div>
        ${post.location ? `<div class="pupa-post-location">${post.location}</div>` : ''}
      </div>
      <div class="pupa-post-more">···</div>
    </div>
    <div class="pupa-post-image">
      ${post.imageDataUrl
        ? `<img src="${post.imageDataUrl}" style="width:100%;height:100%;object-fit:cover;">`
        : `<div style="text-align:center;">📷<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:8px;">${post.prompt || ''}</div></div>`}
      ${!post.imageDataUrl ? `<button class="pupa-post-image-label" onclick="window.__pupa_ig.genImage('${post.id}')">Сгенерировать фото</button>` : ''}
    </div>
    <div class="pupa-post-actions">
      <span class="pupa-post-action" onclick="this.classList.toggle('liked')">♥</span>
      <span class="pupa-post-action">💬</span>
      <span class="pupa-post-action">↗</span>
      <span class="pupa-post-action pupa-post-bookmark">🔖</span>
    </div>
    <div class="pupa-post-likes">${post.likes || 0} отметок «нравится»</div>
    <div class="pupa-post-caption"><span>${post.author || ''}</span> ${post.caption || ''}</div>
  </div>`;
}

function _wire(el) {
  let igType = 'post';
  window.__pupa_ig = {
    openCompose: () => window.__pupa.openModal('pupa-ig-compose-modal'),
    setType: (type) => {
      igType = type;
      document.getElementById('pupa-ig-type-post')?.classList.toggle('active', type === 'post');
      document.getElementById('pupa-ig-type-story')?.classList.toggle('active', type === 'story');
      const btn = document.getElementById('pupa-ig-gen-btn');
      if (btn) btn.textContent = `✦ ${igType === 'post' ? t('compose_btn') : t('compose_btn_story')}`;
    },
    generate: async () => {
      const prompt = document.getElementById('pupa-ig-prompt')?.value?.trim() || '';
      const caption = document.getElementById('pupa-ig-caption')?.value?.trim() || '';
      const btn = document.getElementById('pupa-ig-gen-btn');
      if (btn) { btn.textContent = t('generating'); btn.classList.add('loading'); }

      try {
        const ctx = SillyTavern.getContext();
        const charName = ctx.name2 || 'Персонаж';

        // Generate caption if empty
        let finalCaption = caption;
        if (!finalCaption) {
          const rawCaption = await generate(
            `[Ты — ${charName}. Напиши короткую подпись для ${igType === 'post' ? 'поста в Instagram' : 'сторис'}.
Тема/фото: ${prompt || 'обычный момент из жизни'}. Только текст подписи, без хэштегов, 1-2 предложения.]`,
            { responseLength: 100 }
          );
          finalCaption = rawCaption?.trim() || '';
        }

        // Add post to state
        const id = `ig_${Date.now()}`;
        const chat = getChat();
        if (!chat.instagram) chat.instagram = { posts: [], stories: [], dmThreads: {} };

        const post = {
          id,
          type: igType,
          author: charName,
          caption: finalCaption,
          prompt,
          likes: Math.floor(Math.random() * 500) + 10,
          ts: Date.now(),
        };

        if (igType === 'post') {
          chat.instagram.posts.unshift(post);
        } else {
          chat.instagram.stories.unshift(post);
        }
        setChatSetting('instagram', chat.instagram);

        window.__pupa.closeModal('pupa-ig-compose-modal');
        document.getElementById('pupa-ig-prompt').value = '';
        document.getElementById('pupa-ig-caption').value = '';

        // Re-render feed
        const feed = document.getElementById('pupa-ig-feed');
        if (feed) {
          feed.innerHTML = chat.instagram.posts.map(p => _buildPost(p)).join('');
        }

        showToast(igType === 'post' ? '📸 Пост опубликован!' : '⭕ Сторис добавлена!');
      } catch (e) {
        showToast(`Ошибка: ${e.message}`);
      } finally {
        if (btn) { btn.classList.remove('loading'); btn.textContent = `✦ ${t('compose_btn')}`; }
      }
    },
    genImage: async (postId) => {
      showToast('Генерирую фото...');
      // TODO: wire up generateImage
    },
  };
}
