// public/js/controllers/dashboard-controller.js
import { createPageController } from './app-controller.js';
import { formatCurrency, formatNumber, t } from '../core/i18n.js';
import { summarizeBikeComponents } from '../domain/component-wear.js';
import { summarizeMaintenanceLedger } from '../domain/maintenance-ledger.js';
import { FEATURES, getWearStatus, STATUS_STYLES } from '../core/constants.js';
import { escapeHtml, formatDate, setButtonLoading, showToast } from '../ui/ui-bindings.js';
import { fetchDashboardSnapshot } from '../services/telemetry-service.js';

/**
 * @typedef {import('../types/models.js').Bike} Bike
 * @typedef {import('../types/models.js').GearComponent} GearComponent
 * @typedef {import('../types/models.js').ActivityLog} ActivityLog
 * @typedef {import('../types/models.js').LedgerEntry} LedgerEntry
 * @typedef {import('../types/models.js').WearMetrics} WearMetrics
 * @typedef {import('./app-controller.js').UserSession} UserSession
 */

/** @type {{ bikes: Bike[], components: GearComponent[], activities: ActivityLog[], ledgerEntries: LedgerEntry[], selectedBikeId: string }} */
const state = {
  bikes: [],
  components: [],
  activities: [],
  ledgerEntries: [],
  selectedBikeId: '',
};

/** @returns {WearMetrics[]} */
function getAggregatedWearItems() {
  const bikeMap = new Map(state.bikes.map((b) => [b.id, b]));
  const targetBikes = state.selectedBikeId
    ? state.bikes.filter((b) => b.id === state.selectedBikeId)
    : state.bikes.filter((b) => !b.isArchived);

  /** @type {WearMetrics[]} */
  const items = [];
  for (const bike of targetBikes) {
    const bikeComps = state.components.filter((c) => c.bikeId === bike.id);
    const summary = summarizeBikeComponents(bikeComps, Number(bike.totalOdometerKm) || 0);
    for (const item of summary.items) {
      items.push({ ...item, bikeName: bikeMap.get(bike.id)?.name ?? '' });
    }
  }
  return items.sort((a, b) => b.wearPercentage - a.wearPercentage);
}

