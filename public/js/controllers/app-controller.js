// js/app-controller.js
import { TelemetryService, formatIDR, formatKm } from '../services/telemetry-service.js';
import { AuthService } from '../services/auth-service.js';
import { getSupabase } from '../core/supabase-client.js';

export const AppState = {
  currentUser: null,
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

export function openEditBikeModal(bike) {
  if (!bike) return;
  openModal({
    eyebrow: 'FLEET CONFIGURATION',
    title: `Edit Bicycle: ${bike.name}`,
    bodyHtml: `
      <form id="form-edit-bike" class="space-y-4 font-body-sm">
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Bicycle Model Name</label>
          <input type="text" name="name" required value="${bike.name || ''}" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Subtitle / Discipline</label>
          <input type="text" name="subtitle" value="${bike.subtitle || ''}" placeholder="e.g. Endurance Road & Gravel Rig" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Groupset Spec</label>
            <input type="text" name="groupset_spec" value="${bike.groupset_spec || ''}" placeholder="Shimano 105 R7000 11s" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Gear Ratio</label>
            <input type="text" name="drivetrain_ratio" value="${bike.drivetrain_ratio || ''}" placeholder="50-34T • 11-36T" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Wheel &amp; Tire Spec</label>
            <input type="text" name="wheel_tire_spec" value="${bike.wheel_tire_spec || ''}" placeholder="700x32c / 700x38c" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Current Odometer (KM)</label>
            <input type="number" step="0.1" name="odometer_km" required value="${Number(bike.odometer_km) || 0}" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 items-center">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Status</label>
            <select name="status" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded">
              <option value="in_service" ${bike.status === 'in_service' ? 'selected' : ''}>IN_SERVICE</option>
              <option value="standby" ${bike.status === 'standby' ? 'selected' : ''}>STANDBY</option>
              <option value="maintenance" ${bike.status === 'maintenance' ? 'selected' : ''}>MAINTENANCE</option>
              <option value="retired" ${bike.status === 'retired' ? 'selected' : ''}>RETIRED</option>
            </select>
          </div>
          <label class="flex items-center gap-2 text-on-surface cursor-pointer pt-5">
            <input type="checkbox" name="is_default" ${bike.is_default ? 'checked' : ''} class="accent-primary-container"/>
            <span>Active Default Bicycle</span>
          </label>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="cancel-edit-bike-btn" class="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-caps uppercase">Cancel</button>
          <button type="submit" id="submit-edit-bike-btn" class="px-5 py-2 rounded bg-primary-container text-on-primary font-label-caps uppercase font-bold">Save Changes</button>
        </div>
      </form>
    `,
    onMount: () => {
      document.getElementById('cancel-edit-bike-btn').addEventListener('click', closeModal);
      document.getElementById('form-edit-bike').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const submitBtn = document.getElementById('submit-edit-bike-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const updates = {
          name: String(fd.get('name') || '').trim(),
          subtitle: String(fd.get('subtitle') || '').trim(),
          groupset_spec: String(fd.get('groupset_spec') || '').trim(),
          drivetrain_ratio: String(fd.get('drivetrain_ratio') || '').trim(),
          wheel_tire_spec: String(fd.get('wheel_tire_spec') || '').trim(),
          odometer_km: Number(fd.get('odometer_km')) || 0,
          status: String(fd.get('status') || 'in_service'),
          is_default: fd.get('is_default') === 'on'
        };

        try {
          if (typeof TelemetryService.updateBike === 'function') {
            await TelemetryService.updateBike(bike.id, updates);
          } else {
            const { supabase } = await getSupabase();
            if (updates.is_default) {
              await supabase.from('bikes').update({ is_default: false }).neq('id', bike.id);
            }
            const { error } = await supabase
              .from('bikes')
              .update(updates)
              .eq('id', bike.id);
            if (error) throw error;
          }

          if (updates.is_default || AppState.selectedBike?.id === bike.id) {
            AppState.selectedBike = { ...bike, ...updates };
          }

          closeModal();
          showToast(`Data sepeda "${updates.name}" berhasil diperbarui!`);
          await refreshAllData();
        } catch (err) {
          showToast(err.message || 'Gagal memperbarui data sepeda', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Changes';
        }
      });
    }
  });
}

