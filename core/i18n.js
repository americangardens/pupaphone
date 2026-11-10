/**
 * pupaphone — i18n strings
 * All UI text goes through t(key). Generated content language
 * is controlled by the model, not here.
 */

const STRINGS = {
  ru: {
    // App labels (home screen + dock)
    sms: 'Сообщения',
    instagram: 'Instagram',
    twitter: 'Twitter',
    telegram: 'Telegram',
    bank: 'Банк',
    onlyfans: 'OnlyFans',
    reddit: 'Reddit',
    gallery: 'Фото',
    settings: 'Настройки',

    // Nav
    back: 'Назад',
    home: 'Домой',
    edit: 'Править',

    // SMS
    sms_title: 'Сообщения',
    search: 'Поиск',
    message_placeholder: 'Сообщение...',
    check_messages: 'Проверить сообщения',

    // Instagram
    ig_title: 'Instagram',
    ig_notifications: 'Уведомления',
    ig_direct: 'Direct',
    compose_title: 'Создать публикацию',
    compose_post: 'Пост',
    compose_story: 'Сторис',
    compose_prompt_label: 'Описание / промпт для фото',
    compose_caption_label: 'Подпись',
    compose_btn: 'Сгенерировать и опубликовать',
    compose_btn_story: 'Сгенерировать сторис',
    generating: 'Генерирую...',

    // Bank
    bank_title: 'Банк',
    bank_balance: 'Доступный баланс',
    bank_transfer: 'Перевести',
    bank_topup: 'Пополнить',
    bank_history: 'История',
    bank_card: 'Карта',
    bank_recent: 'Последние операции',

    // Settings sections
    settings_title: 'Настройки',
    phone_section: 'Телефон',
    api_text: 'API — Текстовая модель',
    api_img: 'API — Генерация изображений',
    stickers_section: 'Стикерпаки',
    context_section: 'Контекст',
    lorebooks_section: 'Лорбуки',
    me_section: 'Я',
    npc_section: 'NPC',

    // Settings rows
    owner_name: 'Имя',
    wallpaper: 'Обои',
    language: 'Язык интерфейса',
    text_profile: 'Профиль',
    text_profile_sub: 'Выбери профиль API',
    use_main_profile: 'Основной профиль ST',
    img_provider: 'Провайдер',
    img_model: 'Модель',
    img_key: 'API ключ',
    img_key_saved: 'Ключ сохранён',
    img_key_placeholder: 'Вставь ключ...',
    img_test: 'Тест',
    img_load_models: 'Загрузить модели',
    sticker_pack: 'Стикерпак',
    stickers_count: 'стикеров',
    add_pack: 'Добавить пак',
    injection_depth: 'Глубина инъекции',
    max_events: 'Максимум событий',
    phone_hint: 'Подсказка телефона',
    npc_scan: 'Найти NPC из чата',
    npc_scan_sub: 'Сканирует историю и добавляет персонажей',
    npc_add: 'Добавить вручную',
    npc_from_card: 'из карточки',
    npc_from_lore: 'из лорбука',
    npc_from_chat: 'из истории чата',
    me_appearance: 'Внешность для фото',
    me_appearance_auto: 'авто из персоны',
    lorebooks_hint: 'Лорбуки управляются в ST. Pupaphone использует все активные автоматически.',
    active: 'активен',
    inactive: 'выкл',

    // Chat picker
    attach_title: 'Вложение',
    attach_stickers: 'Стикеры',
    attach_gallery: 'Фото из галереи',
    attach_camera: 'Сделать фото',
    attach_gen: 'Сгенерировать фото',

    // Misc
    unlock: 'Разблокировать',
    soon: 'скоро',
  },

  en: {
    sms: 'Messages',
    instagram: 'Instagram',
    twitter: 'Twitter',
    telegram: 'Telegram',
    bank: 'Bank',
    onlyfans: 'OnlyFans',
    reddit: 'Reddit',
    gallery: 'Photos',
    settings: 'Settings',

    back: 'Back',
    home: 'Home',
    edit: 'Edit',

    sms_title: 'Messages',
    search: 'Search',
    message_placeholder: 'Message...',
    check_messages: 'Check messages',

    ig_title: 'Instagram',
    ig_notifications: 'Notifications',
    ig_direct: 'Direct',
    compose_title: 'Create post',
    compose_post: 'Post',
    compose_story: 'Story',
    compose_prompt_label: 'Description / image prompt',
    compose_caption_label: 'Caption',
    compose_btn: 'Generate & publish',
    compose_btn_story: 'Generate story',
    generating: 'Generating...',

    bank_title: 'Bank',
    bank_balance: 'Available balance',
    bank_transfer: 'Transfer',
    bank_topup: 'Top up',
    bank_history: 'History',
    bank_card: 'Card',
    bank_recent: 'Recent transactions',

    settings_title: 'Settings',
    phone_section: 'Phone',
    api_text: 'API — Text Model',
    api_img: 'API — Image Generation',
    stickers_section: 'Sticker Packs',
    context_section: 'Context',
    lorebooks_section: 'Lorebooks',
    me_section: 'Me',
    npc_section: 'NPC',

    owner_name: 'Name',
    wallpaper: 'Wallpaper',
    language: 'Interface language',
    text_profile: 'Profile',
    text_profile_sub: 'Select an API profile',
    use_main_profile: 'Main ST profile',
    img_provider: 'Provider',
    img_model: 'Model',
    img_key: 'API key',
    img_key_saved: 'Key saved',
    img_key_placeholder: 'Paste key...',
    img_test: 'Test',
    img_load_models: 'Load models',
    sticker_pack: 'Sticker pack',
    stickers_count: 'stickers',
    add_pack: 'Add pack',
    injection_depth: 'Injection depth',
    max_events: 'Max events',
    phone_hint: 'Phone hint',
    npc_scan: 'Find NPCs from chat',
    npc_scan_sub: 'Scans history and adds characters',
    npc_add: 'Add manually',
    npc_from_card: 'from character card',
    npc_from_lore: 'from lorebook',
    npc_from_chat: 'from chat history',
    me_appearance: 'Appearance for photos',
    me_appearance_auto: 'auto from persona',
    lorebooks_hint: 'Lorebooks are managed in ST. Pupaphone uses all active ones automatically.',
    active: 'active',
    inactive: 'off',

    attach_title: 'Attachment',
    attach_stickers: 'Stickers',
    attach_gallery: 'Photo from gallery',
    attach_camera: 'Take photo',
    attach_gen: 'Generate photo',

    unlock: 'Unlock',
    soon: 'soon',
  },
};

let currentLang = 'ru';

export function t(key) {
  return (STRINGS[currentLang] && STRINGS[currentLang][key]) || key;
}

export function setLanguage(lang) {
  if (STRINGS[lang]) currentLang = lang;
}

export function getLanguage() {
  return currentLang;
}

export function getAvailableLanguages() {
  return Object.keys(STRINGS);
}
