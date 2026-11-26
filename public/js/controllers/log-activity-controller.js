// public/js/controllers/log-activity-controller.js
import { createPageController } from './app-controller.js';
import { t } from '../core/i18n.js';
import { escapeHtml, setButtonLoading, showToast } from '../ui/ui-bindings.js';
import { createActivityLog, createLedgerEntry, fetchUserBikes } from '../services/telemetry-service.js';
import { parseActivityFile } from '../domain/activity-file-parser.js';

/**
 * @typedef {import('../types/models.js').Bike} Bike
 * @typedef {import('./app-controller.js').UserSession} UserSession
 * @typedef {'ride' | 'maintenance'} LogTabMode
 */

/** @type {{ activeTab: LogTabMode, bikes: Bike[] }} */
const state = {
  activeTab: 'ride',
  bikes: [],
};

function render() {
  document.querySelectorAll('[data-log-tab]').forEach((btn) => {
    const active = btn.getAttribute('data-log-tab') === state.activeTab;
    btn.className = `rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
      active ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
    }`;
  });

  document.getElementById('panel-log-ride')?.classList.toggle('hidden', state.activeTab !== 'ride');
  document
    .getElementById('panel-log-maintenance')
    ?.classList.toggle('hidden', state.activeTab !== 'maintenance');

  const optionsHtml = state.bikes
    .filter((b) => !b.isArchived)
    .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
    .join('');

  ['ride-bike', 'maint-bike'].forEach((selectId) => {
    const el = document.getElementById(selectId);
    if (el) el.innerHTML = optionsHtml;
  });
}

/**
 * Mengisi input di dalam #form-log-ride berdasarkan atribut `name` yang dipakai FormData.
 * @param {HTMLFormElement} form
 * @param {string} fieldName
 * @param {string} value
 */
function setFormFieldValue(form, fieldName, value) {
  const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (
    form.elements.namedItem(fieldName)
  );
  if (el && value !== '') {
    el.value = value;
  }
}

/** @param {{ session: UserSession }} ctx */
function bindEvents({ session }) {
  const today = new Date().toISOString().slice(0, 10);
  ['ride-date', 'maint-date'].forEach((id) => {
    const input = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
    if (input && !input.value) input.value = today;
  });

  document.querySelectorAll('[data-log-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = /** @type {LogTabMode | null} */ (btn.getAttribute('data-log-tab'));
      state.activeTab = tab ?? 'ride';
      render();
    });
  });

  const rideForm = /** @type {HTMLFormElement | null} */ (document.getElementById('form-log-ride'));
  const fileInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('activity-file-input')
  );
  const fileStatus = document.getElementById('activity-file-status');
  const defaultFileStatusText =
    fileStatus?.textContent ||
    'Pilih file dari bike computer (iGPSPORT / Garmin / Strava) untuk mengisi form otomatis';

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file || !rideForm) return;

    if (fileStatus) {
      fileStatus.textContent = `Membaca ${file.name}...`;
      fileStatus.className = 'text-xs text-amber-400';
    }

    try {
      const parsed = await parseActivityFile(file);

      if (parsed.title) setFormFieldValue(rideForm, 'title', parsed.title);
      if (parsed.date) setFormFieldValue(rideForm, 'date', parsed.date);
      if (parsed.distanceKm > 0) setFormFieldValue(rideForm, 'distanceKm', String(parsed.distanceKm));
      if (parsed.durationMinutes > 0) {
        setFormFieldValue(rideForm, 'durationMinutes', String(parsed.durationMinutes));
      }
      if (parsed.elevationGainM > 0) {
        setFormFieldValue(rideForm, 'elevationGainM', String(parsed.elevationGainM));
      }

      const notesEl = /** @type {HTMLTextAreaElement | null} */ (
        rideForm.elements.namedItem('notes')
      );
      if (notesEl && !notesEl.value.trim() && parsed.notes) {
        notesEl.value = parsed.notes;
      }

      if (fileStatus) {
        fileStatus.textContent = `Berhasil memuat ${file.name} (${parsed.distanceKm} km, ${parsed.durationMinutes} mnt).`;
        fileStatus.className = 'text-xs text-emerald-400';
      }
      showToast(`Telemetri ${file.name} berhasil dimuat.`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal membaca file telemetri.';
      if (fileStatus) {
        fileStatus.textContent = message;
        fileStatus.className = 'text-xs text-rose-400';
      }
      showToast(message, 'error');
    }
  });

  rideForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = /** @type {HTMLFormElement} */ (event.currentTarget);
    const btn = document.getElementById('btn-submit-ride');
    const fd = new FormData(form);

    setButtonLoading(btn, true, 'log.submit_ride');
    try {
      await createActivityLog(session.user.id, {
        bikeId: String(fd.get('bikeId') || ''),
        date: String(fd.get('date') || today),
        title: String(fd.get('title') || '').trim(),
        distanceKm: Number(fd.get('distanceKm') || 0),
        durationMinutes: Number(fd.get('durationMinutes') || 0),
        elevationGainM: Number(fd.get('elevationGainM') || 0),
        notes: String(fd.get('notes') || '').trim(),
      });
      showToast(t('common.saved_success'), 'success');
      form.reset();
      if (fileInput) fileInput.value = '';
      if (fileStatus) {
        fileStatus.textContent = defaultFileStatusText;
        fileStatus.className = 'text-xs text-slate-400';
      }
      const rideDateInput = /** @type {HTMLInputElement | null} */ (
        document.getElementById('ride-date')
      );
      if (rideDateInput) rideDateInput.value = today;
    } catch {
      showToast(t('common.error_generic'), 'error');
    } finally {
      setButtonLoading(btn, false, 'log.submit_ride');
    }
  });

  document.getElementById('form-log-maintenance')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = /** @type {HTMLFormElement} */ (event.currentTarget);
    const btn = document.getElementById('btn-submit-maint');
    const fd = new FormData(form);
    const rawDist = fd.get('distanceKm');

    setButtonLoading(btn, true, 'log.submit_maint');
    try {
      await createLedgerEntry(session.user.id, {
        bikeId: String(fd.get('bikeId') || ''),
        date: String(fd.get('date') || today),
        title: String(fd.get('title') || '').trim(),
        category: String(fd.get('category') || 'Service'),
        cost: Number(fd.get('cost') || 0),
        distanceKm: rawDist !== null && rawDist !== '' ? Number(rawDist) : null,
      });
      showToast(t('common.saved_success'), 'success');
      form.reset();
      const maintDateInput = /** @type {HTMLInputElement | null} */ (
        document.getElementById('maint-date')
      );
      if (maintDateInput) maintDateInput.value = today;
    } catch {
      showToast(t('common.error_generic'), 'error');
    } finally {
      setButtonLoading(btn, false, 'log.submit_maint');
    }
  });
}

/** @param {{ session: UserSession }} ctx */
async function loadData({ session }) {
  state.bikes = (await fetchUserBikes(session.user.id)) ?? [];
}

createPageController({ bindEvents, loadData, onRender: render });