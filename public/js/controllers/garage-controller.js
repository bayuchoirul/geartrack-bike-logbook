// frontend/js/controllers/garage-controller.js
import { getSupabase } from '../core/supabase-client.js';
import { TelemetryService, formatIDR, formatKm } from '../services/telemetry-service.js';

let cachedComponentRules = [];

// Pasang event listener untuk tombol + Register Bike dan + Register Part
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-action="open-add-bike"]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.GearTrackUI?.openAddBikeModal();
    });
  });

  document.querySelectorAll('[data-action="open-add-component"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ui = window.GearTrackUI;
      if (!ui?.AppState?.selectedBike) {
        ui?.showToast('Daftarkan sepeda terlebih dahulu sebelum menambahkan part!', 'error');
        ui?.openAddBikeModal();
        return;
      }
      ui.openAddComponentModal();
    });
  });
});

async function loadComponentRules(stateRules) {
  if (Array.isArray(stateRules) && stateRules.length > 0) {
    cachedComponentRules = stateRules;
    window.GearTrackRules = cachedComponentRules;
    return cachedComponentRules;
  }

  try {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase
      .from('component_rules')
      .select('*')
      .order('category_name', { ascending: true });

    if (!error && Array.isArray(data)) {
      cachedComponentRules = data;
      window.GearTrackRules = cachedComponentRules;
    }
  } catch (err) {
    console.warn('Gagal memuat component_rules:', err.message);
  }

  return cachedComponentRules;
}

