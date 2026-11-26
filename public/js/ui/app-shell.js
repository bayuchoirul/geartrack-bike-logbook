// public/js/ui/app-shell.js
import { applyTranslations, getLang, setLang, t } from '../core/i18n.js';

/**
 * @typedef {import('../core/i18n.js').SupportedLang} SupportedLang
 * @typedef {import('../core/i18n.js').TranslationKey} TranslationKey
 * @typedef {{ href: string, key: TranslationKey, icon: string }} NavItem
 * @typedef {{ showNav?: boolean, onLogout?: () => Promise<void> | void }} AppShellOptions
 */

/** @type {NavItem[]} */
const NAV_ITEMS = [
  { href: '/', key: 'nav.dashboard', icon: '📊' },
  { href: '/log-activity', key: 'nav.log', icon: '➕' },
  { href: '/garage', key: 'nav.garage', icon: '🚲' },
  { href: '/ledger', key: 'nav.ledger', icon: '🧾' },
];

/** @param {string} href @returns {boolean} */
function isCurrentRoute(href) {
  const path = window.location.pathname.replace(/\.html$/, '') || '/';
  return path === href;
}

/** @param {AppShellOptions} [options] */
export function initAppShell(options = {}) {
  const { showNav = true, onLogout } = options;
  const mount = document.getElementById('app-shell');
  if (!mount) return;

  /** @type {SupportedLang} */
  const currentLang = getLang();

  const desktopLinks = showNav
    ? NAV_ITEMS.map((item) => {
        const active = isCurrentRoute(item.href);
        const cls = active
          ? 'bg-pink-600 text-white'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white';
        return `
          <a href="${item.href}" class="px-3 py-2 rounded-lg text-sm font-medium transition ${cls}">
            <span data-i18n="${item.key}">${t(item.key)}</span>
          </a>`;
      }).join('')
    : '';

  const mobileLinks = showNav
    ? NAV_ITEMS.map((item) => {
        const active = isCurrentRoute(item.href);
        const cls = active ? 'text-pink-500 font-semibold' : 'text-slate-400';
        return `
          <a href="${item.href}" class="flex flex-col items-center justify-center flex-1 py-2 text-xs ${cls}">
            <span class="text-base leading-none mb-1">${item.icon}</span>
            <span data-i18n="${item.key}">${t(item.key)}</span>
          </a>`;
      }).join('')
    : '';

  const logoutBtn = showNav
    ? `<button type="button" id="shell-btn-logout" data-i18n="common.logout"
        class="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition">
        ${t('common.logout')}
      </button>`
    : '';

  mount.innerHTML = `
    <header class="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <a href="${showNav ? '/' : '/login'}" class="font-bold tracking-tight text-white flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
          <span>GearTrack</span>
        </a>

        ${showNav ? `<nav class="hidden md:flex items-center gap-1">${desktopLinks}</nav>` : ''}

        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700" role="group" aria-label="Language">
            <button type="button" data-set-lang="id"
              class="px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                currentLang === 'id' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
              }">ID</button>
            <button type="button" data-set-lang="en"
              class="px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                currentLang === 'en' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
              }">EN</button>
          </div>
          ${logoutBtn}
        </div>
      </div>
    </header>

    ${
      showNav
        ? `<nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex pb-safe">
            ${mobileLinks}
          </nav>`
        : ''
    }
  `;

  mount.querySelectorAll('[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetLang = btn.getAttribute('data-set-lang');
      if (targetLang === 'id' || targetLang === 'en') {
        setLang(targetLang);
        initAppShell(options);
      }
    });
  });

  if (onLogout) {
    mount.querySelector('#shell-btn-logout')?.addEventListener('click', () => {
      void onLogout();
    });
  }

  document.documentElement.lang = currentLang;
  applyTranslations();
}
