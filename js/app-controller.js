// js/app-controller.js
import { TelemetryService, formatIDR, formatKm } from './supabase-service.js';

export const AppState = {
  bikes: [],
  selectedBike: null,
  activeComps: [],
  archivedComps: [],
  rules: [],
  ledger: [],
  settings: null
};

export function showToast(message, type = 'success') {
  let toast = document.getElementById('global-telemetry-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-telemetry-toast';
    toast.className = 'fixed bottom-6 right-6 z-[100] transform translate-y-24 opacity-0 transition-all duration-300 pointer-events-none';
    toast.innerHTML = `
      <div class="bg-surface-container-highest border border-outline-variant/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
        <span id="global-toast-icon" class="material-symbols-outlined text-primary-container text-[20px]">check_circle</span>
        <span id="global-toast-text" class="font-telemetry-data text-body-sm text-primary font-semibold"></span>
      </div>
    `;
    document.body.appendChild(toast);
  }

  const iconEl = document.getElementById('global-toast-icon');
  const textEl = document.getElementById('global-toast-text');
  textEl.textContent = message;

  if (type === 'error') {
    iconEl.textContent = 'error';
    iconEl.className = 'material-symbols-outlined text-error text-[20px]';
  } else {
    iconEl.textContent = 'check_circle';
    iconEl.className = 'material-symbols-outlined text-primary-container text-[20px]';
  }

  toast.classList.remove('translate-y-24', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3800);
}

function ensureModalContainer() {
  let modal = document.getElementById('telemetry-modal-backdrop');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'telemetry-modal-backdrop';
    modal.className = 'hidden fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-surface-container border border-outline-variant/40 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <div>
            <span id="modal-eyebrow" class="font-label-caps text-label-caps uppercase text-secondary tracking-wider">TELEMETRY ACTION</span>
            <h3 id="modal-title" class="font-headline-md text-headline-md text-primary font-bold">Modal Title</h3>
          </div>
          <button id="modal-close-btn" type="button" class="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div id="modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  return modal;
}

export function openModal({ eyebrow, title, bodyHtml, onMount }) {
  const modal = ensureModalContainer();
  document.getElementById('modal-eyebrow').textContent = eyebrow;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  modal.classList.remove('hidden');
  if (typeof onMount === 'function') onMount();
}

export function closeModal() {
  const modal = document.getElementById('telemetry-modal-backdrop');
  if (modal) modal.classList.add('hidden');
}

export function openArchiveReplaceModal(component) {
  openModal({
    eyebrow: 'LIFECYCLE REPLACEMENT PROTOCOL',
    title: `Archive & Replace: ${component.name}`,
    bodyHtml: `
      <form id="form-archive-replace" class="space-y-4 font-body-sm">
        <div class="p-3 rounded-lg bg-error-container/20 border border-error/30 text-on-surface">
          <div class="font-telemetry-data text-error font-semibold">Retiring Part: ${component.name}</div>
          <div class="text-on-surface-variant mt-0.5">Logged: <strong>${formatKm(component.logged_km)} km</strong> (${component.effective_wear_pct}% wear) • Will be moved to Permanent Ledger Archive.</div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Retirement Badge</label>
            <select name="retirementBadge" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded">
              <option value="Full Duty Cycle">Full Duty Cycle</option>
              <option value="Normal Wear" selected>Normal Wear</option>
              <option value="Early Retirement">Early Retirement</option>
              <option value="Ratio Upgrade">Ratio Upgrade</option>
            </select>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Service Date</label>
            <input type="date" name="serviceDate" required value="${new Date().toISOString().split('T')[0]}" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>

        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Retirement Reason / Inspection Note</label>
          <input type="text" name="retirementReason" required placeholder="e.g. Chain elongation reached 0.75% on gauge" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>

        <hr class="border-outline-variant/30"/>

        <div>
          <label class="font-label-caps text-label-caps uppercase text-primary-container block mb-1">New Replacement Part Name</label>
          <input type="text" name="newComponentName" required value="${component.name}" class="w-full bg-surface-container-lowest text-primary font-semibold p-2.5 rounded"/>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Target KM</label>
            <input type="number" name="newMaxLifespanKm" required value="${component.max_lifespan_km}" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Max Months</label>
            <input type="number" name="newMaxLifespanMonths" required value="${component.max_lifespan_months}" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Price (IDR)</label>
            <input type="number" name="newCostIdr" required placeholder="320000" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>

        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Workshop / Mechanic</label>
          <input type="text" name="workshopName" value="Self-maintained (Home Workshop)" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="cancel-ar-btn" class="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-caps uppercase">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded bg-primary-container text-on-primary font-label-caps uppercase font-bold">Archive & Install New</button>
        </div>
      </form>
    `,
    onMount: () => {
      document.getElementById('cancel-ar-btn').addEventListener('click', closeModal);
      document.getElementById('form-archive-replace').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await TelemetryService.archiveAndReplaceComponent({
            oldComponentId: component.id,
            retirementReason: fd.get('retirementReason'),
            retirementBadge: fd.get('retirementBadge'),
            newComponentName: fd.get('newComponentName'),
            newMaxLifespanKm: fd.get('newMaxLifespanKm'),
            newMaxLifespanMonths: fd.get('newMaxLifespanMonths'),
            newCostIdr: fd.get('newCostIdr'),
            serviceDate: new Date(fd.get('serviceDate')).toISOString(),
            workshopName: fd.get('workshopName'),
            notes: fd.get('retirementReason')
          });
          closeModal();
          showToast(`Archived ${component.name} & initialized new part at 0 km!`);
          await refreshAllData();
        } catch (err) {
          showToast(err.message || 'Failed to replace component', 'error');
        }
      });
    }
  });
}

