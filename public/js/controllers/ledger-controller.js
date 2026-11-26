// public/js/controllers/ledger-controller.js
import { createPageController } from './app-controller.js';
import { t } from '../core/i18n.js';
import {
  closeModal,
  escapeHtml,
  formatCurrencyIDR,
  openModal,
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
 * @typedef {import('../types/models.js').GearComponent} GearComponent
 * @typedef {import('../types/models.js').LedgerEntry} LedgerEntry
 * @typedef {import('../services/telemetry-service.js').ComponentRule} ComponentRule
 * @typedef {import('./app-controller.js').UserSession} UserSession
 */

/**
 * @type {{
 *   bikes: Bike[],
 *   entries: LedgerEntry[],
 *   components: GearComponent[],
 *   rules: ComponentRule[],
 *   selectedBikeId: string,
 *   selectedCategory: string,
 *   searchQuery: string
 * }}
 */
const state = {
  bikes: [],
  entries: [],
  components: [],
  rules: [],
  selectedBikeId: '',
  selectedCategory: '',
  searchQuery: '',
};

/**
 * Merender matriks status keausan komponen berdasarkan odometer sepeda & component_rules.
 */
function renderComponentDistanceMatrix() {
  const tbody = document.getElementById('component-rules-tbody');
  const countBadge = document.getElementById('component-rules-count');
  if (!tbody) return;

  const activeBikes = state.bikes.filter(
    (b) => !b.isArchived && (!state.selectedBikeId || b.id === state.selectedBikeId)
  );
  const query = state.searchQuery.trim().toLowerCase();
  const catFilter = state.selectedCategory.trim().toLowerCase();

  /** @type {Array<{
   *   rule: ComponentRule,
   *   bike: Bike,
   *   usedKm: number,
   *   lifespanKm: number,
   *   remainingKm: number,
   *   pct: number
   * }>} */
  const rows = [];

  for (const bike of activeBikes) {
    const currentOdo = Number(bike.totalOdometerKm ?? 0);

    for (const rule of state.rules) {
      if (
        catFilter &&
        rule.badgeLabel.toLowerCase() !== catFilter &&
        rule.categoryName.toLowerCase() !== catFilter
      ) {
        continue;
      }

      if (
        query &&
        !rule.categoryName.toLowerCase().includes(query) &&
        !rule.badgeLabel.toLowerCase().includes(query) &&
        !rule.description.toLowerCase().includes(query) &&
        !bike.name.toLowerCase().includes(query)
      ) {
        continue;
      }

      const matchedComp = state.components.find(
        (c) =>
          !c.isArchived &&
          c.bikeId === bike.id &&
          (c.name.toLowerCase().includes(rule.categoryName.toLowerCase()) ||
            c.category.toLowerCase() === rule.badgeLabel.toLowerCase())
      );

      const lastServiceEntry = state.entries
        .filter(
          (e) =>
            e.bikeId === bike.id &&
            (e.title.toLowerCase().includes(rule.categoryName.toLowerCase()) ||
              e.category.toLowerCase() === rule.badgeLabel.toLowerCase())
        )
        .sort((a, b) => Number(b.distanceKm ?? 0) - Number(a.distanceKm ?? 0))[0];

      const installedOdo = matchedComp
        ? Number(matchedComp.installedOdometerKm ?? 0)
        : lastServiceEntry && lastServiceEntry.distanceKm !== null
          ? Number(lastServiceEntry.distanceKm)
          : 0;

      const lifespanKm = matchedComp
        ? Number(matchedComp.lifespanKm || rule.lifespanKm)
        : rule.lifespanKm;

      const usedKm = Math.max(0, currentOdo - installedOdo);
      const remainingKm = Math.max(0, lifespanKm - usedKm);
      const pct = lifespanKm > 0 ? Math.min(100, Math.round((usedKm / lifespanKm) * 100)) : 0;

      rows.push({ rule, bike, usedKm, lifespanKm, remainingKm, pct });
    }
  }

  rows.sort((a, b) => b.pct - a.pct);

  if (countBadge) {
    countBadge.textContent = `${rows.length} item komponen`;
  }

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-6 text-center text-xs text-slate-500">
          Tidak ada aturan komponen yang sesuai dengan filter saat ini.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows
    .map(({ rule, bike, usedKm, lifespanKm, remainingKm, pct }) => {
      const isCritical = pct >= 90;
      const isWarning = pct >= 75 && pct < 90;

      const badgeClass = isCritical
        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
        : isWarning
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

      const barClass = isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
      const statusLabel = isCritical ? 'Wajib Ganti' : isWarning ? 'Perlu Cek' : 'Prima';

      return `
        <tr class="hover:bg-slate-900/60 transition">
          <td class="px-4 py-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-white">${escapeHtml(rule.categoryName)}</span>
              <span class="rounded-md border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                ${escapeHtml(rule.badgeLabel)}
              </span>
            </div>
            ${rule.description ? `<p class="mt-0.5 text-[11px] text-slate-400 line-clamp-1">${escapeHtml(rule.description)}</p>` : ''}
          </td>
          <td class="px-4 py-3 text-slate-300 font-medium whitespace-nowrap">
            ${escapeHtml(bike.name)}
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-xs text-slate-200 font-medium">
              ${usedKm.toLocaleString('id-ID', { maximumFractionDigits: 1 })} / ${lifespanKm.toLocaleString('id-ID')} km
            </div>
            <div class="mt-1.5 h-1.5 w-28 sm:w-36 overflow-hidden rounded-full bg-slate-800">
              <div class="h-full ${barClass}" style="width: ${pct}%"></div>
            </div>
          </td>
          <td class="px-4 py-3 text-xs font-medium text-slate-300 whitespace-nowrap">
            ${remainingKm.toLocaleString('id-ID', { maximumFractionDigits: 1 })} km
          </td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}">
              ${statusLabel} · ${pct}%
            </span>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderSummaryCards(filteredEntries) {
  const container = document.getElementById('ledger-summary-cards');
  if (!container) return;

  const totalCost = filteredEntries.reduce((sum, e) => sum + Number(e.cost || 0), 0);
  const relevantBikes = state.bikes.filter(
    (b) => !b.isArchived && (!state.selectedBikeId || b.id === state.selectedBikeId)
  );
  const totalKm = relevantBikes.reduce((sum, b) => sum + Number(b.totalOdometerKm || 0), 0);
  const costPerKm = totalKm > 0 ? Math.round(totalCost / totalKm) : 0;
  const avgCost = filteredEntries.length > 0 ? Math.round(totalCost / filteredEntries.length) : 0;

  container.className = 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4';
  container.innerHTML = `
    <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p class="text-xs text-slate-400">${escapeHtml(t('ledger.total_cost'))}</p>
      <p class="mt-1.5 text-lg sm:text-xl font-bold text-white">${escapeHtml(formatCurrencyIDR(totalCost))}</p>
    </div>
    <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p class="text-xs text-slate-400">${escapeHtml(t('ledger.cost_per_km'))}</p>
      <p class="mt-1.5 text-lg sm:text-xl font-bold text-pink-400">${escapeHtml(formatCurrencyIDR(costPerKm))}/km</p>
    </div>
    <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p class="text-xs text-slate-400">${escapeHtml(t('ledger.total_entries'))}</p>
      <p class="mt-1.5 text-lg sm:text-xl font-bold text-white">${filteredEntries.length}</p>
    </div>
    <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p class="text-xs text-slate-400">${escapeHtml(t('ledger.avg_per_entry'))}</p>
      <p class="mt-1.5 text-lg sm:text-xl font-bold text-white">${escapeHtml(formatCurrencyIDR(avgCost))}</p>
    </div>
  `;
}

function renderRecords(filteredEntries) {
  const container = document.getElementById('ledger-records');
  if (!container) return;

  if (filteredEntries.length === 0) {
    container.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-xs sm:text-sm text-slate-500">
        ${escapeHtml(t('ledger.empty_records'))}
      </div>
    `;
    return;
  }

  const bikeMap = new Map(state.bikes.map((b) => [b.id, b.name]));

  container.innerHTML = `
    <div class="space-y-2.5">
      ${filteredEntries
        .map((entry) => {
          const bikeName = bikeMap.get(entry.bikeId) ?? 'Bike';
          const odoBadge =
            entry.distanceKm !== null && entry.distanceKm !== undefined
              ? ` · ${Number(entry.distanceKm).toLocaleString('id-ID')} km`
              : '';
          return `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-sm text-white">${escapeHtml(entry.title)}</span>
                  <span class="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                    ${escapeHtml(entry.category)}
                  </span>
                </div>
                <p class="mt-1 text-xs text-slate-400">
                  ${escapeHtml(entry.date)} · ${escapeHtml(bikeName)}${escapeHtml(odoBadge)}
                </p>
              </div>
              <div class="flex items-center justify-between sm:justify-end gap-3">
                <span class="font-bold text-sm text-pink-400">${escapeHtml(formatCurrencyIDR(entry.cost))}</span>
                <button
                  type="button"
                  data-edit-entry="${escapeHtml(entry.id)}"
                  class="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800">
                  ${escapeHtml(t('common.edit'))}
                </button>
                <button
                  type="button"
                  data-delete-entry="${escapeHtml(entry.id)}"
                  class="rounded-lg border border-rose-900/60 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/60">
                  ${escapeHtml(t('common.delete'))}
                </button>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function render() {
  const filterBike = /** @type {HTMLSelectElement | null} */ (
    document.getElementById('filter-ledger-bike')
  );
  const entryBike = /** @type {HTMLSelectElement | null} */ (
    document.getElementById('entry-bike')
  );

  const activeBikes = state.bikes.filter((b) => !b.isArchived);
  if (filterBike) {
    const options = [
      `<option value="">${escapeHtml(t('common.all_bikes'))}</option>`,
      ...activeBikes.map(
        (b) =>
          `<option value="${escapeHtml(b.id)}" ${b.id === state.selectedBikeId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`
      ),
    ];
    filterBike.innerHTML = options.join('');
  }

  if (entryBike) {
    entryBike.innerHTML = activeBikes
      .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
      .join('');
  }

  const query = state.searchQuery.trim().toLowerCase();
  const filteredEntries = state.entries.filter((e) => {
    if (state.selectedBikeId && e.bikeId !== state.selectedBikeId) return false;
    if (state.selectedCategory && e.category.toLowerCase() !== state.selectedCategory.toLowerCase()) {
      return false;
    }
    if (query && !e.title.toLowerCase().includes(query) && !e.category.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });

  renderSummaryCards(filteredEntries);
  renderComponentDistanceMatrix();
  renderRecords(filteredEntries);
}

/** @param {{ session: UserSession }} ctx */
function bindEvents({ session }) {
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('filter-ledger-bike')?.addEventListener('change', (e) => {
    state.selectedBikeId = /** @type {HTMLSelectElement} */ (e.currentTarget).value;
    render();
  });

  document.getElementById('filter-ledger-category')?.addEventListener('change', (e) => {
    state.selectedCategory = /** @type {HTMLSelectElement} */ (e.currentTarget).value;
    render();
  });

  document.getElementById('filter-ledger-search')?.addEventListener('input', (e) => {
    state.searchQuery = /** @type {HTMLInputElement} */ (e.currentTarget).value;
    render();
  });

  document.getElementById('btn-open-ledger-modal')?.addEventListener('click', () => {
    const form = /** @type {HTMLFormElement | null} */ (document.getElementById('form-ledger-entry'));
    if (form) {
      form.reset();
      const idInput = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('id'));
      const dateInput = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('date'));
      if (idInput) idInput.value = '';
      if (dateInput) dateInput.value = today;
    }
    openModal('modal-ledger-entry');
  });

  document.getElementById('ledger-records')?.addEventListener('click', async (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const editId = target.closest('[data-edit-entry]')?.getAttribute('data-edit-entry');
    if (editId) {
      const entry = state.entries.find((item) => item.id === editId);
      const form = /** @type {HTMLFormElement | null} */ (document.getElementById('form-ledger-entry'));
      if (entry && form) {
        /** @type {HTMLInputElement} */ (form.elements.namedItem('id')).value = entry.id;
        /** @type {HTMLSelectElement} */ (form.elements.namedItem('bikeId')).value = entry.bikeId;
        /** @type {HTMLInputElement} */ (form.elements.namedItem('date')).value = entry.date;
        /** @type {HTMLInputElement} */ (form.elements.namedItem('title')).value = entry.title;
        /** @type {HTMLSelectElement} */ (form.elements.namedItem('category')).value = entry.category;
        /** @type {HTMLInputElement} */ (form.elements.namedItem('cost')).value = String(entry.cost);
        /** @type {HTMLInputElement} */ (form.elements.namedItem('distanceKm')).value =
          entry.distanceKm !== null ? String(entry.distanceKm) : '';
        openModal('modal-ledger-entry');
      }
      return;
    }

    const deleteId = target.closest('[data-delete-entry]')?.getAttribute('data-delete-entry');
    if (deleteId) {
      try {
        await deleteLedgerEntry(deleteId);
        state.entries = state.entries.filter((item) => item.id !== deleteId);
        render();
        showToast(t('common.deleted_success'), 'success');
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
    const rawId = String(fd.get('id') || '').trim();
    const rawDist = fd.get('distanceKm');

    setButtonLoading(btn, true, 'common.save');
    try {
      await upsertLedgerEntry(session.user.id, {
        id: rawId || undefined,
        bikeId: String(fd.get('bikeId') || ''),
        date: String(fd.get('date') || today),
        title: String(fd.get('title') || '').trim(),
        category: String(fd.get('category') || 'Service'),
        cost: Number(fd.get('cost') || 0),
        distanceKm: rawDist !== null && rawDist !== '' ? Number(rawDist) : null,
      });
      closeModal('modal-ledger-entry');
      await loadData({ session });
      render();
      showToast(t('common.saved_success'), 'success');
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
  state.components = snapshot.components ?? [];
  state.rules = snapshot.rules ?? [];
}

createPageController({ bindEvents, loadData, onRender: render });