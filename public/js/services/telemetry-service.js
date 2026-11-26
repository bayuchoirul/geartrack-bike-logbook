// public/js/services/telemetry-service.js
import { getSupabaseClient } from '../core/supabase-client.js';

/**
 * @typedef {import('../types/models.js').Bike} Bike
 * @typedef {import('../types/models.js').GearComponent} GearComponent
 * @typedef {import('../types/models.js').ActivityLog} ActivityLog
 * @typedef {import('../types/models.js').LedgerEntry} LedgerEntry
 * @typedef {import('../types/models.js').BikeUpsertInput} BikeUpsertInput
 * @typedef {import('../types/models.js').GearComponentUpsertInput} GearComponentUpsertInput
 * @typedef {import('../types/models.js').ActivityCreateInput} ActivityCreateInput
 * @typedef {import('../types/models.js').LedgerEntryUpsertInput} LedgerEntryUpsertInput
 * @typedef {import('../types/models.js').DashboardSnapshot} DashboardSnapshot
 * @typedef {import('../types/models.js').GarageSnapshot} GarageSnapshot
 * @typedef {import('../types/models.js').LedgerSnapshot} LedgerSnapshot
 *
 * @typedef {Object} ComponentRule
 * @property {string} id
 * @property {string} categoryName
 * @property {string} badgeLabel
 * @property {string} description
 * @property {number} lifespanKm
 * @property {number} warnThresholdPct
 * @property {number} critThresholdPct
 */

export const TABLES = {
  BIKES: 'bikes',
  COMPONENTS: 'components',
  COMPONENT_RULES: 'component_rules',
  ACTIVITIES: 'activities',
  LEDGER: 'ledger_entries',
};

/** @param {Record<string, any>} row @returns {Bike} */
function mapBikeFromDb(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name ?? '',
    brandModel: row.brand_model ?? row.model ?? '',
    totalOdometerKm: Number(row.total_odometer_km ?? row.odometer_km ?? 0),
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at ?? null,
  };
}

/** @param {Record<string, any>} row @returns {GearComponent} */
function mapComponentFromDb(row) {
  return {
    id: row.id,
    userId: row.user_id,
    bikeId: row.bike_id,
    name: row.name ?? '',
    category: row.category ?? 'Service',
    installedOdometerKm: Number(row.installed_odometer_km ?? 0),
    lifespanKm: Number(row.lifespan_km ?? 3000),
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at ?? null,
  };
}

/** @param {Record<string, any>} row @returns {ComponentRule} */
function mapComponentRuleFromDb(row) {
  const rawMaxKm = Number(
    row.default_max_km ?? row.lifespan_km ?? row.max_km ?? row.interval_km ?? 3000
  );
  const lifespanKm = Number.isFinite(rawMaxKm) && rawMaxKm > 0 ? rawMaxKm : 3000;

  const rawWarnPct = Number(row.warn_threshold_pct ?? 75);
  const warnThresholdPct = Number.isFinite(rawWarnPct) && rawWarnPct > 0 ? rawWarnPct : 75;

  const rawCritPct = Number(row.crit_threshold_pct ?? 90);
  const critThresholdPct = Number.isFinite(rawCritPct) && rawCritPct > 0 ? rawCritPct : 90;

  return {
    id: String(row.id),
    categoryName: String(row.category_name ?? row.name ?? 'Component'),
    badgeLabel: String(row.badge_label ?? 'SERVICE'),
    description: String(row.description ?? ''),
    lifespanKm,
    warnThresholdPct,
    critThresholdPct,
  };
}

/** @param {Record<string, any>} row @returns {ActivityLog} */
function mapActivityFromDb(row) {
  return {
    id: row.id,
    userId: row.user_id,
    bikeId: row.bike_id,
    stravaActivityId: row.strava_activity_id ?? null,
    title: row.title ?? row.name ?? 'Ride',
    date: row.date ?? row.activity_date ?? '',
    distanceKm: Number(row.distance_km ?? 0),
    durationMinutes: Number(row.duration_minutes ?? 0),
    elevationGainM: Number(row.elevation_gain_m ?? 0),
    notes: row.notes ?? '',
  };
}

