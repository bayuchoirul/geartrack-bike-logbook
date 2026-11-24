// frontend/js/controllers/log-activity-controller.js
import { TelemetryService } from '../services/telemetry-service.js';

document.addEventListener('DOMContentLoaded', () => {
  const rideForm = document.getElementById('form-manual-ride');
  const maintForm = document.getElementById('form-maintenance-entry');
  const btnRide = document.getElementById('btn-mode-ride');
  const btnService = document.getElementById('btn-mode-service');
  const dateInput = document.getElementById('ride-date-input');

  if (dateInput) {
    dateInput.value = new Date().toISOString().slice(0, 16);
  }

  btnRide?.addEventListener('click', () => {
    rideForm.classList.remove('hidden');
    maintForm.classList.add('hidden');
    btnRide.className = 'px-4 py-2 rounded-lg bg-surface-container-high text-primary-container font-label-caps text-label-caps uppercase font-bold';
    btnService.className = 'px-4 py-2 rounded-lg text-on-surface-variant font-label-caps text-label-caps uppercase font-bold';
  });

  btnService?.addEventListener('click', () => {
    rideForm.classList.add('hidden');
    maintForm.classList.remove('hidden');
    btnService.className = 'px-4 py-2 rounded-lg bg-surface-container-high text-primary-container font-label-caps text-label-caps uppercase font-bold';
    btnRide.className = 'px-4 py-2 rounded-lg text-on-surface-variant font-label-caps text-label-caps uppercase font-bold';
  });

  rideForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(rideForm);
    try {
      await TelemetryService.logRide({
        bike_id: fd.get('bike_id'),
        title: fd.get('title'),
        distance_km: Number(fd.get('distance_km')),
        ride_type: fd.get('ride_type'),
        ride_date: new Date(fd.get('ride_date')).toISOString(),
        elevation_gain_m: Number(fd.get('elevation_gain_m')) || 0,
        source: 'manual',
        notes: fd.get('notes')
      });
      window.GearTrackUI.showToast('Ride berhasil dicatat & odometer diperbarui!');
      rideForm.reset();
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 16);
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
