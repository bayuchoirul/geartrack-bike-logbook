// public/js/controllers/log-activity-controller.js
import { createPageController } from './app-controller.js';
import { t } from '../core/i18n.js';
import { escapeHtml, setButtonLoading, showToast } from '../ui/ui-bindings.js';
import { createActivityLog, createLedgerEntry, fetchUserBikes } from '../services/telemetry-service.js';

/**
 * @typedef {import('../types/models.js').Bike} Bike
 * @typedef {import('./app-controller.js').UserSession} UserSession
 * @typedef {'ride' | 'maintenance'} LogTabMode
 */

/** @type {{ activeTab: LogTabMode, bikes: Bike[] }} */
const state = {
  activeTab: 'ride',
  bikes: [],
};

function render() {
  document.querySelectorAll('[data-log-tab]').forEach((btn) => {
    const active = btn.getAttribute('data-log-tab') === state.activeTab;
    btn.className = `rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
      active ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
    }`;
  });

  document.getElementById('panel-log-ride')?.classList.toggle('hidden', state.activeTab !== 'ride');
  document
    .getElementById('panel-log-maintenance')
    ?.classList.toggle('hidden', state.activeTab !== 'maintenance');

  const optionsHtml = state.bikes
    .filter((b) => !b.isArchived)
    .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
    .join('');

  ['ride-bike', 'maint-bike'].forEach((selectId) => {
    const el = document.getElementById(selectId);
    if (el) el.innerHTML = optionsHtml;
  });
}

/** @param {{ session: UserSession }} ctx */
function bindEvents({ session }) {
  const today = new Date().toISOString().slice(0, 10);
  ['ride-date', 'maint-date'].forEach((id) => {
    const input = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
    if (input && !input.value) input.value = today;
  });

  document.querySelectorAll('[data-log-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = /** @type {LogTabMode | null} */ (btn.getAttribute('data-log-tab'));
      state.activeTab = tab ?? 'ride';
      render();
    });
  });

  document.getElementById('form-log-ride')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = /** @type {HTMLFormElement} */ (event.currentTarget);
    const btn = document.getElementById('btn-submit-ride');
    const fd = new FormData(form);

    setButtonLoading(btn, true, 'log.submit_ride');
    try {
      await createActivityLog(session.user.id, {
        bikeId: String(fd.get('bikeId') || ''),
        date: String(fd.get('date') || today),
        title: String(fd.get('title') || '').trim(),
        distanceKm: Number(fd.get('distanceKm') || 0),
        durationMinutes: Number(fd.get('durationMinutes') || 0),
        elevationGainM: Number(fd.get('elevationGainM') || 0),
        notes: String(fd.get('notes') || '').trim(),
      });
      showToast(t('common.saved_success'), 'success');
      form.reset();
      const rideDateInput = /** @type {HTMLInputElement | null} */ (
        document.getElementById('ride-date')
      );
      if (rideDateInput) rideDateInput.value = today;
    } catch {
      showToast(t('common.error_generic'), 'error');
    } finally {
      setButtonLoading(btn, false, 'log.submit_ride');
    }
  });

  document.getElementById('form-log-maintenance')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = /** @type {HTMLFormElement} */ (event.currentTarget);
    const btn = document.getElementById('btn-submit-maint');
    const fd = new FormData(form);
    const rawDist = fd.get('distanceKm');

    setButtonLoading(btn, true, 'log.submit_maint');
    try {
      await createLedgerEntry(session.user.id, {
        bikeId: String(fd.get('bikeId') || ''),
        date: String(fd.get('date') || today),
        title: String(fd.get('title') || '').trim(),
        category: String(fd.get('category') || 'Service'),
        cost: Number(fd.get('cost') || 0),
        distanceKm: rawDist !== null && rawDist !== '' ? Number(rawDist) : null,
      });
      showToast(t('common.saved_success'), 'success');
      form.reset();
      const maintDateInput = /** @type {HTMLInputElement | null} */ (
        document.getElementById('maint-date')
      );
      if (maintDateInput) maintDateInput.value = today;
    } catch {
      showToast(t('common.error_generic'), 'error');
    } finally {
      setButtonLoading(btn, false, 'log.submit_maint');
    }
  });
}

/** @param {{ session: UserSession }} ctx */
async function loadData({ session }) {
  state.bikes = (await fetchUserBikes(session.user.id)) ?? [];
}

createPageController({ bindEvents, loadData, onRender: render });