export function openQuickResetModal(component) {
  openModal({
    eyebrow: 'INTERVAL MAINTENANCE RESET',
    title: `Log Service: ${component.name}`,
    bodyHtml: `
      <form id="form-quick-reset" class="space-y-4 font-body-sm">
        <div class="p-3 rounded-lg bg-surface-container-lowest font-telemetry-data text-on-surface-variant">
          Current Interval Distance: <strong class="text-secondary">${formatKm(component.interval_km)} km</strong> since last care • Total Part Wear: <strong>${component.effective_wear_pct}%</strong>
        </div>
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Service Action Title</label>
          <input type="text" name="serviceTitle" required value="${component.name} – Degrease, Wax / Inspection" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Cost (IDR)</label>
            <input type="number" name="costIdr" value="0" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Date</label>
            <input type="date" name="serviceDate" required value="${new Date().toISOString().split('T')[0]}" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Workshop / Notes</label>
          <input type="text" name="notes" placeholder="e.g. Applied Squirt Dry Lube / Checked caliper" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="cancel-qr-btn" class="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-caps uppercase">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded bg-secondary text-on-secondary font-label-caps uppercase font-bold">Reset Interval & Log</button>
        </div>
      </form>
    `,
    onMount: () => {
      document.getElementById('cancel-qr-btn').addEventListener('click', closeModal);
      document.getElementById('form-quick-reset').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await TelemetryService.resetComponentInterval({
            bikeId: component.bike_id,
            componentId: component.id,
            componentName: component.name,
            serviceTitle: fd.get('serviceTitle'),
            serviceDate: new Date(fd.get('serviceDate')).toISOString(),
            odometerKm: AppState.selectedBike?.odometer_km || 0,
            costIdr: fd.get('costIdr'),
            notes: fd.get('notes')
          });
          closeModal();
          showToast(`Interval counter reset for ${component.name}`);
          await refreshAllData();
        } catch (err) {
          showToast(err.message || 'Failed to log service', 'error');
        }
      });
    }
  });
}

export function openAddBikeModal() {
  openModal({
    eyebrow: 'FLEET PROVISIONING',
    title: 'Register New Bicycle',
    bodyHtml: `
      <form id="form-add-bike" class="space-y-4 font-body-sm">
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Bicycle Model Name</label>
          <input type="text" name="name" required placeholder="e.g. Polygon Path X4" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Subtitle / Discipline</label>
          <input type="text" name="subtitle" placeholder="e.g. Endurance Road & Gravel Rig" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Groupset Spec</label>
            <input type="text" name="groupset_spec" placeholder="Shimano 105 R7000 11s" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Gear Ratio</label>
            <input type="text" name="drivetrain_ratio" placeholder="50-34T • 11-36T" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Wheel & Tire Spec</label>
            <input type="text" name="wheel_tire_spec" placeholder="700x32c / 700x38c" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Initial Odometer (KM)</label>
            <input type="number" step="0.1" name="odometer_km" value="0" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>
        <label class="flex items-center gap-2 text-on-surface cursor-pointer">
          <input type="checkbox" name="is_default" checked class="accent-primary-container"/>
          <span>Set as Active Default Bicycle</span>
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="cancel-bike-btn" class="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-caps uppercase">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded bg-primary-container text-on-primary font-label-caps uppercase font-bold">Save Bicycle</button>
        </div>
      </form>
    `,
    onMount: () => {
      document.getElementById('cancel-bike-btn').addEventListener('click', closeModal);
      document.getElementById('form-add-bike').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          const newBike = await TelemetryService.createBike({
            name: fd.get('name'),
            subtitle: fd.get('subtitle'),
            groupset_spec: fd.get('groupset_spec'),
            drivetrain_ratio: fd.get('drivetrain_ratio'),
            wheel_tire_spec: fd.get('wheel_tire_spec'),
            odometer_km: Number(fd.get('odometer_km')) || 0,
            is_default: fd.get('is_default') === 'on',
            status: 'in_service'
          });
          AppState.selectedBike = newBike;
          closeModal();
          showToast(`Bicycle "${newBike.name}" registered!`);
          await refreshAllData();
        } catch (err) {
          showToast(err.message || 'Failed to add bicycle', 'error');
        }
      });
    }
  });
}