/** @param {Record<string, any>} row @returns {LedgerEntry} */
function mapLedgerFromDb(row) {
  return {
    id: row.id,
    userId: row.user_id,
    bikeId: row.bike_id,
    title: row.title ?? '',
    category: row.category ?? 'Service',
    cost: Number(row.cost ?? 0),
    date: row.date ?? '',
    distanceKm:
      row.distance_km !== null && row.distance_km !== undefined
        ? Number(row.distance_km)
        : null,
  };
}

/** @param {string} userId */
function assertUserId(userId) {
  if (!userId) {
    throw new Error('User ID tidak ditemukan. Silakan masuk ulang.');
  }
}

/** @param {string} userId @returns {Promise<Bike[]>} */
export async function fetchUserBikes(userId) {
  assertUserId(userId);
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.BIKES)
    .select('*')
    .eq('user_id', userId)
    .order('is_archived', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapBikeFromDb);
}

/** @param {string} userId @returns {Promise<GearComponent[]>} */
export async function fetchUserComponents(userId) {
  assertUserId(userId);
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.COMPONENTS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapComponentFromDb);
}

/** @returns {Promise<ComponentRule[]>} */
export async function fetchComponentRules() {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.COMPONENT_RULES)
    .select('*')
    .order('category_name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapComponentRuleFromDb);
}

/** @param {string} userId @param {number} [limit] @returns {Promise<ActivityLog[]>} */
export async function fetchUserActivities(userId, limit = 50) {
  assertUserId(userId);
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.ACTIVITIES)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapActivityFromDb);
}

/** @param {string} userId @returns {Promise<LedgerEntry[]>} */
export async function fetchUserLedger(userId) {
  assertUserId(userId);
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from(TABLES.LEDGER)
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapLedgerFromDb);
}

/** @param {string} userId @returns {Promise<DashboardSnapshot>} */
export async function fetchDashboardSnapshot(userId) {
  const [bikes, components, activities, ledgerEntries] = await Promise.all([
    fetchUserBikes(userId),
    fetchUserComponents(userId),
    fetchUserActivities(userId, 20),
    fetchUserLedger(userId),
  ]);

  return { bikes, components, activities, ledgerEntries };
}

/** @param {string} userId @returns {Promise<GarageSnapshot>} */
export async function fetchGarageSnapshot(userId) {
  const [bikes, components] = await Promise.all([
    fetchUserBikes(userId),
    fetchUserComponents(userId),
  ]);

  return { bikes, components };
}

/**
 * @param {string} userId
 * @returns {Promise<LedgerSnapshot & { components: GearComponent[], rules: ComponentRule[] }>}
 */
export async function fetchLedgerSnapshot(userId) {
  const [bikes, entries, components, rules] = await Promise.all([
    fetchUserBikes(userId),
    fetchUserLedger(userId),
    fetchUserComponents(userId),
    fetchComponentRules(),
  ]);

  return { bikes, entries, components, rules };
}