export function openDeleteBikeModal(bike) {
  if (!bike) return;
  const otherBikes = AppState.bikes.filter(b => b.id !== bike.id);
  const nextBikeHint = bike.is_default && otherBikes.length > 0
    ? `<div class="p-2.5 rounded-lg bg-secondary/10 border border-secondary/30 text-secondary text-body-sm">Sepeda <strong>${otherBikes[0].name}</strong> akan otomatis dijadikan <strong>Active Default</strong> pengganti.</div>`
    : '';

  openModal({
    eyebrow: 'FLEET DECOMMISSIONING',
    title: `Delete Bicycle: ${bike.name}`,
    bodyHtml: `
      <form id="form-delete-bike" class="space-y-4 font-body-sm">
        <div class="p-3 rounded-lg bg-error-container/20 border border-error/30 text-on-surface space-y-1">
          <div class="font-telemetry-data text-error font-semibold">Peringatan: Tindakan Permanen</div>
          <p class="text-on-surface-variant">
            Menghapus <strong>${bike.name}</strong> (${formatKm(bike.odometer_km)} km) juga akan menghapus permanen seluruh <strong>komponen terpasang</strong>, <strong>riwayat aktivitas</strong>, dan <strong>catatan servis/biaya</strong> yang terhubung ke sepeda ini.
          </p>
        </div>

        ${nextBikeHint}

        <label class="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container-lowest text-on-surface cursor-pointer">
          <input type="checkbox" id="confirm-delete-bike-chk" required class="mt-0.5 accent-error"/>
          <span>Saya memahami data sepeda <strong>${bike.name}</strong> beserta seluruh log terkait akan dihapus permanen.</span>
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="cancel-del-bike-btn" class="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-caps uppercase">Cancel</button>
          <button type="submit" id="submit-del-bike-btn" class="px-5 py-2 rounded bg-error text-on-error font-label-caps uppercase font-bold hover:brightness-110 transition-all">Delete Permanently</button>
        </div>
      </form>
    `,
    onMount: () => {
      document.getElementById('cancel-del-bike-btn').addEventListener('click', closeModal);
      document.getElementById('form-delete-bike').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-del-bike-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Deleting...';
        try {
          const res = await TelemetryService.deleteBike(bike.id);
          if (AppState.selectedBike?.id === bike.id) {
            AppState.selectedBike = res.nextActiveBike || null;
          }
          closeModal();
          showToast(`Sepeda "${bike.name}" berhasil dihapus dari garasi.`);
          await refreshAllData();
        } catch (err) {
          showToast(err.message || 'Gagal menghapus sepeda', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Delete Permanently';
        }
      });
    }
  });
}