function render() {
  const filterSelect = /** @type {HTMLSelectElement | null} */ (
    document.getElementById('dashboard-bike-filter')
  );
  if (filterSelect) {
    const activeBikes = state.bikes.filter((b) => !b.isArchived);
    filterSelect.innerHTML = [
      `<option value="">${escapeHtml(t('dashboard.all_bikes'))}</option>`,
      ...activeBikes.map(
        (b) =>
          `<option value="${escapeHtml(b.id)}" ${b.id === state.selectedBikeId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`
      ),
    ].join('');
  }

  const targetBikes = state.selectedBikeId
    ? state.bikes.filter((b) => b.id === state.selectedBikeId)
    : state.bikes.filter((b) => !b.isArchived);

  const totalDistanceKm = targetBikes.reduce((sum, b) => sum + (Number(b.totalOdometerKm) || 0), 0);
  const filteredActivities = state.selectedBikeId
    ? state.activities.filter((a) => a.bikeId === state.selectedBikeId)
    : state.activities;

  const wearItems = getAggregatedWearItems();
  const attentionCount = wearItems.filter((i) => i.needsAttention).length;
  const ledgerSummary = summarizeMaintenanceLedger(
    state.ledgerEntries,
    totalDistanceKm,
    state.selectedBikeId ? { bikeId: state.selectedBikeId } : {}
  );

  const kpiEl = document.getElementById('dashboard-kpi-grid');
  if (kpiEl) {
    const kpis = [
      { label: t('dashboard.kpi_distance'), value: `${formatNumber(totalDistanceKm, 1)} km`, cls: 'text-white' },
      { label: t('dashboard.kpi_rides'), value: formatNumber(filteredActivities.length), cls: 'text-white' },
      {
        label: t('dashboard.kpi_attention'),
        value: formatNumber(attentionCount),
        cls: attentionCount > 0 ? 'text-amber-400' : 'text-emerald-400',
      },
      {
        label: t('dashboard.kpi_cost_km'),
        value: ledgerSummary.costPerKm === null ? '—' : `${formatCurrency(ledgerSummary.costPerKm)}/km`,
        cls: 'text-pink-400',
      },
    ];
    kpiEl.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        ${kpis
          .map(
            (k) => `
          <article class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <span class="block text-xs text-slate-400">${escapeHtml(k.label)}</span>
            <strong class="mt-1.5 block text-lg md:text-2xl font-bold tabular-nums truncate ${k.cls}">${escapeHtml(k.value)}</strong>
          </article>`
          )
          .join('')}
      </div>`;
  }

  const wearEl = document.getElementById('dashboard-wear-list');
  if (wearEl) {
    const topWear = wearItems.slice(0, 5);
    wearEl.innerHTML =
      topWear.length === 0
        ? `<div class="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">${escapeHtml(t('common.empty'))}</div>`
        : `<div class="space-y-3">${topWear
            .map((item) => {
              const style = STATUS_STYLES[item.status || getWearStatus(item.wearPercentage)] ?? STATUS_STYLES.good;
              const width = Math.min(100, Math.max(0, Number(item.wearPercentage) || 0));
              return `
            <article class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span class="uppercase tracking-wider">${escapeHtml(item.category)}</span>
                    ${!state.selectedBikeId && item.bikeName ? `<span>•</span><span class="truncate">${escapeHtml(item.bikeName)}</span>` : ''}
                  </div>
                  <h3 class="text-sm font-semibold text-white truncate mt-0.5">${escapeHtml(item.name)}</h3>
                </div>
                <span class="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badgeClass}">
                  ${escapeHtml(t(style.i18nKey))} · ${formatNumber(item.wearPercentage, 0)}%
                </span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full ${style.barClass}" style="width: ${width}%"></div>
              </div>
              <div class="flex items-center justify-between text-xs text-slate-400 tabular-nums">
                <span>${escapeHtml(t('garage.used', { km: formatNumber(item.distanceUsedKm, 0) }))}</span>
                <span class="text-slate-200 font-medium">${escapeHtml(t('garage.remaining', { km: formatNumber(item.remainingKm, 0) }))}</span>
              </div>
            </article>`;
            })
            .join('')}</div>`;
  }

  const recentEl = document.getElementById('dashboard-recent-activities');
  if (recentEl) {
    const bikeMap = new Map(state.bikes.map((b) => [b.id, b.name]));
    const recent = filteredActivities.slice(0, 6);
    recentEl.innerHTML =
      recent.length === 0
        ? `<div class="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">${escapeHtml(t('common.empty'))}</div>`
        : `<div class="space-y-2.5">${recent
            .map((act) => {
              const bikeName = act.bikeName || bikeMap.get(act.bikeId) || '';
              return `
            <article class="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-sm font-medium text-white truncate">${escapeHtml(act.title)}</h3>
                <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>${formatDate(act.date)}</span>
                  ${bikeName ? `<span>•</span><span class="truncate">${escapeHtml(bikeName)}</span>` : ''}
                </div>
              </div>
              <span class="shrink-0 text-sm font-bold tabular-nums text-pink-400">+${formatNumber(act.distanceKm, 1)} km</span>
            </article>`;
            })
            .join('')}</div>`;
  }
}

/** @param {{ session: UserSession }} ctx */
function bindEvents({ session }) {
  document.getElementById('dashboard-bike-filter')?.addEventListener('change', (e) => {
    const select = /** @type {HTMLSelectElement | null} */ (e.target);
    if (!select) return;
    state.selectedBikeId = select.value;
    render();
  });

  const syncBtn = document.getElementById('btn-sync-strava');
  if (syncBtn) {
    syncBtn.classList.toggle('hidden', !FEATURES.STRAVA_SYNC);

    if (FEATURES.STRAVA_SYNC) {
      syncBtn.addEventListener('click', async () => {
        setButtonLoading(syncBtn, true, 'common.sync_strava');
        try {
          const res = await fetch('/api/strava/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const payload = await res.json();
          if (!res.ok || payload?.ok === false) throw new Error(payload?.error?.message);

          showToast(t('dashboard.sync_success', { count: payload?.syncedCount ?? 0 }), 'success');
          await loadData({ session });
          render();
        } catch {
          showToast(t('common.error_generic'), 'error');
        } finally {
          setButtonLoading(syncBtn, false, 'common.sync_strava');
        }
      });
    }
  }
}

/** @param {{ session: UserSession }} ctx */
async function loadData({ session }) {
  const snapshot = await fetchDashboardSnapshot(session.user.id);
  state.bikes = snapshot.bikes ?? [];
  state.components = snapshot.components ?? [];
  state.activities = snapshot.activities ?? [];
  state.ledgerEntries = snapshot.ledgerEntries ?? [];
}

createPageController({ bindEvents, loadData, onRender: render });