/** @param {string} userId @param {BikeUpsertInput} payload @returns {Promise<Bike>} */
export async function upsertBike(userId, payload) {
  assertUserId(userId);
  if (!payload?.name) throw new Error('Nama sepeda wajib diisi.');

  const supabase = await getSupabaseClient();
  const dbRecord = {
    user_id: userId,
    name: payload.name.trim(),
    brand_model: (payload.brandModel ?? '').trim(),
    total_odometer_km: Math.max(0, Number(payload.totalOdometerKm) || 0),
    is_archived: Boolean(payload.isArchived),
  };

  if (payload.id) {
    const { data, error } = await supabase
      .from(TABLES.BIKES)
      .update(dbRecord)
      .eq('id', payload.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return mapBikeFromDb(data);
  }

  const { data, error } = await supabase
    .from(TABLES.BIKES)
    .insert(dbRecord)
    .select()
    .single();

  if (error) throw error;
  return mapBikeFromDb(data);
}

/** @param {string} userId @param {GearComponentUpsertInput} payload @returns {Promise<GearComponent>} */
export async function upsertGearComponent(userId, payload) {
  assertUserId(userId);
  if (!payload?.bikeId || !payload?.name) {
    throw new Error('Sepeda dan nama komponen wajib diisi.');
  }

  const supabase = await getSupabaseClient();
  const dbRecord = {
    user_id: userId,
    bike_id: payload.bikeId,
    name: payload.name.trim(),
    category: payload.category || 'Service',
    installed_odometer_km: Math.max(0, Number(payload.installedOdometerKm) || 0),
    lifespan_km: Math.max(1, Number(payload.lifespanKm) || 3000),
    is_archived: Boolean(payload.isArchived),
  };

  if (payload.id) {
    const { data, error } = await supabase
      .from(TABLES.COMPONENTS)
      .update(dbRecord)
      .eq('id', payload.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return mapComponentFromDb(data);
  }

  const { data, error } = await supabase
    .from(TABLES.COMPONENTS)
    .insert(dbRecord)
    .select()
    .single();

  if (error) throw error;
  return mapComponentFromDb(data);
}

/** @param {string} componentId @returns {Promise<void>} */
export async function deleteGearComponent(componentId) {
  if (!componentId) throw new Error('ID komponen tidak valid.');
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from(TABLES.COMPONENTS)
    .delete()
    .eq('id', componentId);

  if (error) throw error;
}

/** @param {string} userId @param {ActivityCreateInput} payload @returns {Promise<ActivityLog>} */
export async function createActivityLog(userId, payload) {
  assertUserId(userId);
  const distanceKm = Number(payload.distanceKm);
  if (!payload?.bikeId || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new Error('Sepeda dan jarak tempuh (> 0 km) wajib diisi.');
  }

  const supabase = await getSupabaseClient();
  const { data: created, error: insertError } = await supabase
    .from(TABLES.ACTIVITIES)
    .insert({
      user_id: userId,
      bike_id: payload.bikeId,
      date: payload.date,
      title: payload.title.trim(),
      distance_km: distanceKm,
      duration_minutes: Math.max(0, Number(payload.durationMinutes) || 0),
      elevation_gain_m: Math.max(0, Number(payload.elevationGainM) || 0),
      notes: (payload.notes ?? '').trim(),
    })
    .select()
    .single();

  if (insertError) throw insertError;

  const { data: bikeRow, error: bikeFetchError } = await supabase
    .from(TABLES.BIKES)
    .select('total_odometer_km')
    .eq('id', payload.bikeId)
    .eq('user_id', userId)
    .single();

  if (!bikeFetchError && bikeRow) {
    const nextOdometer = Number(
      ((Number(bikeRow.total_odometer_km) || 0) + distanceKm).toFixed(2)
    );
    await supabase
      .from(TABLES.BIKES)
      .update({ total_odometer_km: nextOdometer })
      .eq('id', payload.bikeId)
      .eq('user_id', userId);
  }

  return mapActivityFromDb(created);
}

/** @param {string} userId @param {LedgerEntryUpsertInput} payload @returns {Promise<LedgerEntry>} */
export async function upsertLedgerEntry(userId, payload) {
  assertUserId(userId);
  if (!payload?.bikeId || !payload?.title) {
    throw new Error('Sepeda dan keterangan transaksi wajib diisi.');
  }

  const supabase = await getSupabaseClient();
  const dbRecord = {
    user_id: userId,
    bike_id: payload.bikeId,
    date: payload.date,
    title: payload.title.trim(),
    category: payload.category || 'Service',
    cost: Math.max(0, Number(payload.cost) || 0),
    distance_km:
      payload.distanceKm !== null && payload.distanceKm !== undefined && payload.distanceKm !== ''
        ? Math.max(0, Number(payload.distanceKm))
        : null,
  };

  if (payload.id) {
    const { data, error } = await supabase
      .from(TABLES.LEDGER)
      .update(dbRecord)
      .eq('id', payload.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return mapLedgerFromDb(data);
  }

  const { data, error } = await supabase
    .from(TABLES.LEDGER)
    .insert(dbRecord)
    .select()
    .single();

  if (error) throw error;
  return mapLedgerFromDb(data);
}

/** @param {string} userId @param {LedgerEntryUpsertInput} payload @returns {Promise<LedgerEntry>} */
export async function createLedgerEntry(userId, payload) {
  return upsertLedgerEntry(userId, { ...payload, id: undefined });
}

/** @param {string} entryId @returns {Promise<void>} */
export async function deleteLedgerEntry(entryId) {
  if (!entryId) throw new Error('ID transaksi tidak valid.');
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from(TABLES.LEDGER)
    .delete()
    .eq('id', entryId);

  if (error) throw error;
}