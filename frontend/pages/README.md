# Bike Logbook Telemetry v3.0 — Separated Structure

Struktur file telah dipisahkan agar HTML, konfigurasi/gaya (`CSS` & Tailwind config), dan logika JavaScript berada di file dan folder terpisah:

```text
├── index.html
├── garage.html
├── ledger.html
├── log-activity.html
├── login.html
├── css/
│   └── telemetry.css
└── js/
    ├── config/
    │   └── tailwind.config.js
    ├── ui/
    │   └── ui-bindings.js
    └── controllers/
        ├── app-controller.js
        ├── dashboard-controller.js
        ├── garage-controller.js
        ├── ledger-controller.js
        ├── log-activity-controller.js
        └── login-controller.js
```

> Catatan: Controller (`./js/controllers/*.js`) diimpor melalui `<script type="module">` sesuai file aslinya. Pastikan Anda menjalankan aplikasi melalui web server lokal atau hosting (seperti Vite, Live Server, atau Vercel) agar ES module berjalan tanpa batasan `file://`.