export function openAddComponentModal() {
  if (!AppState.selectedBike) return;
  openModal({
    eyebrow: `HARDWARE REGISTRY • ${AppState.selectedBike.name.toUpperCase()}`,
    title: 'Register Tracked Component',
    bodyHtml: `
      <form id="form-add-component" class="space-y-4 font-body-sm">
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Component Name & Model</label>
          <input type="text" name="name" required placeholder="e.g. Shimano HG-601 11-Speed Chain" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Category</label>
            <select name="category" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded">
              <option value="Drivetrain">Drivetrain</option>
              <option value="Wheelset (Rear)">Wheelset (Rear)</option>
              <option value="Wheelset (Front)">Wheelset (Front)</option>
              <option value="Brakes (F/R)">Brakes (F/R)</option>
              <option value="Chassis Bearing">Chassis Bearing</option>
              <option value="Cockpit">Cockpit</option>
            </select>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Installed Date</label>
            <input type="date" name="installed_date" required value="${new Date().toISOString().split('T')[0]}" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Lifespan (KM)</label>
            <input type="number" name="max_lifespan_km" required value="3000" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Max Months</label>
            <input type="number" name="max_lifespan_months" required value="12" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Cost (IDR)</label>
            <input type="number" name="purchase_cost_idr" value="0" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Initial Logged KM (0 if brand new)</label>
          <input type="number" step="0.1" name="logged_km" value="0" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="cancel-comp-btn" class="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-caps uppercase">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded bg-primary-container text-on-primary font-label-caps uppercase font-bold">Add Component</button>
        </div>
      </form>
    `,
    onMount: () => {
      document.getElementById('cancel-comp-btn').addEventListener('click', closeModal);
      document.getElementById('form-add-component').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const iconMap = {
          'Drivetrain': 'link',
          'Wheelset (Rear)': 'tire_repair',
          'Wheelset (Front)': 'tire_repair',
          'Brakes (F/R)': 'album',
          'Chassis Bearing': 'trip_origin',
          'Cockpit': 'tune'
        };
        const cat = fd.get('category');
        try {
          await TelemetryService.addComponent({
            bike_id: AppState.selectedBike.id,
            name: fd.get('name'),
            category: cat,
            icon_name: iconMap[cat] || 'settings',
            installed_date: fd.get('installed_date'),
            installed_at_bike_km: AppState.selectedBike.odometer_km,
            logged_km: Number(fd.get('logged_km')) || 0,
            interval_km: 0,
            max_lifespan_km: Number(fd.get('max_lifespan_km')),
            max_lifespan_months: Number(fd.get('max_lifespan_months')),
            purchase_cost_idr: Number(fd.get('purchase_cost_idr')) || 0,
            status: 'active'
          });
          closeModal();
          showToast(`Component "${fd.get('name')}" added to ${AppState.selectedBike.name}`);
          await refreshAllData();
        } catch (err) {
          showToast(err.message || 'Failed to add component', 'error');
        }
      });
    }
  });
}

