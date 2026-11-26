// public/js/types/models.js

/**
 * @typedef {Object} Bike
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {string} brandModel
 * @property {number} totalOdometerKm
 * @property {boolean} isArchived
 * @property {string | null} [createdAt]
 */

/**
 * @typedef {Object} GearComponent
 * @property {string} id
 * @property {string} userId
 * @property {string} bikeId
 * @property {string} name
 * @property {string} category
 * @property {number} installedOdometerKm
 * @property {number} lifespanKm
 * @property {boolean} [isArchived]
 * @property {string | null} [createdAt]
 */

/**
 * @typedef {Object} ActivityLog
 * @property {string} id
 * @property {string} userId
 * @property {string} bikeId
 * @property {number | null} [stravaActivityId]
 * @property {string} title
 * @property {string} date
 * @property {number} distanceKm
 * @property {number} durationMinutes
 * @property {number} elevationGainM
 * @property {string} notes
 * @property {string} [bikeName]
 */

/**
 * @typedef {Object} LedgerEntry
 * @property {string} id
 * @property {string} userId
 * @property {string} bikeId
 * @property {string} title
 * @property {string} category
 * @property {number} cost
 * @property {string} date
 * @property {number | null} [distanceKm]
 * @property {string} [bikeName]
 */

/**
 * @typedef {Object} BikeUpsertInput
 * @property {string} [id]
 * @property {string} name
 * @property {string} [brandModel]
 * @property {number} totalOdometerKm
 * @property {boolean} [isArchived]
 */

/**
 * @typedef {Object} GearComponentUpsertInput
 * @property {string} [id]
 * @property {string} bikeId
 * @property {string} name
 * @property {string} category
 * @property {number} installedOdometerKm
 * @property {number} lifespanKm
 * @property {boolean} [isArchived]
 */

/**
 * @typedef {Object} ActivityCreateInput
 * @property {string} bikeId
 * @property {string} date
 * @property {string} title
 * @property {number} distanceKm
 * @property {number} [durationMinutes]
 * @property {number} [elevationGainM]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} LedgerEntryUpsertInput
 * @property {string} [id]
 * @property {string} bikeId
 * @property {string} date
 * @property {string} title
 * @property {string} category
 * @property {number} cost
 * @property {number | string | null} [distanceKm]
 */

/**
 * @typedef {'good' | 'warning' | 'critical' | 'overdue'} WearStatus
 */

/**
 * @typedef {Object} WearMetrics
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} distanceUsedKm
 * @property {number} remainingKm
 * @property {number} wearPercentage
 * @property {WearStatus} status
 * @property {boolean} needsAttention
 * @property {string} [bikeName]
 */

/**
 * @typedef {Object} LedgerFilterOptions
 * @property {string} [bikeId]
 * @property {string} [category]
 * @property {string} [startDate]
 * @property {string} [endDate]
 */

/**
 * @typedef {Object} CategoryCostBreakdown
 * @property {string} category
 * @property {number} totalCost
 * @property {number} entryCount
 * @property {number} sharePercentage
 */

/**
 * @typedef {Object} LedgerSummary
 * @property {number} totalCost
 * @property {number} entryCount
 * @property {number} averageCostPerEntry
 * @property {number | null} costPerKm
 * @property {CategoryCostBreakdown[]} byCategory
 */

/**
 * @typedef {Object} DashboardSnapshot
 * @property {Bike[]} bikes
 * @property {GearComponent[]} components
 * @property {ActivityLog[]} activities
 * @property {LedgerEntry[]} ledgerEntries
 */

/**
 * @typedef {Object} GarageSnapshot
 * @property {Bike[]} bikes
 * @property {GearComponent[]} components
 */

/**
 * @typedef {Object} LedgerSnapshot
 * @property {Bike[]} bikes
 * @property {LedgerEntry[]} entries
 */

export {};
