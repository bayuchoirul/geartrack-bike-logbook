# GearTrack / Bike Logbook Telemetry v3.0 — Modular Monorepo

Arsitektur **Modular Monorepo** yang memisahkan lapisan **Frontend**, **Backend API**, **Google Apps Script Connector**, dan **Database Schema** agar mudah di-maintain, diuji, dan dikembangkan secara independen.

## Struktur Direktori Monorepo

```text
geartrack-monorepo/
├── frontend/                          # Lapisan UI & Client-Side State (Pure HTML + Modular JS)
│   ├── pages/                         # Markup HTML murni tanpa inline JavaScript
│   │   ├── index.html                 # Telemetry Dashboard
│   │   ├── login.html                 # Sign In, Sign Up & Password Reset
│   │   ├── log-activity.html          # Input Ride & Maintenance
│   │   ├── ledger.html                # Unified History & Cost Ledger
│   │   └── garage.html                # Fleet Management & Archived Parts
│   └── js/
│       ├── core/
│       │   ├── config.js              # Loader konfigurasi runtime (/api/config)
│       │   └── supabase-client.js     # Singleton Supabase client & formatter (IDR, KM)
│       ├── services/
│       │   ├── auth-service.js        # Autentikasi Supabase & Session Guard
│       │   └── telemetry-service.js   # CRUD Bikes, Components, Activities & Sheets Backup API
│       └── controllers/
│           ├── app-controller.js      # Global UI state, modals, navbar user & event bindings
│           ├── dashboard-controller.js
│           ├── log-activity-controller.js
│           ├── ledger-controller.js
│           ├── garage-controller.js
│           └── login-controller.js
│
├── backend/                           # Lapisan Serverless API & External Webhooks
│   ├── api/
│   │   ├── config.js                  # GET /api/config (Expose public env vars)
│   │   ├── backup/
│   │   │   └── sheets.js              # POST /api/backup/sheets (Server-side snapshot exporter)
│   │   └── strava/
│   │       ├── _lib.js                # Helper Supabase REST & Strava token refresh
│   │       ├── auth.js                # GET /api/strava/auth (OAuth redirect)
│   │       ├── callback.js            # GET /api/strava/callback (OAuth token exchange)
│   │       └── sync.js                # POST /api/strava/sync (Sync Strava activities)
│   └── google-apps-script/
│       └── Code.gs                    # Script siap tempel untuk Google Spreadsheet pribadi Anda
│
├── database/                          # Skema PostgreSQL & Migrasi Supabase
│   ├── schema.sql
│   └── migrations/
│       └── 001_auth_user_ownership.sql
│
├── supabase/functions/strava-sync/    # Edge Function alternatif
├── package.json
└── vercel.json                        # Routing otomatis / -> /frontend/pages/* & /api/* -> /backend/api/*
```

## Panduan Menghubungkan Backup ke Google Spreadsheet Anda

1. Buka [Google Sheets](https://sheets.new) dan buat spreadsheet baru (misalnya: `GearTrack Bike Logbook Backup`).
2. Klik menu **Extensions → Apps Script**.
3. Hapus seluruh kode bawaan di editor, lalu salin dan tempel seluruh isi file `backend/google-apps-script/Code.gs`.
4. Klik **Save**, lalu klik **Deploy → New deployment**:
   - **Select type:** `Web app`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
5. Klik **Deploy**, berikan izin akses akun Google Anda, lalu salin **Web app URL** (`https://script.google.com/macros/s/.../exec`).
6. Anda bisa memasang URL tersebut melalui **2 cara**:
   - **Langsung dari UI Aplikasi:** Klik tombol **Backup Sheets** atau ikon **Link/Settings** pada kartu *Cloud & Sheets Backup* di Dashboard (atau tombol **Setup Spreadsheet** di halaman *History & Ledger*), lalu tempel Web App URL Anda.
   - **Melalui Vercel Environment Variables:** Tambahkan variabel `GOOGLE_SHEETS_WEBHOOK_URL` berisi Web App URL tersebut agar otomatis tersedia di seluruh perangkat.
7. Setiap kali Anda menekan **Backup Sheets**, backend (`/api/backup/sheets`) akan mengambil seluruh data terbaru dari Supabase dan menulis ulang 5 tab rapi di spreadsheet Anda: `Summary`, `Bikes`, `Components`, `Activities`, dan `Maintenance_Logs`.