function renderComponentCard(comp) {
  const pct = Math.min(Number(comp.effective_wear_pct) || 0, 100);
  const rawPct = Number(comp.effective_wear_pct) || 0;

  let statusBadge = 'Optimal';
  let topBarClass = 'bg-tertiary-container';
  let badgeClass = 'bg-tertiary-container/15 text-tertiary-fixed';
  let pctTextClass = 'text-tertiary-fixed';
  let barFillClass = 'bg-tertiary-container';
  let primaryBtnHtml = `<button data-action="reset" data-id="${comp.id}" class="flex-1 py-space-sm px-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-sm font-semibold transition-all text-center" type="button">Log Lube / Check</button>`;

  if (rawPct >= 80) {
    statusBadge = 'Critical Wear';
    topBarClass = 'bg-error';
    badgeClass = 'bg-error/15 text-error';
    pctTextClass = 'text-error';
    barFillClass = 'bg-error shadow-[0_0_8px_rgba(255,180,171,0.5)]';
    primaryBtnHtml = `<button data-action="replace" data-id="${comp.id}" class="flex-1 py-space-sm px-space-sm rounded-xl bg-error text-on-error font-headline-sm text-body-sm font-bold hover:brightness-110 active:scale-95 transition-all text-center" type="button">Archive &amp; Replace</button>`;
  } else if (rawPct >= 50) {
    statusBadge = 'Warning';
    topBarClass = 'bg-secondary';
    badgeClass = 'bg-secondary/15 text-secondary';
    pctTextClass = 'text-secondary';
    barFillClass = 'bg-secondary shadow-[0_0_6px_rgba(76,215,246,0.3)]';
    primaryBtnHtml = `<button data-action="reset" data-id="${comp.id}" class="flex-1 py-space-sm px-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary font-body-md text-body-sm font-semibold transition-all text-center" type="button">Log Service / Rotate</button>`;
  }

  return `
    <div class="bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between shadow-md relative overflow-hidden group" data-category="${comp.category}">
      <div class="absolute top-0 left-0 right-0 h-1 ${topBarClass}"></div>
      <div>
        <div class="flex items-start justify-between gap-space-sm">
          <div>
            <div class="flex items-center gap-space-xs">
              <span class="font-label-caps text-label-caps uppercase px-1.5 py-0.5 rounded ${badgeClass} font-semibold tracking-wider">${statusBadge}</span>
              <span class="font-telemetry-data text-body-sm text-on-surface-variant">${comp.category}</span>
            </div>
            <h3 class="font-headline-sm text-headline-sm text-primary font-bold mt-1">${comp.name}</h3>
          </div>
          <div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center ${pctTextClass} flex-shrink-0">
            <span class="material-symbols-outlined text-[22px]">${comp.icon_name || 'settings'}</span>
          </div>
        </div>

        <div class="mt-space-md grid grid-cols-2 gap-space-xs font-telemetry-data text-body-sm bg-surface-container/60 p-space-sm rounded-lg">
          <div>
            <span class="text-on-surface-variant block text-label-caps uppercase font-label-caps">Installed</span>
            <span class="text-on-surface font-medium">${comp.installed_date}</span>
          </div>
          <div>
            <span class="text-on-surface-variant block text-label-caps uppercase font-label-caps">Lifespan Cap</span>
            <span class="text-on-surface font-medium">${Number(comp.max_lifespan_km).toLocaleString()} km / ${comp.max_lifespan_months}m</span>
          </div>
        </div>

        <div class="mt-space-md space-y-space-xs">
          <div class="flex items-center justify-between font-telemetry-data text-body-sm">
            <span class="${pctTextClass} font-semibold">${formatKm(comp.logged_km)} km / ${Number(comp.max_lifespan_km).toLocaleString()} km</span>
            <span class="font-telemetry-metric-md text-telemetry-metric-md ${pctTextClass} font-bold">${rawPct}%</span>
          </div>
          <div class="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div class="h-full ${barFillClass} rounded-full transition-all duration-500" style="width: ${pct}%;"></div>
          </div>
          <p class="font-telemetry-data text-body-sm text-on-surface-variant mt-1 truncate">
            ${comp.notes || `Interval since care: ${formatKm(comp.interval_km)} km`}
          </p>
        </div>
      </div>

      <div class="mt-space-lg pt-space-sm flex items-center gap-space-sm">
        ${primaryBtnHtml}
        <button data-action="replace" data-id="${comp.id}" class="py-space-sm px-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-primary font-body-md text-body-sm transition-all" type="button">
          Replace
        </button>
      </div>
    </div>
  `;
}

