// js/config.js
// Di Vercel: otomatis mengambil nilai dari Environment Variables melalui /api/config
// Di Lokal (tanpa Vercel CLI): gunakan nilai fallback di bawah ini
const LOCAL_FALLBACK_CONFIG = {
  URL: 'https://YOUR_PROJECT_ID.supabase.co',
  ANON_KEY: 'YOUR_SUPABASE_ANON_PUBLIC_KEY',
  GOOGLE_SHEETS_WEBHOOK_URL: ''
};

export async function loadAppConfig() {
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    if (res.ok) {
      const envConfig = await res.json();
      if (envConfig.URL && envConfig.ANON_KEY) {
        return {
          URL: envConfig.URL,
          ANON_KEY: envConfig.ANON_KEY,
          GOOGLE_SHEETS_WEBHOOK_URL: envConfig.GOOGLE_SHEETS_WEBHOOK_URL || '',
          CURRENCY: 'IDR',
          LOCALE: 'id-ID'
        };
      }
    }
  } catch (_) {
    // Abaikan jika dijalankan di server statis lokal tanpa /api/config
  }

  return {
    ...LOCAL_FALLBACK_CONFIG,
    CURRENCY: 'IDR',
    LOCALE: 'id-ID'
  };
}
