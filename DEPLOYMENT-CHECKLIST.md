# Panduan Ekstraksi & Verifikasi Refactor GearTrack

## 1. Daftar Lengkap File Hasil Refactor (32 File)
Seluruh file berikut sudah tergabung di dalam `geartrack-bike-logbook-refactor-v2.zip`:
- **Halaman HTML (`public/`)**: `index.html`, `login.html`, `log-activity.html`, `garage.html`, `ledger.html`
- **Konfigurasi Build & Routing**: `package.json`, `jsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `vercel.json`, `src/css/input.css`
- **Skema Database**: `database/schema.sql`
- **Tipe & Modul Inti (`public/js/`)**: `types/external.d.ts`, `types/models.js`, `core/supabase-client.js`, `core/constants.js`, `core/i18n.js`
- **Domain & Layanan**: `domain/component-wear.js`, `domain/maintenance-ledger.js`, `services/auth-service.js`, `services/telemetry-service.js`
- **UI & Controllers**: `ui/app-shell.js`, `ui/ui-bindings.js`, `controllers/app-controller.js`, `controllers/login-controller.js`, `controllers/dashboard-controller.js`, `controllers/log-activity-controller.js`, `controllers/garage-controller.js`, `controllers/ledger-controller.js`
- **Unit Tests (`tests/`)**: `component-wear.test.js`, `maintenance-ledger.test.js`

## 2. Catatan Penting Saat Menyalin ke Repo Lokal
- Jangan hapus folder `api/` (seperti `api/config.js`) yang sudah ada di repositori Anda, karena `supabase-client.js` mengambil kredensial publik dari endpoint `/api/config`.

## 3. Verifikasi Lokal
```bash
npm install
npm run typecheck
npm run build
npm test
```

## 4. Pengaturan Supabase & Vercel
1. Jalankan isi `database/schema.sql` di **Supabase SQL Editor**.
2. Di **Vercel Project Settings → General**:
   - **Framework Preset**: `Other`
   - **Root Directory**: `.` (kosongkan)
   - **Build Command**: `npm run build`
   - **Output Directory**: `public`
3. Di **Vercel Environment Variables**: Pastikan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` aktif.
