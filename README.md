# GearTrack / Bike Logbook Telemetry v2.4 (GitHub + Vercel Edition)

Paket aplikasi **Bike Logbook** siap push ke **GitHub** dan deploy otomatis ke **Vercel** tanpa proses build rumit (`Zero-Build Static + Vercel Serverless API`).

## Arsitektur Deploy
- **`vercel.json`**: Mengaktifkan `cleanUrls: true` sehingga rute `/`, `/log-activity`, `/ledger`, dan `/garage` berjalan mulus tanpa akhiran `.html`.
- **`api/config.js`**: Vercel Serverless Function yang menyuntikkan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `GOOGLE_SHEETS_WEBHOOK_URL` dari *Vercel Environment Variables* secara aman tanpa perlu hardcode di repositori GitHub publik.
- **`js/config.js`**: Otomatis membaca konfigurasi dari `/api/config` saat live di Vercel, dan memiliki fallback untuk pengujian lokal.

## Langkah Deploy ke GitHub & Vercel
1. **Setup Database Supabase**:
   - Buka Supabase Dashboard -> **SQL Editor** -> jalankan seluruh isi `schema.sql`.
   - Catat **Project URL** dan **anon public key** di menu *Project Settings -> API*.
2. **Push ke GitHub**:
   - Buat repositori baru di GitHub (misal `geartrack-bike-logbook`).
   - Upload atau `git push` seluruh isi folder ini ke repositori tersebut.
3. **Import & Deploy di Vercel**:
   - Buka [vercel.com](https://vercel.com) -> **Add New Project** -> pilih repositori GitHub `geartrack-bike-logbook`.
   - Biarkan **Framework Preset** pada `Other` dan **Build Command** kosong.
   - Buka bagian **Environment Variables** lalu tambahkan:
     - `SUPABASE_URL` = *(URL proyek Supabase kamu)*
     - `SUPABASE_ANON_KEY` = *(Anon public key Supabase kamu)*
     - `GOOGLE_SHEETS_WEBHOOK_URL` = *(Opsional: URL Web App Apps Script)*
   - Klik **Deploy**.