export async function refreshAllData() {
  try {
    AppState.bikes = await TelemetryService.getBikes();
    if (!AppState.selectedBike && AppState.bikes.length > 0) {
      AppState.selectedBike = AppState.bikes.find(b => b.is_default) || AppState.bikes[0];
    } else if (AppState.selectedBike) {
      AppState.selectedBike = AppState.bikes.find(b => b.id === AppState.selectedBike.id) || AppState.bikes[0];
    }

    if (!AppState.selectedBike) return;

    const [metrics, archived, ledger, rules, settings] = await Promise.all([
      TelemetryService.getDashboardMetrics(AppState.selectedBike),
      TelemetryService.getComponents(AppState.selectedBike.id, 'archived'),
      TelemetryService.getUnifiedLedger(AppState.selectedBike.id),
      TelemetryService.getComponentRules(),
      TelemetryService.getRiderSettings()
    ]);

    AppState.activeComps = metrics.activeComps;
    AppState.archivedComps = archived;
    AppState.ledger = ledger;
    AppState.rules = rules;
    AppState.settings = settings;

    const gridEl = document.getElementById('live-components-grid');
    if (gridEl) {
      gridEl.innerHTML = AppState.activeComps.map(renderComponentCard).join('');
      gridEl.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const comp = AppState.activeComps.find(c => c.id === btn.dataset.id);
          if (!comp) return;
          if (btn.dataset.action === 'replace') openArchiveReplaceModal(comp);
          if (btn.dataset.action === 'reset') openQuickResetModal(comp);
        });
      });
    }

    const stravaBtns = document.querySelectorAll('[data-action="sync-strava"]');
    stravaBtns.forEach(btn => {
      if (AppState.settings?.strava_connected) {
        btn.classList.add('border', 'border-tertiary-container/40');
      }
      btn.onclick = async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        const labelSpan = btn.querySelector('span:last-child');
        const origLabel = labelSpan ? labelSpan.textContent : 'Sync Strava';
        if (labelSpan) labelSpan.textContent = 'Syncing...';

        try {
          showToast('Menghubungkan ke Strava API...');
          const res = await TelemetryService.triggerStravaSync(AppState.selectedBike?.id || null);

          if (res?.needsAuth && res?.authUrl) {
            showToast('Mengalihkan ke halaman login Strava OAuth...');
            window.location.href = res.authUrl;
            return;
          }

          const count = res?.syncedCount || 0;
          const km = res?.totalKmAdded || 0;
          if (count > 0) {
            showToast(`Strava Synced: +${count} aktivitas (+${formatKm(km)} km) masuk ke ${res.bikeName || 'sepeda'}!`);
          } else {
            showToast('Strava sudah sinkron — tidak ada aktivitas baru.');
          }
          await refreshAllData();
        } catch (err) {
          showToast(err.message || 'Gagal sinkronisasi Strava', 'error');
        } finally {
          btn.disabled = false;
          if (labelSpan) labelSpan.textContent = origLabel;
        }
      };
    });

    const sheetsBtns = document.querySelectorAll('[data-action="backup-sheets"]');
    sheetsBtns.forEach(btn => {
      btn.onclick = async () => {
        try {
          showToast('Pushing snapshot to Google Sheets...');
          await TelemetryService.pushBackupToGoogleSheets();
          showToast('Backup snapshot successfully saved to Google Sheets!');
        } catch (err) {
          showToast(err.message || 'Sheets sync failed', 'error');
        }
      };
    });

    window.dispatchEvent(new CustomEvent('telemetry:updated', { detail: { AppState, metrics } }));
  } catch (err) {
    console.error('Supabase Sync Error:', err);
    showToast('Database connection pending. Set SUPABASE_URL & SUPABASE_ANON_KEY in Vercel Env.', 'error');
  }
}

window.GearTrackUI = {
  AppState,
  refreshAllData,
  openAddBikeModal,
  openAddComponentModal,
  openArchiveReplaceModal,
  openQuickResetModal,
  showToast,
  formatIDR,
  formatKm
};

document.addEventListener('DOMContentLoaded', async () => {
  await refreshAllData();

  const params = new URLSearchParams(window.location.search);
  const stravaStatus = params.get('strava');
  if (stravaStatus) {
    if (stravaStatus === 'connected') {
      const synced = Number(params.get('synced') || 0);
      const km = Number(params.get('km') || 0);
      showToast(`Strava terhubung! ${synced} aktivitas (+${formatKm(km)} km) disinkronkan.`);
    } else if (stravaStatus === 'denied') {
      showToast('Otorisasi Strava dibatalkan.', 'error');
    } else if (stravaStatus === 'error') {
      showToast(`Strava Error: ${params.get('msg') || 'Gagal menghubungkan akun'}`, 'error');
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});
