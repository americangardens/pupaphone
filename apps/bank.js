/**
 * pupaphone — Bank app
 */
import { t } from '../core/i18n.js';
import { getChat, setChatSetting, addEvent } from '../core/state.js';
import { generate } from '../core/generator.js';
import { showToast } from '../ui/phone-shell.js';

export function initBankApp(el) {
  el.innerHTML = _build();
  _wire(el);
}

function _build() {
  const chat = getChat();
  const bank = chat.bank || { balance: 0, currency: '₽', transactions: [] };
  const txns = bank.transactions || [];

  const txnHTML = txns.length > 0
    ? txns.map(x => _buildTxn(x)).join('')
    : `<div style="text-align:center;color:#636366;padding:30px;font-size:14px;">Операций нет</div>`;

  return `
  <div class="pupa-app-shell" style="background:#000;">
    <div class="pupa-nav-bar" style="border-bottom:1px solid #2c2c2e;">
      <span class="pupa-back-btn" onclick="window.__pupa.goBack()">‹ ${t('home')}</span>
      <span class="pupa-nav-title">${t('bank_title')}</span>
      <span style="min-width:70px;"></span>
    </div>
    <div class="pupa-app-scroll">
      <div class="pupa-bank-card">
        <div class="pupa-bank-logo">Pupa Bank</div>
        <div class="pupa-bank-balance" id="pupa-bank-bal">${_fmtMoney(bank.balance || 0)}</div>
        <div class="pupa-bank-label">${t('bank_balance')}</div>
        <div class="pupa-bank-card-row">
          <div>
            <div class="pupa-bank-card-name" id="pupa-bank-name">Игрок</div>
            <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px;">${t('bank_card')}</div>
          </div>
          <div style="text-align:right;">
            <div class="pupa-bank-card-exp">•••• ${(bank.cardLast4 || '4242')}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px;">VALID THRU 12/29</div>
          </div>
        </div>
        <div class="pupa-bank-card-num">•••• •••• •••• ${(bank.cardLast4 || '4242')}</div>
      </div>

      <div class="pupa-bank-actions">
        <div class="pupa-bank-action" onclick="window.__pupa_bank.topUp()">
          <div class="pupa-bank-action-icon" style="color:#30d158;">↓</div>
          <span class="pupa-bank-action-label">${t('bank_topup')}</span>
        </div>
        <div class="pupa-bank-action" onclick="window.__pupa_bank.transfer()">
          <div class="pupa-bank-action-icon" style="color:#0a84ff;">↑</div>
          <span class="pupa-bank-action-label">${t('bank_transfer')}</span>
        </div>
        <div class="pupa-bank-action" onclick="window.__pupa_bank.requestStatement()">
          <div class="pupa-bank-action-icon" style="color:#ff9f0a;">≡</div>
          <span class="pupa-bank-action-label">${t('bank_history')}</span>
        </div>
      </div>

      <div class="pupa-bank-section-header">${t('bank_recent')}</div>
      <div id="pupa-bank-txns">${txnHTML}</div>
    </div>
  </div>`;
}

function _buildTxn(x) {
  const isCredit = x.type === 'credit';
  return `
  <div class="pupa-txn">
    <div class="pupa-txn-icon" style="color:${isCredit ? '#30d158' : '#ff453a'};">${isCredit ? '↓' : '↑'}</div>
    <div class="pupa-txn-info">
      <div class="pupa-txn-name">${x.name || 'Операция'}</div>
      <div class="pupa-txn-date">${x.category || ''} · ${_fmtDate(x.ts)}</div>
    </div>
    <div class="pupa-txn-amount ${isCredit ? 'credit' : 'debit'}">
      ${isCredit ? '+' : '−'}${_fmtMoney(x.amount || 0)}
    </div>
  </div>`;
}

function _wire(el) {
  window.__pupa_bank = {
    topUp: async () => {
      const chat = getChat();
      const bank = chat.bank || { balance: 0, currency: '₽', transactions: [] };
      const raw = await generate(
        `[Сгенерируй правдоподобное пополнение счёта для игрока в сюжете.
Ответь ТОЛЬКО числом — суммой пополнения (500-50000), без символов и текста.]`,
        { responseLength: 20 }
      );
      const amount = parseInt(String(raw).replace(/\D/g, ''), 10);
      if (!amount || isNaN(amount)) { showToast('Не удалось определить сумму'); return; }

      bank.balance = (bank.balance || 0) + amount;
      bank.transactions = bank.transactions || [];
      bank.transactions.unshift({
        type: 'credit', name: 'Пополнение', amount, category: 'Перевод', ts: Date.now(),
      });
      setChatSetting('bank', bank);
      addEvent({ text: `💳 Пополнение на ${amount} ${bank.currency || '₽'}` });

      const bal = document.getElementById('pupa-bank-bal');
      if (bal) bal.textContent = _fmtMoney(bank.balance);
      const txns = document.getElementById('pupa-bank-txns');
      if (txns) txns.innerHTML = bank.transactions.map(x => _buildTxn(x)).join('');
      showToast(`Баланс: ${_fmtMoney(bank.balance)}`);
    },

    transfer: async () => {
      const chat = getChat();
      const bank = chat.bank || { balance: 0, currency: '₽', transactions: [] };
      const contacts = Object.values(chat.contacts || {});
      if (contacts.length === 0) { showToast('Нет контактов для перевода'); return; }

      const raw = await generate(
        `[Игрок хочет перевести деньги. Контакты: ${contacts.map(c => c.displayName).join(', ')}.
Придумай правдоподобную сумму перевода и получателя.
Ответь в формате: ИМЯ|СУММА (например: Артём|2500)
Только одна строка.]`,
        { responseLength: 40 }
      );
      const parts = String(raw).trim().split('|');
      if (parts.length < 2) { showToast('Не удалось определить перевод'); return; }

      const name = parts[0].trim();
      const amount = parseInt(parts[1].replace(/\D/g, ''), 10);
      if (!amount || isNaN(amount)) { showToast('Некорректная сумма'); return; }

      bank.balance = Math.max(0, (bank.balance || 0) - amount);
      bank.transactions = bank.transactions || [];
      bank.transactions.unshift({
        type: 'debit', name: `Перевод: ${name}`, amount, category: 'Перевод', ts: Date.now(),
      });
      setChatSetting('bank', bank);
      addEvent({ text: `💳 Перевод ${amount} ₽ → ${name}` });

      const bal = document.getElementById('pupa-bank-bal');
      if (bal) bal.textContent = _fmtMoney(bank.balance);
      const txns = document.getElementById('pupa-bank-txns');
      if (txns) txns.innerHTML = bank.transactions.map(x => _buildTxn(x)).join('');
      showToast(`Переведено ${amount} ₽ → ${name}`);
    },

    requestStatement: async () => {
      showToast('Формирую выписку...');
      const chat = getChat();
      const bank = chat.bank || { transactions: [] };
      const ctx = SillyTavern.getContext();

      const raw = await generate(
        `[Ты — сотрудник банка. Составь краткую выписку по операциям игрока.
Операции: ${JSON.stringify(bank.transactions || [])}
Баланс: ${bank.balance} ${bank.currency || '₽'}
Ответь одним абзацем, 2-3 предложения, сухо и по-деловому.]`,
        { responseLength: 200 }
      );
      showToast(raw?.trim() || 'Выписка не сформирована');
    },
  };
}

function _fmtMoney(n) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}

function _fmtDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  }
  return `${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}`;
}
