// public/js/controllers/app-controller.js
import { initAppShell } from '../ui/app-shell.js';
import { bindGlobalModalEvents, showToast } from '../ui/ui-bindings.js';
import { t } from '../core/i18n.js';
import { getCurrentSession, signOutUser } from '../services/auth-service.js';

/**
 * @typedef {{ user: { id: string, email?: string }, access_token: string }} UserSession
 * @typedef {{ requireAuth?: boolean, redirectIfAuthenticated?: string, showNav?: boolean, bindEvents?: (ctx: { session: UserSession }) => void, loadData?: (ctx: { session: UserSession }) => Promise<void>, onRender?: () => void }} PageControllerConfig
 */

/** @param {PageControllerConfig} config */
export async function createPageController(config) {
  const {
    requireAuth = true,
    redirectIfAuthenticated = '',
    showNav = true,
    bindEvents,
    loadData,
    onRender,
  } = config;

  initAppShell({
    showNav,
    onLogout: async () => {
      await signOutUser();
      window.location.replace('/login');
    },
  });

  bindGlobalModalEvents();

  if (onRender) {
    window.addEventListener('geartrack:langchange', onRender);
  }

  try {
    const session = /** @type {UserSession | null} */ (await getCurrentSession());

    if (requireAuth && !session) {
      window.location.replace('/login');
      return;
    }

    if (!requireAuth && redirectIfAuthenticated && session) {
      window.location.replace(redirectIfAuthenticated);
      return;
    }

    const ctx = { session: /** @type {UserSession} */ (session) };
    if (bindEvents) bindEvents(ctx);
    if (loadData) await loadData(ctx);
    if (onRender) onRender();
  } catch (err) {
    console.error('[PageController] Bootstrap error:', err);
    showToast(t('common.error_generic'), 'error');
  }
}
