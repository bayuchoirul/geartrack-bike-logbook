// public/js/domain/component-wear.js
import { getWearStatus, WEAR_THRESHOLDS } from '../core/constants.js';

/**
 * @typedef {import('../types/models.js').GearComponent} GearComponent
 * @typedef {import('../types/models.js').WearMetrics} WearMetrics
 * @typedef {import('../types/models.js').WearStatus} WearStatus
 * @typedef {{ items: WearMetrics[], totalCount: number, attentionCount: number, overdueCount: number, averageWearPercentage: number }} BikeWearSummary
 */

/**
 * @param {GearComponent} component
 * @param {number} currentBikeOdometerKm
 * @returns {WearMetrics}
 */
export function calculateComponentWear(component, currentBikeOdometerKm) {
  const installedKm = Math.max(0, Number(component.installedOdometerKm) || 0);
  const currentKm = Math.max(0, Number(currentBikeOdometerKm) || 0);
  const lifespanKm = Math.max(1, Number(component.lifespanKm) || 3000);

  const distanceUsedKm = Number(Math.max(0, currentKm - installedKm).toFixed(2));
  const remainingKm = Number(Math.max(0, lifespanKm - distanceUsedKm).toFixed(2));
  const rawPercentage = (distanceUsedKm / lifespanKm) * 100;
  const wearPercentage = Number(rawPercentage.toFixed(1));

  /** @type {WearStatus} */
  const status = getWearStatus(wearPercentage);
  const needsAttention = wearPercentage >= WEAR_THRESHOLDS.WARNING;

  return {
    id: component.id,
    name: component.name,
    category: component.category || 'Service',
    distanceUsedKm,
    remainingKm,
    wearPercentage,
    status,
    needsAttention,
  };
}

/**
 * @param {GearComponent[]} components
 * @param {number} currentBikeOdometerKm
 * @returns {BikeWearSummary}
 */
export function summarizeBikeComponents(components, currentBikeOdometerKm) {
  const activeComponents = (Array.isArray(components) ? components : []).filter(
    (comp) => !comp.isArchived
  );

  /** @type {WearMetrics[]} */
  const items = activeComponents
    .map((comp) => calculateComponentWear(comp, currentBikeOdometerKm))
    .sort((a, b) => b.wearPercentage - a.wearPercentage);

  const totalCount = items.length;
  const attentionCount = items.filter((item) => item.needsAttention).length;
  const overdueCount = items.filter((item) => item.status === 'overdue').length;

  const totalWearPct = items.reduce((sum, item) => sum + item.wearPercentage, 0);
  const averageWearPercentage =
    totalCount > 0 ? Number((totalWearPct / totalCount).toFixed(1)) : 0;

  return {
    items,
    totalCount,
    attentionCount,
    overdueCount,
    averageWearPercentage,
  };
}
