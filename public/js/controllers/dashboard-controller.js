// frontend/js/controllers/dashboard-controller.js
import { formatIDR, formatKm } from '../core/supabase-client.js';

window.addEventListener('telemetry:updated', (e) => {
  const { AppState, metrics } = e.detail || {};
  const emptyStateEl = document.getElementById('dashboard-empty-state');
  const contentEl = document.getElementById('dashboard-content');

  const bikes = AppState?.bikes || [];
  const bike = AppState?.selectedBike || bikes[0];

  // Jika tidak ada sepeda di Supabase / Registered Bicycles, sembunyikan seluruh konten Dashboard
  if (!bike || bikes.length === 0) {
    emptyStateEl?.classList.remove('hidden');
    contentEl?.classList.add('hidden');
    return;
  }

  // Tampilkan konten Dashboard jika sepeda aktif tersedia
  emptyStateEl?.classList.add('hidden');
  contentEl?.classList.remove('hidden');

  const specs = [bike.drivetrain_ratio, bike.wheel_tire_spec].filter(Boolean).join(' • ');

  document.getElementById('dash-bike-title').textContent = bike.name;
  document.getElementById('dash-bike-subtitle').textContent = bike.subtitle || `${bike.name} • Active Rig`;
  document.getElementById('dash-bike-specs').textContent = specs;
  document.getElementById('kpi-total-odo').textContent = formatKm(bike.odometer_km);
  document.getElementById('kpi-rides-count').textContent = `${metrics.totalRidesCount} completed rides (+${formatKm(metrics.monthKm)} km this month)`;
  document.getElementById('kpi-ytd-spend').textContent = formatIDR(metrics.totalSpendIdr);
  document.getElementById('kpi-cost-per-100').textContent = `Cost per 100km: ${formatIDR(metrics.costPer100Km)}`;

  // 1. Ambil item dari komponen aktif terpasang yang butuh perhatian
  const attentionItems = (metrics.attentionComps || []).map(c => ({
    name: c.name,
    pct: Number(c.effective_wear_pct) || 0,
    isOverdue: (Number(c.effective_wear_pct) || 0) >= 100
  }));

  // 2. Cek Component Calibration Rules yang sudah OVERDUE (>= 100% dari odometer sepeda)
  const bikeOdo = Number(bike.odometer_km) || 0;
  const rules = AppState?.rules || [];

  rules.forEach(rule => {
    const maxKm = Number(rule.default_max_km) || 0;
    if (maxKm <= 0) return;

    const ratioPct = Math.round((bikeOdo / maxKm) * 100);
    if (ratioPct >= 100) {
      // Hindari duplikasi jika nama komponen/kategori sudah ada di daftar komponen terpasang
      const alreadyTracked = attentionItems.some(
        item => item.name.toLowerCase().includes(rule.category_name.toLowerCase())
      );
      if (!alreadyTracked) {
        attentionItems.push({
          name: rule.category_name,
          pct: ratioPct,
          isOverdue: true
        });
      }
    }
  });

  // Urutkan dari persentase wear tertinggi
  attentionItems.sort((a, b) => b.pct - a.pct);

  document.getElementById('kpi-attention-count').textContent = `${attentionItems.length} Items`;
  document.getElementById('kpi-attention-list').innerHTML = attentionItems.length
    ? attentionItems.map(item => `
        <div class="flex items-center justify-between gap-2">
          <span class="truncate">• ${item.name}</span>
          <span class="${item.isOverdue ? 'text-error font-semibold' : 'text-secondary'} whitespace-nowrap">
            ${item.pct}%${item.isOverdue ? ' (Overdue)' : ''}
          </span>
        </div>
      `).join('')
    : '<span class="text-tertiary-fixed">Semua komponen dalam kondisi optimal (&lt;65%)</span>';

  const lastSyncEl = document.getElementById('sheets-last-sync-text');
  if (lastSyncEl) {
    lastSyncEl.textContent = AppState.settings?.last_sheets_sync
      ? `Last sync: ${new Date(AppState.settings.last_sheets_sync).toLocaleString('id-ID')}`
      : 'Belum dikonfigurasi / belum sync';
  }
});