export function openSheetsBackupModal() {
  const saved = TelemetryService.getSavedSheetsConfig();
  const dbSheetUrl = AppState.settings?.google_sheet_id || '';
  const currentSheetUrl = saved.spreadsheetUrl || dbSheetUrl;
  const lastSync = AppState.settings?.last_sheets_sync
    ? new Date(AppState.settings.last_sheets_sync).toLocaleString('id-ID')
    : 'Belum pernah sinkron';

  openModal({
    eyebrow: 'GOOGLE SPREADSHEET CLOUD BACKUP',
    title: 'Backup Data ke Google Sheets',
    bodyHtml: `
      <form id="form-sheets-backup" class="space-y-4 font-body-sm">
        <div class="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-label-caps text-label-caps uppercase text-secondary">STATUS SNAPSHOT</span>
            <span class="font-telemetry-data text-on-surface-variant text-[12px]">Last Sync: ${lastSync}</span>
          </div>
          <p class="text-on-surface-variant text-[12px] leading-relaxed">
            Mengekspor seluruh data <strong>Bikes</strong>, <strong>Components</strong>, <strong>Activities</strong>, dan <strong>Maintenance Logs</strong> ke 5 tab terstruktur di Google Spreadsheet Anda.
          </p>
        </div>

        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Google Apps Script Web App URL</label>
          <input type="url" name="webhookUrl" value="${saved.webhookUrl}" placeholder="https://script.google.com/macros/s/.../exec"
            class="w-full bg-surface-container-lowest border border-outline-variant/40 focus:border-primary-container focus:outline-none text-primary font-telemetry-data p-2.5 rounded"/>
          <span class="text-[11px] text-outline mt-1 block">Kosongkan jika sudah diisi di Vercel Env (<code>GOOGLE_SHEETS_WEBHOOK_URL</code>).</span>
        </div>

        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Link Google Spreadsheet Anda (Opsional)</label>
          <input type="url" name="spreadsheetUrl" value="${currentSheetUrl}" placeholder="https://docs.google.com/spreadsheets/d/..."
            class="w-full bg-surface-container-lowest border border-outline-variant/40 focus:border-secondary focus:outline-none text-secondary font-telemetry-data p-2.5 rounded"/>
        </div>

        <details class="p-3 rounded-lg bg-surface-container-lowest/70 border border-outline-variant/20 text-[12px] text-on-surface-variant">
          <summary class="cursor-pointer font-label-caps text-label-caps uppercase text-primary-fixed font-semibold">Cara Mendapatkan Web App URL (1 Menit)</summary>
          <ol class="list-decimal list-inside space-y-1 mt-2 text-on-surface-variant">
            <li>Buka Google Spreadsheet Anda → klik <strong>Extensions → Apps Script</strong>.</li>
            <li>Tempel kode dari file <code>backend/google-apps-script/Code.gs</code> lalu Save.</li>
            <li>Klik <strong>Deploy → New deployment → Web app</strong>.</li>
            <li>Pilih <strong>Execute as: Me</strong> &amp; <strong>Who has access: Anyone</strong>, lalu Deploy.</li>
            <li>Salin <strong>Web app URL</strong> (<code>/exec</code>) dan tempel pada kolom di atas.</li>
          </ol>
        </details>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
          ${currentSheetUrl ? `<a href="${currentSheetUrl}" target="_blank" rel="noopener" class="px-3 py-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary font-label-caps text-label-caps uppercase font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">open_in_new</span><span>Buka Spreadsheet</span></a>` : '<span></span>'}
          <div class="flex items-center gap-2">
            <button type="button" id="cancel-sheets-btn" class="px-4 py-2 rounded bg-surface-container-high text-on-surface font-label-caps uppercase">Cancel</button>
            <button type="submit" id="submit-sheets-btn" class="px-5 py-2 rounded bg-primary-container text-on-primary font-label-caps uppercase font-bold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">cloud_upload</span>
              <span>Push Backup Now</span>
            </button>
          </div>
        </div>
      </form>
    `,
    onMount: () => {
      document.getElementById('cancel-sheets-btn').addEventListener('click', closeModal);
      document.getElementById('form-sheets-backup').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const webhookUrl = String(fd.get('webhookUrl') || '').trim();
        const spreadsheetUrl = String(fd.get('spreadsheetUrl') || '').trim();

        const btn = document.getElementById('submit-sheets-btn');
        const origHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span><span>Backing Up...</span>';

        try {
          const res = await TelemetryService.pushBackupToGoogleSheets({ webhookUrl, spreadsheetUrl });
          closeModal();
          showToast(res.message || 'Backup berhasil disimpan ke Google Sheets!');
          await refreshAllData();
        } catch (err) {
          showToast(err.message || 'Gagal mengirim backup ke Google Sheets', 'error');
          btn.disabled = false;
          btn.innerHTML = origHtml;
        }
      });
    }
  });
}

