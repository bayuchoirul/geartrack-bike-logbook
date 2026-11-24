// api/strava/callback.js
// Menerima authorization code dari Strava, menyimpan refresh_token ke Supabase, lalu sync pertama kali
import {
  getEnvConfig,
  updateRiderSettings,
  syncActivitiesFromStrava,
} from './_lib.js';

export default async function handler(req, res) {
  const { code, error } = req.query || {};

  if (error || !code) {
    res.writeHead(302, { Location: '/?strava=denied' });
    return res.end();
  }

  try {
    const { stravaClientId, stravaClientSecret } = getEnvConfig();

    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: stravaClientId,
        client_secret: stravaClientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.refresh_token) {
      throw new Error(tokenData.message || 'Gagal menukar kode OAuth Strava.');
    }

    // Simpan refresh token permanen ke tabel rider_settings di Supabase
    await updateRiderSettings({
      strava_connected: true,
      strava_refresh_token: tokenData.refresh_token,
    });

    // Jalankan sinkronisasi awal segera setelah akun terhubung
    const syncResult = await syncActivitiesFromStrava(tokenData.access_token);

    res.writeHead(302, {
      Location: `/?strava=connected&synced=${syncResult.syncedCount}&km=${syncResult.totalKmAdded}`,
    });
    res.end();
  } catch (err) {
    console.error('Strava Callback Error:', err);
    res.writeHead(302, {
      Location: `/?strava=error&msg=${encodeURIComponent(err.message)}`,
    });
    res.end();
  }
}
