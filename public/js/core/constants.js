// public/js/core/constants.js

/**
 * @typedef {import('../types/models.js').WearStatus} WearStatus
 * @typedef {import('./i18n.js').TranslationKey} TranslationKey
 */

/**
 * @typedef {Object} StatusStyleConfig
 * @property {TranslationKey} i18nKey
 * @property {string} badgeClass
 * @property {string} barClass
 */

/** @type {{ STRAVA_SYNC: boolean }} */
export const FEATURES = {
  STRAVA_SYNC: false,
};

/** @type {Readonly<{ WARNING: number, CRITICAL: number, OVERDUE: number }>} */
export const WEAR_THRESHOLDS = Object.freeze({
  WARNING: 70,
  CRITICAL: 90,
  OVERDUE: 100,
});

/** @type {readonly string[]} */
export const COMPONENT_CATEGORIES = Object.freeze([
  'Drivetrain',
  'Tires',
  'Brakes',
  'Bearings',
  'Service',
  'Accessories',
]);

/** @type {Record<WearStatus, StatusStyleConfig>} */
export const STATUS_STYLES = {
  good: {
    i18nKey: 'status.good',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    barClass: 'bg-emerald-500',
  },
  warning: {
    i18nKey: 'status.warning',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    barClass: 'bg-amber-500',
  },
  critical: {
    i18nKey: 'status.critical',
    badgeClass: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    barClass: 'bg-orange-500',
  },
  overdue: {
    i18nKey: 'status.overdue',
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    barClass: 'bg-rose-500',
  },
};

/**
 * @param {number} wearPercentage
 * @returns {WearStatus}
 */
export function getWearStatus(wearPercentage) {
  const pct = Number(wearPercentage) || 0;
  if (pct >= WEAR_THRESHOLDS.OVERDUE) return 'overdue';
  if (pct >= WEAR_THRESHOLDS.CRITICAL) return 'critical';
  if (pct >= WEAR_THRESHOLDS.WARNING) return 'warning';
  return 'good';
}
