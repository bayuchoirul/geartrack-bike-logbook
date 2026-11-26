// public/js/controllers/ledger-controller.js
import { createPageController } from './app-controller.js';
import { t } from '../core/i18n.js';
import { filterLedgerEntries, summarizeMaintenanceLedger } from '../domain/maintenance-ledger.js';
import {
  closeResponsiveModal,
  escapeHtml,
  openResponsiveModal,
  renderLedgerRecords,
  renderLedgerSummaryCards,
  setButtonLoading,
  showToast,
} from '../ui/ui-bindings.js';
import {
  deleteLedgerEntry,
  fetchLedgerSnapshot,
  upsertLedgerEntry,
} from '../services/telemetry-service.js';

/**
 * @typedef {import('../types/models.js').Bike} Bike
 * @typedef {import('../types/models.js').LedgerEntry} LedgerEntry
 * @typedef {import('./app-controller.js').UserSession} UserSession
 */

/** @type {{ bikes: Bike[], entries: LedgerEntry[], filters: { bikeId: string, category: string, search: string } }} */
const state = {
  bikes: [],
  entries: [],
  filters: {
    bikeId: '',
    category: '',
    search: '',
  },
};

/**
 * @param {HTMLFormElement} form
 * @param {string} name
 * @param {string | number} value
 */
function setInputValue(form, name, value) {
  const field = /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
    form.elements.namedItem(name)
  );
  if (field) field.value = String(value);
}

function render() {
  const bikeMap = new Map(state.bikes.map((b) => [b.id, b.name]));

  const filterSelect = document.getElementById('filter-ledger-bike');
  if (filterSelect) {
    filterSelect.innerHTML = [
      `<option value="">${escapeHtml(t('ledger.filter_all_bikes'))}</option>`,
      ...state.bikes.map(
        (b) =>
          `<option value="${escapeHtml(b.id)}" ${b.id === state.filters.bikeId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`
      ),
    ].join('');
  }

  const modalBikeSelect = document.getElementById('entry-bike');
  if (modalBikeSelect) {
    modalBikeSelect.innerHTML = state.bikes
      .filter((b) => !b.isArchived)
      .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
      .join('');
  }

  const baseFiltered = filterLedgerEntries(state.entries, {
    bikeId: state.filters.bikeId || undefined,
    category: state.filters.category || undefined,
  });

  const keyword = state.filters.search.toLowerCase();
  /** @type {LedgerEntry[]} */
  const visibleEntries = baseFiltered
    .filter((item) => !keyword || item.title.toLowerCase().includes(keyword))
    .map((item) => ({ ...item, bikeName: bikeMap.get(item.bikeId) ?? '' }));

  const targetBikes = state.filters.bikeId
    ? state.bikes.filter((b) => b.id === state.filters.bikeId)
    : state.bikes;

  const totalDistanceKm = targetBikes.reduce((sum, b) => sum + (Number(b.totalOdometerKm) || 0), 0);
  const summary = summarizeMaintenanceLedger(visibleEntries, totalDistanceKm);

  renderLedgerSummaryCards(summary);
  renderLedgerRecords(visibleEntries);
}

/** @param {LedgerEntry | null} [entry] */
function openEntryForm(entry = null) {
  const form = /** @type {HTMLFormElement | null} */ (
    document.getElementById('form-ledger-entry')
  );
  if (!form) return;

  form.reset();
  setInputValue(form, 'id', entry?.id ?? '');
  setInputValue(form, 'bikeId', entry?.bikeId ?? (state.filters.bikeId || state.bikes[0]?.id || ''));
  setInputValue(form, 'date', entry?.date ?? new Date().toISOString().slice(0, 10));
  setInputValue(form, 'title', entry?.title ?? '');
  setInputValue(form, 'category', entry?.category ?? 'Drivetrain');
  setInputValue(form, 'cost', entry?.cost ?? '');
  setInputValue(form, 'distanceKm', entry?.distanceKm ?? '');

  openResponsiveModal('modal-ledger-entry');
}

/** @param {{ session: UserSession }} ctx */
function bindEvents({ session }) {
  document.getElementById('btn-open-ledger-modal')?.addEventListener('click', () => openEntryForm());

  document.getElementById('filter-ledger-bike')?.addEventListener('change', (e) => {
    const select = /** @type {HTMLSelectElement | null} */ (e.target);
    if (!select) return;
    state.filters.bikeId = select.value;
    render();
  });

  document.getElementById('filter-ledger-category')?.addEventListener('change', (e) => {
    const select = /** @type {HTMLSelectElement | null} */ (e.target);
    if (!select) return;
    state.filters.category = select.value;
    render();
  });

  document.getElementById('filter-ledger-search')?.addEventListener('input', (e) => {
    const input = /** @type {HTMLInputElement | null} */ (e.target);
    if (!input) return;
    state.filters.search = input.value.trim();
    render();
  });

  document.getElementById('ledger-records')?.addEventListener('click', async (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    const btn = /** @type {HTMLElement | null} */ (target?.closest('[data-action]'));
    if (!btn) return;

    const { action, id } = btn.dataset;
    if (!id) return;

    if (action === 'edit-entry') {
      const entry = state.entries.find((item) => item.id === id);
      if (entry) openEntryForm(entry);
    } else if (action === 'delete-entry' && window.confirm(t('common.confirm_delete'))) {
      try {
        await deleteLedgerEntry(id);
        showToast(t('common.deleted_success'), 'success');
        await loadData({ session });
        render();
      } catch {
        showToast(t('common.error_generic'), 'error');
      }
    }
  });

  document.getElementById('form-ledger-entry')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.currentTarget);
    const btn = document.getElementById('btn-save-ledger');
    const fd = new FormData(form);
    const rawDist = fd.get('distanceKm');

    setButtonLoading(btn, true, 'common.save');
    try {
      await upsertLedgerEntry(session.user.id, {
        id: String(fd.get('id') || '') || undefined,
        bikeId: String(fd.get('bikeId') || ''),
        date: String(fd.get('date') || ''),
        title: String(fd.get('title') || '').trim(),
        category: String(fd.get('category') || 'Service'),
        cost: Number(fd.get('cost') || 0),
        distanceKm: rawDist !== null && rawDist !== '' ? Number(rawDist) : null,
      });
      closeResponsiveModal('modal-ledger-entry');
      showToast(t('common.saved_success'), 'success');
      await loadData({ session });
      render();
    } catch {
      showToast(t('common.error_generic'), 'error');
    } finally {
      setButtonLoading(btn, false, 'common.save');
    }
  });
}

/** @param {{ session: UserSession }} ctx */
async function loadData({ session }) {
  const snapshot = await fetchLedgerSnapshot(session.user.id);
  state.bikes = snapshot.bikes ?? [];
  state.entries = snapshot.entries ?? [];
}

createPageController({ bindEvents, loadData, onRender: render });
