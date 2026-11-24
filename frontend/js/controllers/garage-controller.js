// frontend/js/controllers/garage-controller.js
import { TelemetryService, formatIDR, formatKm } from '../services/telemetry-service.js';

window.addEventListener('telemetry:updated', (e) => {
  const { bikes, archivedComps } = e.detail.AppState;
  const bikesGrid = document.getElementById('live-bikes-grid');
  if (!bikesGrid) return;

  if (!bikes.length) {
    bikesGrid.innerHTML = `
      <div class="col-span-full bg-surface-container-low p-8 rounded-xl text-center space-y-3">
        <p class="font-telemetry-data text-on-surface-variant">Belum ada sepeda terdaftar di garasi.</p>
        <button onclick="window.GearTrackUI.openAddBikeModal()" class="px-4 py-2 rounded-xl bg-primary-container text-on-primary font-label-caps uppercase font-bold" type="button">+ Register Bike</button>
      </div>
    `;
  } else {
    bikesGrid.innerHTML = bikes.map(b => `
      <div class="bg-surface-container-low p-6 rounded-xl space-y-3 shadow-md">
        <div class="flex justify-between items-start gap-2">
          <div>
            <h3 class="font-headline-md text-headline-md text-primary font-bold">${b.name}</h3>
            <p class="text-on-surface-variant text-body-sm">${b.subtitle || ''}</p>
          </div>
          <span class="px-2.5 py-1 rounded font-label-caps text-label-caps uppercase whitespace-nowrap ${b.is_default ? 'bg-tertiary-container/20 text-tertiary-fixed' : 'bg-surface-container text-on-surface-variant'}">
            ${b.is_default ? 'Active Default' : b.status}
          </span>
        </div>
        <div class="font-telemetry-data text-body-sm text-on-surface-variant">
          ${b.groupset_spec || ''} • ${b.drivetrain_ratio || ''} • ${b.wheel_tire_spec || ''}
        </div>
        <div class="flex items-center justify-between gap-2 pt-2">
          <div class="font-telemetry-metric-md text-primary-container font-bold">${formatKm(b.odometer_km)} km</div>
          <div class="flex items-center gap-2">
            ${!b.is_default ? `<button data-set-default="${b.id}" class="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary font-label-caps text-label-caps uppercase transition-all" type="button">Set Active</button>` : ''}
            <button data-delete-bike="${b.id}" class="px-3 py-1.5 rounded bg-error-container/30 hover:bg-error text-error hover:text-on-error font-label-caps text-label-caps uppercase transition-all flex items-center gap-1" type="button" title="Delete Registered Bike">
              <span class="material-symbols-outlined text-[15px]">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  document.querySelectorAll('[data-set-default]').forEach(btn => {
    btn.onclick = async () => {
      await TelemetryService.setDefaultBike(btn.dataset.setDefault);
      window.GearTrackUI.showToast('Active bicycle switched!');
      await window.GearTrackUI.refreshAllData();
    };
  });

  document.querySelectorAll('[data-delete-bike]').forEach(btn => {
    btn.onclick = () => {
      const targetBike = bikes.find(item => item.id === btn.dataset.deleteBike);
      if (targetBike) {
        window.GearTrackUI.openDeleteBikeModal(targetBike);
      }
    };
  });

  const archEl = document.getElementById('live-archived-list');
  if (!archEl) return;

  if (!archivedComps.length) {
    archEl.innerHTML = '<div class="p-6 bg-surface-container-low rounded-xl text-on-surface-variant font-telemetry-data">Belum ada komponen yang diarsipkan.</div>';
  } else {
    archEl.innerHTML = archivedComps.map(c => `
      <div class="bg-surface-container-low p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-headline-sm text-primary font-bold">${c.name}</span>
            <span class="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps uppercase">${c.retirement_badge || 'Archived'}</span>
          </div>
          <p class="text-body-sm text-on-surface-variant mt-1">Retired on <strong>${c.retired_date || '-'}</strong> • ${c.retirement_reason || ''}</p>
        </div>
        <div class="font-telemetry-data text-right">
          <div class="text-primary font-bold">${formatKm(c.logged_km)} km / ${Number(c.max_lifespan_km).toLocaleString()} km (${c.effective_wear_pct}%)</div>
          <div class="text-on-surface-variant text-body-sm">Cost: ${formatIDR(c.purchase_cost_idr)}</div>
        </div>
      </div>
    `).join('');
  }
});
