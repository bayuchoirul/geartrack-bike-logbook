// api/strava/sync.js
// Endpoint POST untuk tombol "SYNC STRAVA" di Dashboard / Navbar
import {
  getRiderSettings,
  refreshStravaAccessToken,
  syncActivitiesFromStrava,
} from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const settings = await getRiderSettings();
    const refreshToken =
      settings?.strava_refresh_token || process.env.STRAVA_REFRESH_TOKEN || '';

    // Jika belum pernah login/authorize Strava, arahkan frontend ke OAuth
    if (!refreshToken) {
      return res.status(200).json({
        success: false,
        needsAuth: true,
        authUrl: '/api/strava/auth',
        message: 'Akun Strava belum terhubung. Mengalihkan ke otorisasi Strava...',
      });
    }

    const targetBikeId = req.body?.bikeId || null;
    const accessToken = await refreshStravaAccessToken(refreshToken);
    const result = await syncActivitiesFromStrava(accessToken, targetBikeId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Strava Sync Error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Terjadi kesalahan saat sinkronisasi Strava.',
    });
  }
}
