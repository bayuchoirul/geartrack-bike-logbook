# Bike Logbook Telemetry v3.0 — Unified JS Tree Structure

Struktur JavaScript telah disatukan menjadi satu tree di bawah `frontend/js/`, sedangkan halaman HTML dan stylesheet berada di `frontend/pages/`:

```text
frontend/
├── js/
│   ├── config/
│   │   └── tailwind.config.js
│   ├── controllers/
│   │   ├── app-controller.js
│   │   ├── dashboard-controller.js
│   │   ├── garage-controller.js
│   │   ├── ledger-controller.js
│   │   ├── log-activity-controller.js
│   │   └── login-controller.js
│   ├── core/
│   │   ├── config.js
│   │   └── supabase-client.js
│   ├── services/
│   │   ├── auth-service.js
│   │   └── telemetry-service.js
│   └── ui/
│       └── ui-bindings.js
└── pages/
    ├── css/
    │   └── telemetry.css
    ├── garage.html
    ├── index.html
    ├── ledger.html
    ├── log-activity.html
    ├── login.html
    └── README.md
```

> Catatan: Seluruh path script pada HTML (`/js/config/tailwind.config.js` dan `/js/controllers/*.js`) sudah sesuai dengan rewrite Vercel (`/js/(.*)` -> `/frontend/js/$1`). Jalankan melalui web server atau Vercel agar ES module berjalan normal.
