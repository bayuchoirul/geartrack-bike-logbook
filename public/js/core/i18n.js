// public/js/core/i18n.js

/**
 * @typedef {'id' | 'en'} SupportedLang
 * @typedef {keyof typeof DICT['id']} TranslationKey
 */

const STORAGE_KEY = 'geartrack_lang';
/** @type {SupportedLang} */
const DEFAULT_LANG = 'id';

export const DICT = {
  id: {
    'nav.dashboard': 'Dasbor',
    'nav.log': 'Catat',
    'nav.garage': 'Garasi',
    'nav.ledger': 'Biaya',
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.edit': 'Ubah',
    'common.delete': 'Hapus',
    'common.sync_strava': 'Sinkron Strava',
    'common.logout': 'Keluar',
    'common.loading': 'Memproses...',
    'common.empty': 'Belum ada data tercatat.',
    'common.select_bike': 'Pilih Sepeda',
    'common.category': 'Kategori',
    'common.date': 'Tanggal',
    'common.notes': 'Catatan (Opsional)',
    'common.error_generic': 'Terjadi kesalahan. Silakan coba lagi.',
    'common.saved_success': 'Data berhasil disimpan.',
    'common.deleted_success': 'Data berhasil dihapus.',
    'common.confirm_delete': 'Hapus data ini secara permanen?',

    'status.good': 'Prima',
    'status.warning': 'Perlu Cek',
    'status.critical': 'Kritis',
    'status.overdue': 'Wajib Ganti',

    'login.title': 'Masuk ke GearTrack',
    'login.subtitle': 'Kelola telemetri jarak tempuh dan keausan komponen sepeda.',
    'login.tab_signin': 'Masuk',
    'login.tab_signup': 'Daftar',
    'login.tab_reset': 'Reset Sandi',
    'login.email': 'Alamat Email',
    'login.password': 'Kata Sandi',
    'login.submit_signin': 'Masuk Sekarang',
    'login.submit_signup': 'Buat Akun',
    'login.submit_reset': 'Kirim Tautan Reset',
    'login.signup_success': 'Pendaftaran berhasil. Periksa email verifikasi Anda.',
    'login.reset_success': 'Tautan reset kata sandi telah dikirim ke email Anda.',

    'dashboard.title': 'Ringkasan Telemetri',
    'dashboard.subtitle': 'Pantau jarak tempuh, keausan komponen, dan aktivitas terbaru.',
    'dashboard.all_bikes': 'Semua Armada',
    'dashboard.quick_log': '+ Catat Aktivitas',
    'dashboard.kpi_distance': 'Total Jarak',
    'dashboard.kpi_rides': 'Total Aktivitas',
    'dashboard.kpi_attention': 'Perlu Perhatian',
    'dashboard.kpi_cost_km': 'Biaya / km',
    'dashboard.section_wear': 'Prioritas Perawatan Komponen',
    'dashboard.view_garage': 'Buka Garasi →',
    'dashboard.section_recent': 'Aktivitas Terbaru',
    'dashboard.view_ledger': 'Lihat Semua →',
    'dashboard.sync_success': 'Sinkronisasi Strava selesai ({count} aktivitas baru).',

    'log.title': 'Catat Aktivitas & Servis',
    'log.subtitle': 'Tambahkan sesi bersepeda manual atau catatan perawatan baru.',
    'log.tab_ride': 'Aktivitas Bersepeda',
    'log.tab_maintenance': 'Perawatan & Suku Cadang',
    'log.ride_title': 'Nama Rute / Aktivitas',
    'log.ride_title_ph': 'Contoh: Morning Loop Puncak',
    'log.distance_km': 'Jarak Tempuh (km)',
    'log.duration_min': 'Durasi (Menit)',
    'log.elevation_m': 'Elevasi (m)',
    'log.submit_ride': 'Simpan Aktivitas',
    'log.maint_title': 'Nama Item / Servis',
    'log.maint_title_ph': 'Contoh: Ganti Rantai Shimano 105',
    'log.cost_idr': 'Biaya (IDR)',
    'log.odometer_at_service': 'Odometer Saat Servis (km)',
    'log.submit_maint': 'Simpan Catatan Biaya',

    'garage.title': 'Garasi & Komponen',
    'garage.subtitle': 'Pantau odometer armada dan batas keausan komponen.',
    'garage.add_bike': '+ Tambah Sepeda',
    'garage.add_component': '+ Pasang Komponen',
    'garage.fleet_heading': 'Armada Sepeda',
    'garage.components_heading': 'Status Keausan Komponen',
    'garage.odometer': 'Total Odometer',
    'garage.active': 'Aktif',
    'garage.archived': 'Arsip',
    'garage.used': 'Terpakai {km} km',
    'garage.remaining': 'Sisa {km} km',
    'garage.modal_bike_title': 'Data Sepeda',
    'garage.modal_comp_title': 'Data Komponen',
    'garage.field_bike_name': 'Nama Sepeda',
    'garage.field_brand': 'Merek & Model',
    'garage.field_odometer': 'Total Odometer (km)',
    'garage.field_archive': 'Arsipkan sepeda ini',
    'garage.field_comp_name': 'Nama Komponen',
    'garage.field_installed_km': 'Odometer Saat Pasang (km)',
    'garage.field_lifespan_km': 'Target Umur Pakai (km)',

    'ledger.title': 'Buku Biaya & Riwayat',
    'ledger.subtitle': 'Catatan perawatan, suku cadang, dan rasio cost-per-km.',
    'ledger.add_entry': '+ Catat Biaya',
    'ledger.total_cost': 'Total Biaya Perawatan',
    'ledger.cost_per_km': 'Biaya per Kilometer',
    'ledger.entries': 'Total Transaksi',
    'ledger.avg_cost': 'Rata-rata / Transaksi',
    'ledger.filter_all_bikes': 'Semua Sepeda',
    'ledger.filter_all_categories': 'Semua Kategori',
    'ledger.filter_search': 'Cari keterangan transaksi...',
    'ledger.col_date': 'Tanggal',
    'ledger.col_item': 'Keterangan',
    'ledger.col_category': 'Kategori',
    'ledger.col_distance': 'Jarak',
    'ledger.col_cost': 'Biaya',
    'ledger.col_actions': 'Aksi',
    'ledger.modal_entry_title': 'Data Biaya Perawatan',
    'ledger.field_title': 'Keterangan Item / Servis',
    'ledger.field_cost': 'Biaya (IDR)',
    'ledger.field_distance': 'Odometer Saat Servis (Opsional)',
  },

  en: {
    'nav.dashboard': 'Dashboard',
    'nav.log': 'Log',
    'nav.garage': 'Garage',
    'nav.ledger': 'Ledger',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.sync_strava': 'Sync Strava',
    'common.logout': 'Sign Out',
    'common.loading': 'Processing...',
    'common.empty': 'No records found.',
    'common.select_bike': 'Select Bike',
    'common.category': 'Category',
    'common.date': 'Date',
    'common.notes': 'Notes (Optional)',
    'common.error_generic': 'Something went wrong. Please try again.',
    'common.saved_success': 'Saved successfully.',
    'common.deleted_success': 'Deleted successfully.',
    'common.confirm_delete': 'Delete this record permanently?',

    'status.good': 'Good',
    'status.warning': 'Check Soon',
    'status.critical': 'Critical',
    'status.overdue': 'Overdue',

    'login.title': 'Sign in to GearTrack',
    'login.subtitle': 'Track cycling mileage and component wear thresholds.',
    'login.tab_signin': 'Sign In',
    'login.tab_signup': 'Sign Up',
    'login.tab_reset': 'Reset Password',
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.submit_signin': 'Sign In',
    'login.submit_signup': 'Create Account',
    'login.submit_reset': 'Send Reset Link',
    'login.signup_success': 'Account created. Please check your verification email.',
    'login.reset_success': 'Password reset link has been sent to your email.',

    'dashboard.title': 'Telemetry Overview',
    'dashboard.subtitle': 'Monitor mileage, component wear, and recent rides.',
    'dashboard.all_bikes': 'All Fleet',
    'dashboard.quick_log': '+ Log Activity',
    'dashboard.kpi_distance': 'Total Distance',
    'dashboard.kpi_rides': 'Total Rides',
    'dashboard.kpi_attention': 'Need Attention',
    'dashboard.kpi_cost_km': 'Cost / km',
    'dashboard.section_wear': 'Component Maintenance Priority',
    'dashboard.view_garage': 'Open Garage →',
    'dashboard.section_recent': 'Recent Activities',
    'dashboard.view_ledger': 'View All →',
    'dashboard.sync_success': 'Strava sync complete ({count} new activities).',

    'log.title': 'Log Activity & Maintenance',
    'log.subtitle': 'Record a manual ride or log a maintenance expense.',
    'log.tab_ride': 'Cycling Activity',
    'log.tab_maintenance': 'Maintenance & Parts',
    'log.ride_title': 'Route / Activity Title',
    'log.ride_title_ph': 'e.g. Morning Endurance Loop',
    'log.distance_km': 'Distance (km)',
    'log.duration_min': 'Duration (Minutes)',
    'log.elevation_m': 'Elevation Gain (m)',
    'log.submit_ride': 'Save Activity',
    'log.maint_title': 'Item / Service Description',
    'log.maint_title_ph': 'e.g. Replace Shimano 105 Chain',
    'log.cost_idr': 'Cost (IDR)',
    'log.odometer_at_service': 'Odometer at Service (km)',
    'log.submit_maint': 'Save Expense',

    'garage.title': 'Garage & Components',
    'garage.subtitle': 'Track fleet mileage and component wear thresholds.',
    'garage.add_bike': '+ Add Bike',
    'garage.add_component': '+ Add Component',
    'garage.fleet_heading': 'Bike Fleet',
    'garage.components_heading': 'Component Wear Status',
    'garage.odometer': 'Total Odometer',
    'garage.active': 'Active',
    'garage.archived': 'Archived',
    'garage.used': '{km} km used',
    'garage.remaining': '{km} km left',
    'garage.modal_bike_title': 'Bike Details',
    'garage.modal_comp_title': 'Component Details',
    'garage.field_bike_name': 'Bike Name',
    'garage.field_brand': 'Brand & Model',
    'garage.field_odometer': 'Total Odometer (km)',
    'garage.field_archive': 'Archive this bike',
    'garage.field_comp_name': 'Component Name',
    'garage.field_installed_km': 'Installed at Odometer (km)',
    'garage.field_lifespan_km': 'Target Lifespan (km)',

    'ledger.title': 'Cost & Service Ledger',
    'ledger.subtitle': 'Maintenance history, parts spending, and cost-per-km.',
    'ledger.add_entry': '+ Log Expense',
    'ledger.total_cost': 'Total Maintenance Cost',
    'ledger.cost_per_km': 'Cost per Kilometer',
    'ledger.entries': 'Total Entries',
    'ledger.avg_cost': 'Avg / Entry',
    'ledger.filter_all_bikes': 'All Bikes',
    'ledger.filter_all_categories': 'All Categories',
    'ledger.filter_search': 'Search entry description...',
    'ledger.col_date': 'Date',
    'ledger.col_item': 'Description',
    'ledger.col_category': 'Category',
    'ledger.col_distance': 'Distance',
    'ledger.col_cost': 'Cost',
    'ledger.col_actions': 'Actions',
    'ledger.modal_entry_title': 'Maintenance Expense',
    'ledger.field_title': 'Item / Service Description',
    'ledger.field_cost': 'Cost (IDR)',
    'ledger.field_distance': 'Odometer at Service (Optional)',
  },
};

/** @returns {SupportedLang} */
export function getLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' || saved === 'id' ? saved : DEFAULT_LANG;
}

/** @param {SupportedLang} lang */
export function setLang(lang) {
  if (lang !== 'id' && lang !== 'en') return;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  applyTranslations();
  window.dispatchEvent(new CustomEvent('geartrack:langchange', { detail: { lang } }));
}

/**
 * @param {TranslationKey | (string & {})} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const lang = getLang();
  const activeDict = /** @type {Record<string, string>} */ (DICT[lang]);
  const fallbackDict = /** @type {Record<string, string>} */ (DICT[DEFAULT_LANG]);

  let text = activeDict?.[key] ?? fallbackDict?.[key] ?? String(key);
  for (const [k, v] of Object.entries(params)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

/** @param {ParentNode} [root] */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
}

/**
 * @param {number | null | undefined} value
 * @param {number} [decimals]
 * @returns {string}
 */
export function formatNumber(value, decimals = 0) {
  const locale = getLang() === 'id' ? 'id-ID' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);
}

/**
 * @param {number | null | undefined} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const locale = getLang() === 'id' ? 'id-ID' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}
