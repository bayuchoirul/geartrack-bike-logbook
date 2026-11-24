// frontend/js/controllers/dashboard-controller.js
import { formatIDR, formatKm } from '../core/supabase-client.js';

window.addEventListener('telemetry:updated', (e) => {
  const { AppState, metrics } = e.detail;
  const bike = AppState.selectedBike;
  if (!bike) return;

  document.getElementById('dash-bike-title').textContent = bike.name;
  document.getElementById('dash-bike-subtitle').textContent = bike.subtitle || 'Active Rig';
  document.getElementById('dash-bike-specs').textContent = `${bike.drivetrain_ratio || ''} • ${bike.wheel_tire_spec || ''}`;
  document.getElementById('kpi-total-odo').textContent = formatKm(bike.odometer_km);
  document.getElementById('kpi-rides-count').textContent = `${metrics.totalRidesCount} completed rides (+${formatKm(metrics.monthKm)} km this month)`;
  document.getElementById('kpi-ytd-spend').textContent = formatIDR(metrics.totalSpendIdr);
  document.getElementById('kpi-cost-per-100').textContent = `Cost per 100km: ${formatIDR(metrics.costPer100Km)}`;
  document.getElementById('kpi-attention-count').textContent = `${metrics.attentionComps.length} Items`;
  document.getElementById('kpi-attention-list').innerHTML = metrics.attentionComps.length
    ? metrics.attentionComps.map(c => `<div>• ${c.name} (${c.effective_wear_pct}%)</div>`).join('')
    : '<span class="text-tertiary-fixed">Semua komponen dalam kondisi optimal (&lt;65%)</span>';

  const lastSyncEl = document.getElementById('sheets-last-sync-text');
  if (lastSyncEl) {
    lastSyncEl.textContent = AppState.settings?.last_sheets_sync
      ? `Last sync: ${new Date(AppState.settings.last_sheets_sync).toLocaleString('id-ID')}`
      : 'Belum dikonfigurasi / belum sync';
  }
});