export async function openAddComponentModal() {
  const bikes = AppState.bikes || [];
  const defaultBike = AppState.selectedBike || bikes.find(b => b.is_default) || bikes[0];
  if (!defaultBike) return;

  // Ambil daftar rules dari AppState, cache window, atau langsung dari Supabase component_rules
  let rules = Array.isArray(AppState.rules) && AppState.rules.length > 0
    ? AppState.rules
    : (Array.isArray(window.GearTrackRules) && window.GearTrackRules.length > 0 ? window.GearTrackRules : []);

  if (!rules.length) {
    try {
      const { supabase } = await getSupabase();
      const { data, error } = await supabase
        .from('component_rules')
        .select('*')
        .order('category_name', { ascending: true });
      if (!error && Array.isArray(data)) {
        rules = data;
        AppState.rules = data;
      }
    } catch (err) {
      console.warn('Gagal memuat component_rules untuk dropdown:', err.message);
    }
  }

  // Fallback jika tabel component_rules masih kosong
  if (!rules.length) {
    rules = [
      { category_name: 'Bicycle Chain', default_max_km: 3000, default_max_months: 6, calibration_note: 'Standar chain stretch 0.5% - 0.75%' },
      { category_name: 'Tires (Front/Rear)', default_max_km: 3500, default_max_months: 12, calibration_note: 'Standar ketebalan tapak ban luar' }
    ];
  }

  const initialRule = rules[0];

  const getIconForCategory = (catName = '') => {
    const lower = catName.toLowerCase();
    if (lower.includes('chain') || lower.includes('cassette') || lower.includes('drivetrain')) return 'link';
    if (lower.includes('tire') || lower.includes('wheelset')) return 'tire_repair';
    if (lower.includes('brake')) return 'album';
    if (lower.includes('bearing') || lower.includes('bracket')) return 'trip_origin';
    return 'settings';
  };

  const bikeOptionsHtml = bikes.map(b => `
    <option value="${b.id}" ${b.id === defaultBike.id ? 'selected' : ''}>
      ${b.name} (${formatKm(b.odometer_km)} km)${b.is_default ? ' • Active' : ''}
    </option>
  `).join('');

  const categoryOptionsHtml = rules.map((r, idx) => `
    <option value="${r.category_name}" ${idx === 0 ? 'selected' : ''}>
      ${r.category_name}${r.badge_label ? ` (${r.badge_label})` : ''}
    </option>
  `).join('');

  openModal({
    eyebrow: `HARDWARE REGISTRY • ${defaultBike.name.toUpperCase()}`,
    title: 'Register Tracked Component',
    bodyHtml: `
      <form id="form-add-component" class="space-y-4 font-body-sm">
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Target Registered Bicycle</label>
          <select name="bike_id" id="comp-target-bike" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded">
            ${bikeOptionsHtml}
          </select>
        </div>
        <div>
          <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Component Name & Model</label>
          <input type="text" name="name" required placeholder="e.g. Shimano HG-601 11-Speed Chain" class="w-full bg-surface-container-lowest text-primary p-2.5 rounded"/>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Category (from Rules)</label>
            <select name="category" id="comp-category-select" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded">
              ${categoryOptionsHtml}
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
            <input type="number" name="max_lifespan_km" id="comp-max-km" required value="${Number(initialRule.default_max_km) || 3000}" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Max Months</label>
            <input type="number" name="max_lifespan_months" id="comp-max-months" required value="${Number(initialRule.default_max_months) || 12}" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
          <div>
            <label class="font-label-caps text-label-caps uppercase text-on-surface-variant block mb-1">Cost (IDR)</label>
            <input type="number" name="purchase_cost_idr" value="0" class="w-full bg-surface-container-lowest text-primary font-telemetry-data p-2.5 rounded"/>
          </div>
        </div>
        <p id="comp-lifespan-hint" class="font-telemetry-data text-[11px] text-tertiary-fixed -mt-2">
          ${initialRule.calibration_note || initialRule.description || 'Standar kalibrasi dari Supabase component_rules'}
        </p>
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
      const bikeSelect = document.getElementById('comp-target-bike');
      const eyebrowEl = document.getElementById('modal-eyebrow');
      const categorySelect = document.getElementById('comp-category-select');
      const maxKmInput = document.getElementById('comp-max-km');
      const maxMonthsInput = document.getElementById('comp-max-months');
      const hintEl = document.getElementById('comp-lifespan-hint');

      bikeSelect?.addEventListener('change', () => {
        const chosenBike = bikes.find(b => b.id === bikeSelect.value);
        if (chosenBike && eyebrowEl) {
          eyebrowEl.textContent = `HARDWARE REGISTRY • ${chosenBike.name.toUpperCase()}`;
        }
      });

      // Sinkronkan Lifespan (KM), Max Months, & catatan dari baris component_rules yang dipilih
      categorySelect?.addEventListener('change', () => {
        const selectedRule = rules.find(r => r.category_name === categorySelect.value);
        if (!selectedRule) return;
        if (maxKmInput) maxKmInput.value = Number(selectedRule.default_max_km) || 3000;
        if (maxMonthsInput) maxMonthsInput.value = Number(selectedRule.default_max_months) || 12;
        if (hintEl) {
          hintEl.textContent = selectedRule.calibration_note || selectedRule.description || 'Standar kalibrasi dari Supabase component_rules';
        }
      });

      document.getElementById('cancel-comp-btn').addEventListener('click', closeModal);
      document.getElementById('form-add-component').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const targetBikeId = fd.get('bike_id');
        const targetBike = bikes.find(b => b.id === targetBikeId) || defaultBike;
        const cat = String(fd.get('category') || '');

        try {
          await TelemetryService.addComponent({
            bike_id: targetBike.id,
            name: fd.get('name'),
            category: cat,
            icon_name: getIconForCategory(cat),
            installed_date: fd.get('installed_date'),
            installed_at_bike_km: targetBike.odometer_km,
            logged_km: Number(fd.get('logged_km')) || 0,
            interval_km: 0,
            max_lifespan_km: Number(fd.get('max_lifespan_km')),
            max_lifespan_months: Number(fd.get('max_lifespan_months')),
            purchase_cost_idr: Number(fd.get('purchase_cost_idr')) || 0,
            status: 'active'
          });
          closeModal();
          showToast(`Component "${fd.get('name')}" added to ${targetBike.name}`);
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

    if (!AppState.selectedBike) {
      AppState.activeComps = [];
      AppState.archivedComps = [];
      AppState.ledger = [];
      window.dispatchEvent(new CustomEvent('telemetry:updated', {
        detail: {
          AppState,
          metrics: {
            activeComps: [],
            attentionComps: [],
            totalRidesCount: 0,
            monthKm: 0,
            totalSpendIdr: 0,
            partsSpendIdr: 0,
            serviceSpendIdr: 0,
            costPer100Km: 0
          }
        }
      }));
      return;
    }

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
      btn.classList.add('hidden');
      btn.setAttribute('aria-hidden', 'true');
      // if (AppState.settings?.strava_connected) {
      //   btn.classList.add('border', 'border-tertiary-container/40');
      // }
      // btn.onclick = async () => {
      //   if (btn.disabled) return;
      //   btn.disabled = true;
      //   const labelSpan = btn.querySelector('span:last-child');
      //   const origLabel = labelSpan ? labelSpan.textContent : 'Sync Strava';
      //   if (labelSpan) labelSpan.textContent = 'Syncing...';

      //   try {
      //     showToast('Menghubungkan ke Strava API...');
      //     const res = await TelemetryService.triggerStravaSync(AppState.selectedBike?.id || null);

      //     if (res?.needsAuth && res?.authUrl) {
      //       showToast('Mengalihkan ke halaman login Strava OAuth...');
      //       window.location.href = res.authUrl;
      //       return;
      //     }

      //     const count = res?.syncedCount || 0;
      //     const km = res?.totalKmAdded || 0;
      //     if (count > 0) {
      //       showToast(`Strava Synced: +${count} aktivitas (+${formatKm(km)} km) masuk ke ${res.bikeName || 'sepeda'}!`);
      //     } else {
      //       showToast('Strava sudah sinkron — tidak ada aktivitas baru.');
      //     }
      //     await refreshAllData();
      //   } catch (err) {
      //     showToast(err.message || 'Gagal sinkronisasi Strava', 'error');
      //   } finally {
      //     btn.disabled = false;
      //     if (labelSpan) labelSpan.textContent = origLabel;
      //   }
      // };
    });

    const sheetsBtns = document.querySelectorAll('[data-action="backup-sheets"]');
    sheetsBtns.forEach(btn => {
      btn.onclick = async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        try {
          showToast('Mengirim snapshot ke Google Sheets...');
          const res = await TelemetryService.pushBackupToGoogleSheets();
          showToast(res.message || 'Backup snapshot berhasil disimpan ke Google Sheets!');
          await refreshAllData();
        } catch (err) {
          if (err.needsConfig) {
            openSheetsBackupModal();
          } else {
            showToast(err.message || 'Sheets sync failed', 'error');
          }
        } finally {
          btn.disabled = false;
        }
      };
    });

    const configSheetsBtns = document.querySelectorAll('[data-action="config-sheets"]');
    configSheetsBtns.forEach(btn => {
      btn.onclick = () => openSheetsBackupModal();
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
  openEditBikeModal,
  openDeleteBikeModal,
  openAddComponentModal,
  openSheetsBackupModal,
  openArchiveReplaceModal,
  openQuickResetModal,
  showToast,
  formatIDR,
  formatKm
};

function renderNavbarUserBadge(user) {
  let slot = document.getElementById('nav-auth-slot');
  if (!slot) {
    const syncBtn = document.querySelector('[data-action="sync-strava"]');
    if (syncBtn && syncBtn.parentElement) {
      slot = document.createElement('div');
      slot.id = 'nav-auth-slot';
      slot.className = 'flex items-center gap-2';
      syncBtn.parentElement.appendChild(slot);
    }
  }
  if (!slot) return;

  if (!user) {
    slot.innerHTML = `
      <a href="/login" class="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-container text-on-primary font-label-caps text-label-caps uppercase font-bold hover:bg-surface-tint transition-all">
        <span class="material-symbols-outlined text-[16px]">login</span>
        <span>Sign In</span>
      </a>
    `;
    return;
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Rider';
  const initials = displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  slot.innerHTML = `
    <div class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/25" title="${user.email || ''}">
      <span class="w-6 h-6 rounded-md bg-primary-container/20 text-primary-container font-label-caps text-[10px] font-bold flex items-center justify-center">${initials}</span>
      <span class="font-telemetry-data text-body-sm text-on-surface max-w-[130px] truncate">${displayName}</span>
    </div>
    <button id="btn-nav-signout" type="button" title="Sign Out"
      class="flex items-center gap-1 px-2.5 py-1.5 rounded bg-surface-container-high hover:bg-error-container/40 text-on-surface-variant hover:text-error transition-all">
      <span class="material-symbols-outlined text-[16px]">logout</span>
      <span class="hidden md:inline font-label-caps text-label-caps uppercase font-semibold">Sign Out</span>
    </button>
  `;

  document.getElementById('btn-nav-signout')?.addEventListener('click', async () => {
    try {
      await AuthService.signOut();
      window.location.replace('/login?signedout=1');
    } catch (err) {
      showToast(err.message || 'Gagal keluar dari sesi', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await AuthService.requireAuth({ redirectTo: '/login' });
  if (!user) return;

  AppState.currentUser = user;
  renderNavbarUserBadge(user);

  AuthService.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.replace('/login?signedout=1');
    }
  });

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