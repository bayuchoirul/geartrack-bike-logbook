# GearTrack / Bike Logbook Telemetry v2.7 (Auth + Strava + Vercel Edition)

Paket lengkap aplikasi **Bike Logbook** dengan autentikasi **Supabase Auth (Sign In, Sign Up, Password Reset)**, manajemen sepeda & keausan komponen, serta sinkronisasi otomatis **Strava OAuth 2.0**.

## Fitur Utama v2.7
- **Authentication Gate (`/login`)**: Halaman Sign In, Sign Up (dengan meteran kekuatan password & toggle visibilitas), Forgot Password, dan Session Guard otomatis di seluruh halaman.
- **Fleet Management (`/garage`)**: Tambah sepeda baru, atur *Active Default*, dan hapus sepeda terdaftar (*Fleet Decommissioning*).
- **Component Wear Telemetry (`/`)**: Pelacakan persentase keausan komponen otomatis dari aktivitas Strava maupun input manual.
- **Strava OAuth 2.0 Sync (`/api/strava/*`)**: Sinkronisasi jarak bersepeda otomatis ke odometer sepeda aktif.

## Setup Supabase Auth
1. Buka **Supabase Dashboard** → **Authentication** → **Providers** → pastikan **Email** aktif.
2. Buka **Authentication** → **URL Configuration**:
   - **Site URL**: `https://geartrack-bike-logbook.vercel.app`
   - **Redirect URLs**: tambahkan `https://geartrack-bike-logbook.vercel.app/**`
3. Jika sudah pernah menjalankan `schema.sql` versi lama, jalankan `migration_auth_v2.7.sql` di **SQL Editor** Supabase.
