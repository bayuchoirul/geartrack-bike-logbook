// api/strava/_lib.js
// Helper bersama untuk koneksi Supabase REST & sinkronisasi aktivitas Strava

export function getEnvConfig() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).replace(/\/$/, '');

  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  const stravaClientId = process.env.STRAVA_CLIENT_ID || '';
  const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET || '';

  return { supabaseUrl, supabaseServiceKey, stravaClientId, stravaClientSecret };
}

export async function supabaseRest(path, options = {}) {
  const { supabaseUrl, supabaseServiceKey } = getEnvConfig();
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di Vercel.');
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Supabase REST error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function getRiderSettings() {
  const rows = await supabaseRest('rider_settings?id=eq.1&select=*');
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function updateRiderSettings(updates) {
  return await supabaseRest('rider_settings?id=eq.1', {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      ...updates,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function refreshStravaAccessToken(refreshToken) {
  const { stravaClientId, stravaClientSecret } = getEnvConfig();
  if (!stravaClientId || !stravaClientSecret) {
    throw new Error('STRAVA_CLIENT_ID dan STRAVA_CLIENT_SECRET belum diisi di Vercel Environment Variables.');
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: stravaClientId,
      client_secret: stravaClientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.message || 'Gagal memperbarui Strava access token. Silakan hubungkan ulang Strava.');
  }

  // Simpan refresh token terbaru jika Strava melakukan rotasi token
  if (tokenData.refresh_token && tokenData.refresh_token !== refreshToken) {
    await updateRiderSettings({
      strava_refresh_token: tokenData.refresh_token,
      strava_connected: true,
    });
  }

  return tokenData.access_token;
}

export async function syncActivitiesFromStrava(accessToken, targetBikeId = null) {
  // 1. Tentukan sepeda target (default: sepeda aktif utama, misal Polygon Path X4)
  let bikeQuery = 'bikes?is_default=eq.true&select=id,name&limit=1';
  if (targetBikeId) {
    bikeQuery = `bikes?id=eq.${targetBikeId}&select=id,name&limit=1`;
  }
  const bikes = await supabaseRest(bikeQuery);
  const bike = Array.isArray(bikes) && bikes.length > 0 ? bikes[0] : null;
  if (!bike) {
    throw new Error('Sepeda aktif tidak ditemukan di database.');
  }

  // 2. Ambil 30 aktivitas terbaru dari Strava API v3
  const actRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const activities = await actRes.json();
  if (!actRes.ok || !Array.isArray(activities)) {
    throw new Error(activities?.message || 'Gagal mengambil daftar aktivitas dari Strava.');
  }

  // 3. Filter hanya aktivitas bersepeda
  const allowedTypes = new Set([
    'Ride',
    'GravelRide',
    'VirtualRide',
    'MountainBikeRide',
    'EBikeRide',
  ]);

  const cyclingActs = activities.filter(
    (act) => allowedTypes.has(act.type || act.sport_type) && Number(act.distance) > 0
  );

  if (cyclingActs.length === 0) {
    return { syncedCount: 0, totalKmAdded: 0, bikeName: bike.name };
  }

  // 4. Cek ID aktivitas yang sudah ada di database agar tidak terduplikasi
  const stravaIds = cyclingActs.map((a) => a.id).join(',');
  const existingRows = await supabaseRest(
    `activities?strava_activity_id=in.(${stravaIds})&select=strava_activity_id`
  );
  const existingSet = new Set((existingRows || []).map((r) => Number(r.strava_activity_id)));

  const newPayloads = [];
  let totalKmAdded = 0;

  for (const act of cyclingActs) {
    if (existingSet.has(Number(act.id))) continue;

    const distanceKm = Number((Number(act.distance) / 1000).toFixed(2));
    if (distanceKm <= 0) continue;

    const rawType = act.sport_type || act.type;
    let rideType = 'Road';
    if (rawType === 'GravelRide' || rawType === 'MountainBikeRide') rideType = 'Gravel';
    else if (rawType === 'VirtualRide') rideType = 'Trainer/Ind.';
    else if (act.commute) rideType = 'Commute';

    totalKmAdded += distanceKm;
    newPayloads.push({
      bike_id: bike.id,
      strava_activity_id: Number(act.id),
      title: act.name || 'Strava Ride',
      ride_type: rideType,
      ride_date: act.start_date,
      distance_km: distanceKm,
      elevation_gain_m: Number(act.total_elevation_gain || 0),
      elapsed_seconds: Number(act.moving_time || act.elapsed_time || 0),
      avg_speed_kmh: act.average_speed ? Number((Number(act.average_speed) * 3.6).toFixed(2)) : null,
      avg_power_w: act.average_watts ? Math.round(Number(act.average_watts)) : null,
      source: 'strava',
      notes: `Synced from Strava (#${act.id})`,
    });
  }

  // 5. Insert aktivitas baru -> Trigger Postgres otomatis menambah odometer sepeda & wear komponen!
  if (newPayloads.length > 0) {
    await supabaseRest('activities', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(newPayloads),
    });
  }

  return {
    syncedCount: newPayloads.length,
    totalKmAdded: Number(totalKmAdded.toFixed(2)),
    bikeName: bike.name,
  };
}
