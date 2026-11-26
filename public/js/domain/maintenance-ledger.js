// public/js/domain/maintenance-ledger.js

/**
 * @typedef {import('../types/models.js').LedgerEntry} LedgerEntry
 * @typedef {import('../types/models.js').LedgerFilterOptions} LedgerFilterOptions
 * @typedef {import('../types/models.js').CategoryCostBreakdown} CategoryCostBreakdown
 * @typedef {import('../types/models.js').LedgerSummary} LedgerSummary
 */

/**
 * @param {LedgerEntry[]} entries
 * @param {LedgerFilterOptions} [options]
 * @returns {LedgerEntry[]}
 */
export function filterLedgerEntries(entries, options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const { bikeId, category, startDate, endDate } = options;

  return list.filter((entry) => {
    if (bikeId && entry.bikeId !== bikeId) return false;
    if (category && entry.category !== category) return false;
    if (startDate && entry.date && entry.date < startDate) return false;
    if (endDate && entry.date && entry.date > endDate) return false;
    return true;
  });
}

/**
 * @param {number} totalCost
 * @param {number} totalDistanceKm
 * @returns {number | null}
 */
export function calculateCostPerKm(totalCost, totalDistanceKm) {
  const safeDistance = Number(totalDistanceKm);
  if (!Number.isFinite(safeDistance) || safeDistance <= 0) {
    return null;
  }

  const safeCost = Math.max(0, Number(totalCost) || 0);
  return Number((safeCost / safeDistance).toFixed(2));
}

/**
 * @param {LedgerEntry[]} entries
 * @param {number} totalCost
 * @returns {CategoryCostBreakdown[]}
 */
export function groupLedgerByCategory(entries, totalCost) {
  /** @type {Map<string, { totalCost: number, entryCount: number }>} */
  const grouped = new Map();

  for (const entry of entries) {
    const key = entry.category || 'Service';
    const current = grouped.get(key) ?? { totalCost: 0, entryCount: 0 };
    grouped.set(key, {
      totalCost: current.totalCost + Math.max(0, Number(entry.cost) || 0),
      entryCount: current.entryCount + 1,
    });
  }

  /** @type {CategoryCostBreakdown[]} */
  const breakdown = [];
  for (const [category, stats] of grouped.entries()) {
    const roundedCost = Number(stats.totalCost.toFixed(2));
    const sharePercentage =
      totalCost > 0 ? Number(((roundedCost / totalCost) * 100).toFixed(1)) : 0;

    breakdown.push({
      category,
      totalCost: roundedCost,
      entryCount: stats.entryCount,
      sharePercentage,
    });
  }

  return breakdown.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * @param {LedgerEntry[]} entries
 * @param {number} [totalDistanceKm]
 * @param {LedgerFilterOptions} [filterOptions]
 * @returns {LedgerSummary}
 */
export function summarizeMaintenanceLedger(
  entries,
  totalDistanceKm = 0,
  filterOptions = {}
) {
  const filtered = filterLedgerEntries(entries, filterOptions);
  const entryCount = filtered.length;

  const rawTotalCost = filtered.reduce(
    (sum, entry) => sum + Math.max(0, Number(entry.cost) || 0),
    0
  );
  const totalCost = Number(rawTotalCost.toFixed(2));
  const averageCostPerEntry =
    entryCount > 0 ? Number((totalCost / entryCount).toFixed(2)) : 0;

  const costPerKm = calculateCostPerKm(totalCost, totalDistanceKm);
  const byCategory = groupLedgerByCategory(filtered, totalCost);

  return {
    totalCost,
    entryCount,
    averageCostPerEntry,
    costPerKm,
    byCategory,
  };
}
