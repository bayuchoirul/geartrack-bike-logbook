// public/js/ui/ui-bindings.js
import { formatCurrency, formatNumber, getLang, t } from '../core/i18n.js';
import { getWearStatus, STATUS_STYLES } from '../core/constants.js';

/**
 * @typedef {import('../types/models.js').Bike} Bike
 * @typedef {import('../types/models.js').WearMetrics} WearMetrics
 * @typedef {import('../types/models.js').LedgerSummary} LedgerSummary
 * @typedef {import('../types/models.js').LedgerEntry} LedgerEntry
 */

/** @param {unknown} raw @returns {string} */
export function escapeHtml(raw) {
  return String(raw ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** @param {string} isoDate @returns {string} */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(isoDate);

  const locale = getLang() === 'id' ? 'id-ID' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

/** @param {string} [messageKey] @returns {string} */
function buildEmptyState(messageKey = 'common.empty') {
  return `
    <div class="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
      <p class="text-sm text-slate-400">${escapeHtml(t(messageKey))}</p>
    </div>
  `;
}

/**
 * @param {HTMLElement | null} button
 * @param {boolean} isLoading
 * @param {string} [defaultLabelKey]
 */
export function setButtonLoading(button, isLoading, defaultLabelKey = 'common.save') {
  if (!button) return;
  if ('disabled' in button) {
    /** @type {HTMLButtonElement} */ (button).disabled = isLoading;
  }
  button.classList.toggle('opacity-60', isLoading);
  button.classList.toggle('cursor-not-allowed', isLoading);
  button.textContent = isLoading ? t('common.loading') : t(defaultLabelKey);
}

/**
 * @param {string} message
 * @param {'success' | 'error' | 'info'} [type]
 */
export function showToast(message, type = 'info') {
  const existing = document.getElementById('geartrack-toast');
  if (existing) existing.remove();

  const palette = {
    success: 'border-emerald-500/40 bg-slate-900 text-emerald-300',
    error: 'border-rose-500/40 bg-slate-900 text-rose-300',
    info: 'border-pink-500/40 bg-slate-900 text-slate-100',
  };

  const toast = document.createElement('div');
  toast.id = 'geartrack-toast';
  toast.className = [
    'fixed z-50 left-4 right-4 bottom-20 md:left-auto md:right-6 md:bottom-6 md:w-96',
    'rounded-xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur transition-opacity',
    palette[type] ?? palette.info,
  ].join(' ');
  toast.textContent = message;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

/**
 * @param {number} count
 * @param {string} [elementId]
 */
export function updateAttentionBadge(count, elementId = 'attention-badge') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = formatNumber(count);
  el.classList.toggle('hidden', count <= 0);
}

/**
 * @param {Bike[]} bikes
 * @param {string} [selectedBikeId]
 * @param {string} [containerId]
 */
export function renderBikeCards(bikes, selectedBikeId = '', containerId = 'bike-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!Array.isArray(bikes) || bikes.length === 0) {
    container.innerHTML = buildEmptyState();
    return;
  }

  const cardsHtml = bikes
    .map((bike) => {
      const isSelected = bike.id === selectedBikeId;
      const borderClass = isSelected
        ? 'border-pink-500 ring-1 ring-pink-500/40'
        : 'border-slate-800 hover:border-slate-700';

      return `
        <article
          data-bike-id="${escapeHtml(bike.id)}"
          class="rounded-2xl border ${borderClass} bg-slate-900/80 p-4 transition flex flex-col justify-between gap-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-white">${escapeHtml(bike.name)}</h3>
              <p class="text-xs text-slate-400 mt-0.5">${escapeHtml(bike.brandModel || '')}</p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-800 text-slate-300">
              ${escapeHtml(t(bike.isArchived ? 'garage.archived' : 'garage.active'))}
            </span>
          </div>

          <div class="flex items-end justify-between border-t border-slate-800/80 pt-3">
            <div>
              <span class="block text-[11px] uppercase tracking-wider text-slate-400">
                ${escapeHtml(t('garage.odometer'))}
              </span>
              <span class="text-lg font-bold tabular-nums text-white">
                ${formatNumber(bike.totalOdometerKm, 1)} km
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                data-action="edit-bike"
                data-id="${escapeHtml(bike.id)}"
                class="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800">
                ${escapeHtml(t('common.edit'))}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cardsHtml}</div>`;
}

/**
 * @param {WearMetrics[]} items
 * @param {string} [containerId]
 */
export function renderComponentWearList(items, containerId = 'component-wear-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = buildEmptyState();
    return;
  }

  const cardsHtml = items
    .map((item) => {
      const status = item.status || getWearStatus(item.wearPercentage);
      const style = STATUS_STYLES[status] ?? STATUS_STYLES.good;
      const barWidth = Math.min(100, Math.max(0, Number(item.wearPercentage) || 0));

      return `
        <article class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                ${escapeHtml(item.category)}
              </span>
              <h4 class="text-sm font-semibold text-white truncate">${escapeHtml(item.name)}</h4>
            </div>
            <span class="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badgeClass}">
              ${escapeHtml(t(style.i18nKey))} · ${formatNumber(item.wearPercentage, 0)}%
            </span>
          </div>

          <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300 ${style.barClass}" style="width: ${barWidth}%"></div>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 tabular-nums">
            <span>${escapeHtml(t('garage.used', { km: formatNumber(item.distanceUsedKm, 0) }))}</span>
            <span class="font-medium text-slate-200">
              ${escapeHtml(t('garage.remaining', { km: formatNumber(item.remainingKm, 0) }))}
            </span>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-2.5">
            <button
              type="button"
              data-action="edit-component"
              data-id="${escapeHtml(item.id)}"
              class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800">
              ${escapeHtml(t('common.edit'))}
            </button>
            <button
              type="button"
              data-action="delete-component"
              data-id="${escapeHtml(item.id)}"
              class="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10">
              ${escapeHtml(t('common.delete'))}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${cardsHtml}</div>`;
}

/**
 * @param {LedgerSummary} summary
 * @param {string} [containerId]
 */
export function renderLedgerSummaryCards(summary, containerId = 'ledger-summary-cards') {
  const container = document.getElementById(containerId);
  if (!container || !summary) return;

  const costPerKmText =
    summary.costPerKm === null ? '—' : `${formatCurrency(summary.costPerKm)}/km`;

  const metrics = [
    { label: t('ledger.total_cost'), value: formatCurrency(summary.totalCost) },
    { label: t('ledger.cost_per_km'), value: costPerKmText },
    { label: t('ledger.entries'), value: formatNumber(summary.entryCount) },
    { label: t('ledger.avg_cost'), value: formatCurrency(summary.averageCostPerEntry) },
  ];

  container.innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      ${metrics
        .map(
          (m) => `
        <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span class="block text-xs text-slate-400">${escapeHtml(m.label)}</span>
          <strong class="mt-1 block text-base md:text-xl font-bold tabular-nums text-white truncate">
            ${escapeHtml(m.value)}
          </strong>
        </div>`
        )
        .join('')}
    </div>
  `;
}

/**
 * @param {LedgerEntry[]} entries
 * @param {string} [containerId]
 */
export function renderLedgerRecords(entries, containerId = 'ledger-records') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!Array.isArray(entries) || entries.length === 0) {
    container.innerHTML = buildEmptyState();
    return;
  }

  const mobileCardsHtml = entries
    .map(
      (entry) => `
      <article class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <span>${formatDate(entry.date)}</span>
              <span>•</span>
              <span class="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">
                ${escapeHtml(entry.category)}
              </span>
            </div>
            <h4 class="mt-1 text-sm font-semibold text-white truncate">${escapeHtml(entry.title)}</h4>
            <p class="text-xs text-slate-400 mt-0.5">${escapeHtml(entry.bikeName || '')}</p>
          </div>
          <div class="text-right shrink-0 tabular-nums">
            <span class="block text-sm font-bold text-pink-400">
              ${formatCurrency(entry.cost)}
            </span>
            ${
              entry.distanceKm
                ? `<span class="text-xs text-slate-400">${formatNumber(entry.distanceKm, 1)} km</span>`
                : ''
            }
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-2.5">
          <button
            type="button"
            data-action="edit-entry"
            data-id="${escapeHtml(entry.id)}"
            class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800">
            ${escapeHtml(t('common.edit'))}
          </button>
          <button
            type="button"
            data-action="delete-entry"
            data-id="${escapeHtml(entry.id)}"
            class="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10">
            ${escapeHtml(t('common.delete'))}
          </button>
        </div>
      </article>
    `
    )
    .join('');

  const desktopRowsHtml = entries
    .map(
      (entry) => `
      <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
        <td class="py-3.5 px-4 text-xs text-slate-300 whitespace-nowrap">${formatDate(entry.date)}</td>
        <td class="py-3.5 px-4">
          <div class="text-sm font-medium text-white">${escapeHtml(entry.title)}</div>
          <div class="text-xs text-slate-400">${escapeHtml(entry.bikeName || '')}</div>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">
          <span class="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
            ${escapeHtml(entry.category)}
          </span>
        </td>
        <td class="py-3.5 px-4 text-right text-sm tabular-nums text-slate-300 whitespace-nowrap">
          ${entry.distanceKm ? `${formatNumber(entry.distanceKm, 1)} km` : '—'}
        </td>
        <td class="py-3.5 px-4 text-right text-sm font-semibold tabular-nums text-pink-400 whitespace-nowrap">
          ${formatCurrency(entry.cost)}
        </td>
        <td class="py-3.5 px-4 text-right whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <button
              type="button"
              data-action="edit-entry"
              data-id="${escapeHtml(entry.id)}"
              class="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800">
              ${escapeHtml(t('common.edit'))}
            </button>
            <button
              type="button"
              data-action="delete-entry"
              data-id="${escapeHtml(entry.id)}"
              class="rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/10">
              ${escapeHtml(t('common.delete'))}
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  container.innerHTML = `
    <div class="space-y-3 md:hidden">
      ${mobileCardsHtml}
    </div>

    <div class="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-800 bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
            <th class="py-3 px-4 font-semibold">${escapeHtml(t('ledger.col_date'))}</th>
            <th class="py-3 px-4 font-semibold">${escapeHtml(t('ledger.col_item'))}</th>
            <th class="py-3 px-4 font-semibold">${escapeHtml(t('ledger.col_category'))}</th>
            <th class="py-3 px-4 font-semibold text-right">${escapeHtml(t('ledger.col_distance'))}</th>
            <th class="py-3 px-4 font-semibold text-right">${escapeHtml(t('ledger.col_cost'))}</th>
            <th class="py-3 px-4 font-semibold text-right">${escapeHtml(t('ledger.col_actions'))}</th>
          </tr>
        </thead>
        <tbody>${desktopRowsHtml}</tbody>
      </table>
    </div>
  `;
}

/** @param {string} modalId */
export function openResponsiveModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
}

/** @param {string} modalId */
export function closeResponsiveModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('overflow-hidden');
}

export function bindGlobalModalEvents() {
  document.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement | null} */ (event.target);
    if (!target) return;

    const closeBtn = target.closest('[data-close-modal]');
    if (closeBtn) {
      const modalId = closeBtn.getAttribute('data-close-modal');
      if (modalId) closeResponsiveModal(modalId);
      return;
    }

    if (target.matches('[data-modal-backdrop]') && target.id) {
      closeResponsiveModal(target.id);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-modal-backdrop]:not(.hidden)').forEach((modal) => {
      if (modal.id) closeResponsiveModal(modal.id);
    });
  });
}
