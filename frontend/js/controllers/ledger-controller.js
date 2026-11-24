// frontend/js/controllers/ledger-controller.js
import { formatIDR, formatKm } from '../core/supabase-client.js';

window.addEventListener('telemetry:updated', (e) => {
  const { ledger } = e.detail.AppState;
  const tbody = document.getElementById('live-ledger-tbody');
  if (!tbody) return;

  if (!ledger.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-on-surface-variant">Belum ada catatan aktivitas atau servis.</td></tr>';
    return;
  }

  tbody.innerHTML = ledger.map(item => {
    const isRide = item.type === 'RIDE';
    const badgeClass = isRide
      ? 'bg-secondary/15 text-secondary'
      : item.type === 'REPLACEMENT'
        ? 'bg-error/20 text-error'
        : 'bg-tertiary-container/20 text-tertiary-fixed';

    return `
      <tr class="hover:bg-surface-container transition-colors">
        <td class="p-4 font-telemetry-data text-primary whitespace-nowrap">${new Date(item.timestamp).toLocaleDateString('id-ID')}</td>
        <td class="p-4"><span class="px-2 py-0.5 rounded font-label-caps text-label-caps uppercase ${badgeClass}">${item.type}</span></td>
        <td class="p-4">
          <div class="font-semibold text-primary">${item.title}</div>
          <div class="font-telemetry-data text-[11px] text-on-surface-variant">${item.subtitle}</div>
        </td>
        <td class="p-4 text-right font-telemetry-data ${isRide ? 'text-secondary font-bold' : 'text-on-surface-variant'}">
          ${isRide ? `+${formatKm(item.deltaKm)} km` : `@ ${formatKm(item.odometerAt)} km`}
        </td>
        <td class="p-4 text-right font-telemetry-data text-primary font-semibold">
          ${item.costIdr > 0 ? formatIDR(item.costIdr) : '—'}
        </td>
        <td class="p-4 text-on-surface-variant max-w-xs truncate">${item.notes}</td>
      </tr>
    `;
  }).join('');
});