function renderComponentRules(rules, activeBike) {
  const rulesGrid = document.getElementById('live-rules-grid');
  if (!rulesGrid) return;

  if (!rules.length) {
    rulesGrid.innerHTML = `
      <div class="col-span-full p-6 bg-surface-container-low rounded-xl text-on-surface-variant font-telemetry-data">
        Belum ada aturan komponen tersimpan di database.
      </div>
    `;
    return;
  }

  const hasBike = Boolean(activeBike);
  const bikeOdo = Number(activeBike?.odometer_km) || 0;

  rulesGrid.innerHTML = rules.map(r => {
    const maxKm = Number(r.default_max_km) || 1;
    const warnPct = Number(r.warn_threshold_pct) || 75;
    const critPct = Number(r.crit_threshold_pct) || 90;

    // Hitung rasio odometer sepeda aktif terhadap batas umur pakai komponen
    const rawRatioPct = hasBike ? Math.round((bikeOdo / maxKm) * 100) : 0;
    const barWidthPct = Math.min(rawRatioPct, 100);
    const remainingKm = maxKm - bikeOdo;

    let statusLabel = 'OPTIMAL';
    let statusBadgeClass = 'bg-tertiary-container/20 text-tertiary-fixed border-tertiary-container/40';
    let pctColorClass = 'text-tertiary-fixed';
    let barColorClass = 'bg-tertiary-container';
    let cardBorderClass = 'border-outline-variant/20';

    if (hasBike) {
      if (rawRatioPct >= 100) {
        statusLabel = 'OVERDUE';
        statusBadgeClass = 'bg-error/20 text-error border-error/40';
        pctColorClass = 'text-error';
        barColorClass = 'bg-error';
        cardBorderClass = 'border-error/40';
      } else if (rawRatioPct >= critPct) {
        statusLabel = 'CRITICAL';
        statusBadgeClass = 'bg-error/20 text-error border-error/40';
        pctColorClass = 'text-error';
        barColorClass = 'bg-error';
        cardBorderClass = 'border-error/40';
      } else if (rawRatioPct >= warnPct) {
        statusLabel = 'WARNING';
        statusBadgeClass = 'bg-secondary/20 text-secondary border-secondary/40';
        pctColorClass = 'text-secondary';
        barColorClass = 'bg-secondary';
        cardBorderClass = 'border-secondary/40';
      }
    }

    const comparisonBlockHtml = hasBike ? `
      <div class="mt-2 pt-2.5 border-t border-outline-variant/20 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-on-surface-variant text-[11px] uppercase font-label-caps">
            vs ${activeBike.name} ODO
          </span>
          <span class="px-2 py-0.5 rounded border font-label-caps text-[10px] font-bold uppercase ${statusBadgeClass}">
            ${statusLabel} • ${rawRatioPct}%
          </span>
        </div>
        <div class="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
          <div class="h-full ${barColorClass} rounded-full transition-all duration-500" style="width: ${barWidthPct}%;"></div>
        </div>
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-on-surface-variant">${formatKm(bikeOdo)} / ${maxKm.toLocaleString()} km</span>
          <span class="${pctColorClass} font-semibold">
            ${remainingKm >= 0
              ? `Sisa ${formatKm(remainingKm)} km`
              : `Lewat +${formatKm(Math.abs(remainingKm))} km`}
          </span>
        </div>
      </div>
    ` : '';

    return `
      <div class="bg-surface-container-low border ${cardBorderClass} p-5 rounded-xl flex flex-col justify-between gap-3">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-headline-sm text-primary font-bold">${r.category_name}</h3>
            <span class="px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 font-label-caps text-label-caps uppercase whitespace-nowrap">
              ${r.badge_label}
            </span>
          </div>
          <p class="text-body-sm text-on-surface-variant leading-relaxed">${r.description || '-'}</p>
        </div>

        <div class="space-y-2 pt-2 border-t border-outline-variant/15 font-telemetry-data text-body-sm">
          <div class="flex items-center justify-between">
            <span class="text-on-surface-variant">Max Lifespan</span>
            <span class="text-primary font-bold">${maxKm.toLocaleString()} km / ${r.default_max_months} bln</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-on-surface-variant">Alert Thresholds</span>
            <span>
              <span class="text-secondary font-semibold">Warn ${warnPct}%</span>
              <span class="text-outline mx-1">•</span>
              <span class="text-error font-semibold">Crit ${critPct}%</span>
            </span>
          </div>
          ${comparisonBlockHtml}
          ${r.calibration_note ? `<div class="text-[11px] text-tertiary-fixed pt-1">${r.calibration_note}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.addEventListener('telemetry:updated', async (e) => {
  const { bikes, selectedBike, archivedComps, rules: stateRules } = e.detail.AppState;
  const bikesGrid = document.getElementById('live-bikes-grid');
  if (!bikesGrid) return;

  // Prioritaskan sepeda dengan flag is_default = true sebagai sepeda aktif
  const activeBike = bikes.find(b => b.is_default) || selectedBike || bikes[0] || null;
  if (window.GearTrackUI?.AppState && activeBike) {
    window.GearTrackUI.AppState.selectedBike = activeBike;
  }

  if (!bikes.length) {
    bikesGrid.innerHTML = `
      <div class="col-span-full bg-surface-container-low p-8 rounded-xl text-center">
        <p class="font-telemetry-data text-on-surface-variant">Belum ada sepeda terdaftar di garasi.</p>
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
            <button data-edit-bike="${b.id}" class="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-caps text-label-caps uppercase transition-all flex items-center gap-1" type="button" title="Edit Registered Bike">
              <span class="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit</span>
            </button>
            <button data-delete-bike="${b.id}" class="px-3 py-1.5 rounded bg-error-container/30 hover:bg-error text-error hover:text-on-error font-label-caps text-label-caps uppercase transition-all flex items-center gap-1" type="button" title="Delete Registered Bike">
              <span class="material-symbols-outlined text-[15px]">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  const rules = await loadComponentRules(stateRules);
  renderComponentRules(rules, activeBike);

  document.querySelectorAll('[data-set-default]').forEach(btn => {
    btn.onclick = async () => {
      const targetBikeId = btn.dataset.setDefault;
      const targetBike = bikes.find(item => item.id === targetBikeId);

      btn.disabled = true;
      btn.textContent = 'Switching...';

      try {
        // 1. Update UI & Component Calibration Rules seketika tanpa menunggu reload
        if (targetBike && window.GearTrackUI?.AppState) {
          window.GearTrackUI.AppState.selectedBike = targetBike;
          renderComponentRules(rules, targetBike);
        }

        // 2. Simpan perubahan active default ke Supabase & sinkronkan seluruh state
        await TelemetryService.setDefaultBike(targetBikeId);
        window.GearTrackUI.showToast(`Active bicycle switched to ${targetBike?.name || 'selected bike'}!`);
        await window.GearTrackUI.refreshAllData();
      } catch (err) {
        window.GearTrackUI.showToast(err.message || 'Gagal mengganti sepeda aktif', 'error');
        btn.disabled = false;
        btn.textContent = 'Set Active';
      }
    };
  });

  document.querySelectorAll('[data-edit-bike]').forEach(btn => {
    btn.onclick = () => {
      const targetBike = bikes.find(item => item.id === btn.dataset.editBike);
      if (targetBike) {
        window.GearTrackUI.openEditBikeModal(targetBike);
      }
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