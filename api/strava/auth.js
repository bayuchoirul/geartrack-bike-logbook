// api/strava/auth.js
// Mengarahkan pengguna ke halaman otorisasi Strava OAuth 2.0
import { getEnvConfig } from './_lib.js';

export default function handler(req, res) {
  const { stravaClientId } = getEnvConfig();
  if (!stravaClientId) {
    return res.status(500).json({
      success: false,
      error: 'STRAVA_CLIENT_ID belum ditambahkan di Vercel Environment Variables.',
    });
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/strava/callback`;

  const params = new URLSearchParams({
    client_id: stravaClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    approval_prompt: 'force',
    scope: 'read,activity:read_all',
  });

  res.writeHead(302, {
    Location: `https://www.strava.com/oauth/authorize?${params.toString()}`,
  });
  res.end();
}
