# GearTrack / Bike Logbook Telemetry v3.1 — Vercel-Native Architecture

Arsitektur telah direfaktor mengikuti konvensi bawaan **Vercel (`public/` + `api/`)** sehingga seluruh rute halaman (`/`, `/login`, `/garage`, `/ledger`, `/log-activity`), aset statis (`/css/*`, `/js/*`), dan Serverless Functions (`/api/*`) terdeteksi secara otomatis tanpa risiko error `404: NOT_FOUND`.

## Struktur Direktori

```text
geartrack-bike-logbook/
├── api/                               # Vercel Serverless Functions (otomatis di-route ke /api/*)
│   ├── config.js                      # GET /api/config (Expose public env vars)
│   ├── backup/
│   │   └── sheets.js                  # POST /api/backup/sheets (Server-side snapshot exporter)
│   └── strava/
│       ├── _lib.js                    # Helper Supabase REST & Strava token refresh
│       ├── auth.js                    # GET /api/strava/auth (OAuth redirect)
│       ├── callback.js                # GET /api/strava/callback (OAuth token exchange)
│       └── sync.js                    # POST /api/strava/sync (Sync Strava activities)
│
├── public/                            # Static Root Vercel (otomatis disajikan dari /)
│   ├── index.html                     # Telemetry Dashboard (/)
│   ├── login.html                     # Sign In, Sign Up & Password Reset (/login)
│   ├── log-activity.html              # Input Ride & Maintenance (/log-activity)
│   ├── ledger.html                    # Unified History & Cost Ledger (/ledger)
│   ├── garage.html                    # Fleet Management & Archived Parts (/garage)
│   ├── css/
│   │   └── telemetry.css
│   └── js/
│       ├── config/
│       │   └── tailwind.config.js
│       ├── core/
│       │   ├── config.js
│       │   └── supabase-client.js
│       ├── services/
│       │   ├── auth-service.js
│       │   └── telemetry-service.js
│       ├── controllers/
│       │   ├── app-controller.js
│       │   ├── dashboard-controller.js
│       │   ├── log-activity-controller.js
│       │   ├── ledger-controller.js
│       │   ├── garage-controller.js
│       │   └── login-controller.js
│       └── ui/
│           └── ui-bindings.js
│
├── backend/
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
└── vercel.json                        # Clean URLs & rewrites
```

## Pengaturan Deployment di Vercel (Agar Tidak 404)

1. **Root Directory:** Pastikan di **Vercel Project Settings → General → Root Directory** dikosongkan (`.`) atau mengarah langsung ke folder yang berisi `vercel.json`, `public/`, dan `api/` (bukan parent folder di luar repo).
2. **Framework Preset:** Pilih **Other** (jangan pilih Next.js / Vite).
3. **Output Directory:** Biarkan default (`public` akan otomatis dikenali oleh Vercel).
4. **Environment Variables:** Tambahkan variabel berikut di **Project Settings → Environment Variables**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (opsional, untuk endpoint Strava & Backup)
   - `STRAVA_CLIENT_ID` & `STRAVA_CLIENT_SECRET` (opsional, untuk integrasi Strava)
   - `GOOGLE_SHEETS_WEBHOOK_URL` (opsional, untuk backup spreadsheet)
