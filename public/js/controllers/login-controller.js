// public/js/controllers/login-controller.js
import { createPageController } from './app-controller.js';
import { t } from '../core/i18n.js';
import { setButtonLoading, showToast } from '../ui/ui-bindings.js';
import { resetPassword, signInWithEmail, signUpWithEmail } from '../services/auth-service.js';

/** @typedef {'signin' | 'signup' | 'reset'} AuthMode */

/** @type {{ mode: AuthMode }} */
const state = {
  mode: 'signin',
};

function getSubmitKey() {
  if (state.mode === 'signup') return 'login.submit_signup';
  if (state.mode === 'reset') return 'login.submit_reset';
  return 'login.submit_signin';
}

function render() {
  document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    const active = btn.getAttribute('data-auth-tab') === state.mode;
    btn.className = `rounded-lg py-2 text-xs font-semibold transition ${
      active ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
    }`;
  });

  const passwordGroup = document.getElementById('group-auth-password');
  const passwordInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('auth-password')
  );
  const isReset = state.mode === 'reset';

  passwordGroup?.classList.toggle('hidden', isReset);
  if (passwordInput) passwordInput.required = !isReset;

  const submitBtn = document.getElementById('btn-auth-submit');
  if (submitBtn) submitBtn.textContent = t(getSubmitKey());
}

function bindEvents() {
  document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = /** @type {AuthMode | null} */ (btn.getAttribute('data-auth-tab'));
      state.mode = tab ?? 'signin';
      render();
    });
  });

  document.getElementById('form-auth')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = /** @type {HTMLFormElement} */ (event.currentTarget);
    const submitBtn = document.getElementById('btn-auth-submit');
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');

    setButtonLoading(submitBtn, true, getSubmitKey());

    try {
      if (state.mode === 'signin') {
        await signInWithEmail(email, password);
        window.location.replace('/');
      } else if (state.mode === 'signup') {
        await signUpWithEmail(email, password);
        showToast(t('login.signup_success'), 'success');
        state.mode = 'signin';
        form.reset();
        render();
      } else {
        await resetPassword(email);
        showToast(t('login.reset_success'), 'success');
        state.mode = 'signin';
        render();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error_generic');
      showToast(message, 'error');
    } finally {
      setButtonLoading(submitBtn, false, getSubmitKey());
    }
  });
}

createPageController({
  requireAuth: false,
  redirectIfAuthenticated: '/',
  showNav: false,
  bindEvents,
  onRender: render,
});
