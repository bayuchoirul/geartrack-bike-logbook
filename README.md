# GearTrack / Bike Logbook Telemetry v2.5 (Complete GitHub + Vercel + Strava Edition)

Paket lengkap aplikasi **Bike Logbook** yang menggabungkan frontend telemetri, konektor Supabase, dan sinkronisasi otomatis **Strava OAuth 2.0**.

## Struktur File Lengkap
- `index.html`, `log-activity.html`, `ledger.html`, `garage.html` — Halaman UI utama
- `js/config.js`, `js/supabase-service.js`, `js/app-controller.js` — Client controller & layanan Supabase/Strava
- `api/config.js` — Endpoint konfigurasi dinamis dari Vercel Environment Variables
- `api/strava/auth.js`, `api/strava/callback.js`, `api/strava/sync.js`, `api/strava/_lib.js` — Serverless backend Strava OAuth & Sync
- `schema.sql` — Skema tabel, view, dan trigger otomatis odometer komponen di Supabase
- `vercel.json` & `package.json` — Konfigurasi routing & ES Module Vercel

## Cara Update di GitHub & Vercel
1. Ekstrak file ZIP ini, lalu upload seluruh isi folder `geartrack-bike-logbook` ke repositori GitHub Anda (timpa file lama).
2. Buka https://www.strava.com/settings/api dan atur **Authorization Callback Domain** ke domain Vercel Anda (misal `geartrack-bike-logbook.vercel.app`).
3. Di Vercel Dashboard -> **Settings** -> **Environment Variables**, pastikan variabel berikut tersedia untuk **Production**:
   - `SUPABASE_URL` (atau `NEXT_PUBLIC_SUPABASE_URL`)
   - `SUPABASE_ANON_KEY` (atau `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
4. Setelah Vercel selesai auto-deploy, klik tombol **SYNC STRAVA** di pojok kanan atas aplikasi.
