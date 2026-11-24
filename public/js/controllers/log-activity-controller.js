// frontend/js/controllers/log-activity-controller.js
import { TelemetryService } from '../services/telemetry-service.js';
import { parseActivityFile, formatLocalDateTimeInput } from '../services/activity-file-parser.js';

document.addEventListener('DOMContentLoaded', () => {
  const rideForm = document.getElementById('form-manual-ride');
  const maintForm = document.getElementById('form-maintenance-entry');
  const btnRide = document.getElementById('btn-mode-ride');
  const btnService = document.getElementById('btn-mode-service');
  const dateInput = document.getElementById('ride-date-input');

  const fileInput = document.getElementById('activity-file-input');
  const dropzone = document.getElementById('activity-file-dropzone');
  const btnChooseFile = document.getElementById('btn-choose-activity-file');
  const btnClearFile = document.getElementById('btn-clear-activity-file');
  const fileStatusEl = document.getElementById('activity-file-status');
  const fileWarningsEl = document.getElementById('activity-file-warnings');

  let importedFileMeta = null;

  const resetDateDefault = () => {
    if (dateInput) {
      dateInput.value = formatLocalDateTimeInput(new Date());
    }
  };

  const renderWarnings = (warnings = []) => {
    if (!fileWarningsEl) return;
    if (!warnings.length) {
      fileWarningsEl.classList.add('hidden');
      fileWarningsEl.innerHTML = '';
      return;
    }
    fileWarningsEl.classList.remove('hidden');
    fileWarningsEl.innerHTML = warnings
      .map((w) => `<div>• ${w}</div>`)
      .join('');
  };

  const resetImportedFileState = () => {
    importedFileMeta = null;
    if (fileInput) fileInput.value = '';
    if (btnClearFile) btnClearFile.classList.add('hidden');
    if (fileStatusEl) {
      fileStatusEl.textContent =
        'Pilih atau seret file .gpx / .fit dari iGPSPORT atau Garmin untuk mengisi form otomatis.';
    }
    renderWarnings([]);
  };

  const handleSelectedFile = async (file) => {
    if (!file || !rideForm) return;

    if (fileStatusEl) {
      fileStatusEl.textContent = `Membaca ${file.name}...`;
    }
    renderWarnings([]);

    try {
      const parsed = await parseActivityFile(file);
      importedFileMeta = {
        sourceFormat: parsed.sourceFormat,
        fileName: parsed.fileName,
        movingSeconds: parsed.movingSeconds
      };

      const titleInput = rideForm.querySelector('[name="title"]');
      const distanceInput = rideForm.querySelector('[name="distance_km"]');
      const rideTypeSelect = rideForm.querySelector('[name="ride_type"]');
      const movingMinInput = rideForm.querySelector('[name="moving_time_min"]');
      const elevationInput = rideForm.querySelector('[name="elevation_gain_m"]');

      if (titleInput && parsed.title) {
        titleInput.value = parsed.title;
      }
      if (distanceInput && Number.isFinite(parsed.distanceKm)) {
        distanceInput.value = parsed.distanceKm.toFixed(2);
      }
      if (rideTypeSelect && parsed.rideType) {
        const hasOption = Array.from(rideTypeSelect.options).some(
          (opt) => opt.value === parsed.rideType
        );
        if (hasOption) {
          rideTypeSelect.value = parsed.rideType;
        }
      }
      if (dateInput && parsed.dateTimeLocal) {
        dateInput.value = parsed.dateTimeLocal;
      }
      if (movingMinInput && Number.isFinite(parsed.movingMinutes)) {
        movingMinInput.value = String(parsed.movingMinutes);
      }
      if (elevationInput && Number.isFinite(parsed.elevationGainM)) {
        elevationInput.value = String(parsed.elevationGainM);
      }

      if (btnClearFile) btnClearFile.classList.remove('hidden');
      if (fileStatusEl) {
        const durLabel =
          parsed.movingMinutes > 0 ? ` • ${parsed.movingMinutes} min` : '';
        fileStatusEl.textContent = `Terbaca (${parsed.sourceFormat.toUpperCase()}): ${parsed.fileName} (${parsed.distanceKm.toFixed(2)} km${durLabel})`;
      }
      renderWarnings(parsed.warnings);

      window.GearTrackUI?.showToast(
        `Data dari ${file.name} berhasil diisikan ke form.`
      );
    } catch (err) {
      resetImportedFileState();
      if (fileStatusEl) {
        fileStatusEl.textContent = `Gagal membaca file: ${err.message || 'Format tidak valid'}`;
      }
      window.GearTrackUI?.showToast(
        err.message || 'Gagal memproses file .gpx / .fit',
        'error'
      );
    }
  };

  resetDateDefault();

  btnChooseFile?.addEventListener('click', () => fileInput?.click());
  btnClearFile?.addEventListener('click', () => {
    resetImportedFileState();
    window.GearTrackUI?.showToast('File impor direset.');
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleSelectedFile(file);
  });

  if (dropzone) {
    ['dragenter', 'dragover'].forEach((evtName) => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('border-secondary', 'bg-surface-container-high/40');
      });
    });

    ['dragleave', 'drop'].forEach((evtName) => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-secondary', 'bg-surface-container-high/40');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const droppedFile = e.dataTransfer?.files?.[0];
      if (droppedFile) handleSelectedFile(droppedFile);
    });
  }

  btnRide?.addEventListener('click', () => {
    rideForm?.classList.remove('hidden');
    maintForm?.classList.add('hidden');
    btnRide.className = 'px-4 py-2 rounded-lg bg-surface-container-high text-primary-container font-label-caps text-label-caps uppercase font-bold';
    btnService.className = 'px-4 py-2 rounded-lg text-on-surface-variant font-label-caps text-label-caps uppercase font-bold';
  });

  btnService?.addEventListener('click', () => {
    rideForm?.classList.add('hidden');
    maintForm?.classList.remove('hidden');
    btnService.className = 'px-4 py-2 rounded-lg bg-surface-container-high text-primary-container font-label-caps text-label-caps uppercase font-bold';
    btnRide.className = 'px-4 py-2 rounded-lg text-on-surface-variant font-label-caps text-label-caps uppercase font-bold';
  });

  rideForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(rideForm);
    const movingMinVal = Number(fd.get('moving_time_min')) || 0;
    const rawNotes = String(fd.get('notes') || '').trim();
    const metaParts = [];

    if (importedFileMeta) {
      metaParts.push(`${importedFileMeta.sourceFormat.toUpperCase()}: ${importedFileMeta.fileName}`);
    }
    if (movingMinVal > 0) {
      metaParts.push(`Moving Time: ${movingMinVal} min`);
    }

    const metaNote = metaParts.length ? `[${metaParts.join(' • ')}]` : '';
    const mergedNotes = [rawNotes, metaNote].filter(Boolean).join(' ');

    const payload = {
      bike_id: fd.get('bike_id'),
      title: String(fd.get('title') || '').trim(),
      distance_km: Number(fd.get('distance_km')),
      ride_type: fd.get('ride_type'),
      ride_date: new Date(fd.get('ride_date')).toISOString(),
      elevation_gain_m: Number(fd.get('elevation_gain_m')) || 0,
      source: importedFileMeta?.sourceFormat || 'manual',
      notes: mergedNotes
    };

    try {
      await TelemetryService.logRide(payload);
      window.GearTrackUI.showToast('Ride berhasil dicatat & odometer diperbarui!');
      rideForm.reset();
      resetImportedFileState();
      resetDateDefault();
      await window.GearTrackUI.refreshAllData();
    } catch (err) {
      window.GearTrackUI.showToast(err.message, 'error');
    }
  });

  maintForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(maintForm);
    const compId = fd.get('component_id');
    const comp = window.GearTrackUI.AppState.activeComps.find(c => c.id === compId);
    if (!comp) return;

    try {
      if (fd.get('action_type') === 'replace') {
        await TelemetryService.archiveAndReplaceComponent({
          oldComponentId: comp.id,
          retirementReason: fd.get('notes') || 'Replaced via Workshop Log',
          retirementBadge: 'Normal Wear',
          newComponentName: fd.get('title'),
          newMaxLifespanKm: comp.max_lifespan_km,
          newMaxLifespanMonths: comp.max_lifespan_months,
          newCostIdr: fd.get('cost_idr'),
          serviceDate: new Date().toISOString(),
          workshopName: fd.get('workshop_name'),
          notes: fd.get('notes')
        });
        window.GearTrackUI.showToast('Komponen lama diarsipkan & komponen baru aktif!');
      } else {
        await TelemetryService.resetComponentInterval({
          bikeId: comp.bike_id,
          componentId: comp.id,
          componentName: comp.name,
          serviceTitle: fd.get('title'),
          odometerKm: window.GearTrackUI.AppState.selectedBike?.odometer_km || 0,
          costIdr: fd.get('cost_idr'),
          workshopName: fd.get('workshop_name'),
          notes: fd.get('notes')
        });
        window.GearTrackUI.showToast('Interval perawatan komponen berhasil di-reset!');
      }
      maintForm.reset();
      await window.GearTrackUI.refreshAllData();
    } catch (err) {
      window.GearTrackUI.showToast(err.message, 'error');
    }
  });
});

window.addEventListener('telemetry:updated', (e) => {
  const { AppState } = e.detail;
  const bikeSel = document.getElementById('ride-bike-select');
  if (bikeSel) {
    bikeSel.innerHTML = AppState.bikes
      .map(b => `<option value="${b.id}" ${b.id === AppState.selectedBike?.id ? 'selected' : ''}>${b.name} (${b.odometer_km} km)</option>`)
      .join('');
  }

  const compSel = document.getElementById('maint-comp-select');
  if (compSel) {
    compSel.innerHTML = AppState.activeComps
      .map(c => `<option value="${c.id}">${c.name} [${c.effective_wear_pct}% wear]</option>`)
      .join('');
  }
});