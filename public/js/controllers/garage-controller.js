// public/js/controllers/garage-controller.js
import { createPageController } from './app-controller.js';
import { t } from '../core/i18n.js';
import { summarizeBikeComponents } from '../domain/component-wear.js';
import {
  closeResponsiveModal,
  escapeHtml,
  openResponsiveModal,
  renderBikeCards,
  renderComponentWearList,
  setButtonLoading,
  showToast,
  updateAttentionBadge,
} from '../ui/ui-bindings.js';
import {
  deleteGearComponent,
  fetchGarageSnapshot,
  upsertBike,
  upsertGearComponent,
} from '../services/telemetry-service.js';

/**
 * @typedef {import('../types/models.js').Bike} Bike
 * @typedef {import('../types/models.js').GearComponent} GearComponent
 * @typedef {import('./app-controller.js').UserSession} UserSession
 */

/** @type {{ bikes: Bike[], components: GearComponent[], selectedBikeId: string }} */
const state = {
  bikes: [],
  components: [],
  selectedBikeId: '',
};

/**
 * @param {HTMLFormElement} form
 * @param {string} name
 * @param {string | number} value
 */
function setInputValue(form, name, value) {
  const field = /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
    form.elements.namedItem(name)
  );
  if (field) field.value = String(value);
}

function render() {
  if (!state.selectedBikeId && state.bikes.length > 0) {
    const firstActive = state.bikes.find((b) => !b.isArchived) ?? state.bikes[0];
    state.selectedBikeId = firstActive.id;
  }

  const bikeOptions = state.bikes
    .map(
      (b) =>
        `<option value="${escapeHtml(b.id)}" ${b.id === state.selectedBikeId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`
    )
    .join('');

  ['filter-garage-bike', 'comp-bike'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = bikeOptions;
  });

  renderBikeCards(state.bikes, state.selectedBikeId);

  const activeBike = state.bikes.find((b) => b.id === state.selectedBikeId);
  const bikeComps = state.components.filter((c) => c.bikeId === state.selectedBikeId);
  const summary = summarizeBikeComponents(bikeComps, Number(activeBike?.totalOdometerKm) || 0);

  updateAttentionBadge(summary.attentionCount);
  renderComponentWearList(summary.items);
}

/** @param {Bike | null} [bike] */
function openBikeForm(bike = null) {
  const form = /** @type {HTMLFormElement | null} */ (document.getElementById('form-bike'));
  if (!form) return;

  form.reset();
  setInputValue(form, 'id', bike?.id ?? '');
  setInputValue(form, 'name', bike?.name ?? '');
  setInputValue(form, 'brandModel', bike?.brandModel ?? '');
  setInputValue(form, 'totalOdometerKm', bike?.totalOdometerKm ?? 0);

  const archiveCheckbox = /** @type {HTMLInputElement | null} */ (
    form.elements.namedItem('isArchived')
  );
  if (archiveCheckbox) archiveCheckbox.checked = Boolean(bike?.isArchived);

  openResponsiveModal('modal-bike');
}

/** @param {GearComponent | null} [comp] */
function openComponentForm(comp = null) {
  const form = /** @type {HTMLFormElement | null} */ (document.getElementById('form-component'));
  if (!form) return;

  form.reset();
  const activeBike = state.bikes.find((b) => b.id === state.selectedBikeId);
  setInputValue(form, 'id', comp?.id ?? '');
  setInputValue(form, 'bikeId', comp?.bikeId ?? state.selectedBikeId);
  setInputValue(form, 'name', comp?.name ?? '');
  setInputValue(form, 'category', comp?.category ?? 'Drivetrain');
  setInputValue(form, 'installedOdometerKm', comp?.installedOdometerKm ?? (activeBike?.totalOdometerKm || 0));
  setInputValue(form, 'lifespanKm', comp?.lifespanKm ?? 3000);

  openResponsiveModal('modal-component');
}

/** @param {{ session: UserSession }} ctx */
function bindEvents({ session }) {
  document.getElementById('filter-garage-bike')?.addEventListener('change', (e) => {
    const select = /** @type {HTMLSelectElement | null} */ (e.target);
    if (!select) return;
    state.selectedBikeId = select.value;
    render();
  });

  document.getElementById('btn-open-bike-modal')?.addEventListener('click', () => openBikeForm());
  document.getElementById('btn-open-component-modal')?.addEventListener('click', () => openComponentForm());

  document.getElementById('bike-list')?.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (!target) return;

    const editBtn = /** @type {HTMLElement | null} */ (target.closest('[data-action="edit-bike"]'));
    if (editBtn?.dataset.id) {
      const bike = state.bikes.find((b) => b.id === editBtn.dataset.id);
      if (bike) openBikeForm(bike);
      return;
    }

    const card = /** @type {HTMLElement | null} */ (target.closest('[data-bike-id]'));
    if (card?.dataset.bikeId) {
      state.selectedBikeId = card.dataset.bikeId;
      render();
    }
  });

  document.getElementById('component-wear-list')?.addEventListener('click', async (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    const btn = /** @type {HTMLElement | null} */ (target?.closest('[data-action]'));
    if (!btn) return;

    const { action, id } = btn.dataset;
    if (!id) return;

    if (action === 'edit-component') {
      const comp = state.components.find((c) => c.id === id);
      if (comp) openComponentForm(comp);
    } else if (action === 'delete-component' && window.confirm(t('common.confirm_delete'))) {
      try {
        await deleteGearComponent(id);
        showToast(t('common.deleted_success'), 'success');
        await loadData({ session });
        render();
      } catch {
        showToast(t('common.error_generic'), 'error');
      }
    }
  });

  document.getElementById('form-bike')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.currentTarget);
    const btn = document.getElementById('btn-save-bike');
    const fd = new FormData(form);

    setButtonLoading(btn, true, 'common.save');
    try {
      await upsertBike(session.user.id, {
        id: String(fd.get('id') || '') || undefined,
        name: String(fd.get('name') || '').trim(),
        brandModel: String(fd.get('brandModel') || '').trim(),
        totalOdometerKm: Number(fd.get('totalOdometerKm') || 0),
        isArchived: fd.get('isArchived') === 'on',
      });
      closeResponsiveModal('modal-bike');
      showToast(t('common.saved_success'), 'success');
      await loadData({ session });
      render();
    } catch {
      showToast(t('common.error_generic'), 'error');
    } finally {
      setButtonLoading(btn, false, 'common.save');
    }
  });

  document.getElementById('form-component')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.currentTarget);
    const btn = document.getElementById('btn-save-component');
    const fd = new FormData(form);

    setButtonLoading(btn, true, 'common.save');
    try {
      await upsertGearComponent(session.user.id, {
        id: String(fd.get('id') || '') || undefined,
        bikeId: String(fd.get('bikeId') || ''),
        name: String(fd.get('name') || '').trim(),
        category: String(fd.get('category') || 'Service'),
        installedOdometerKm: Number(fd.get('installedOdometerKm') || 0),
        lifespanKm: Number(fd.get('lifespanKm') || 3000),
      });
      closeResponsiveModal('modal-component');
      showToast(t('common.saved_success'), 'success');
      await loadData({ session });
      render();
    } catch {
      showToast(t('common.error_generic'), 'error');
    } finally {
      setButtonLoading(btn, false, 'common.save');
    }
  });
}

/** @param {{ session: UserSession }} ctx */
async function loadData({ session }) {
  const snapshot = await fetchGarageSnapshot(session.user.id);
  state.bikes = snapshot.bikes ?? [];
  state.components = snapshot.components ?? [];
}

createPageController({ bindEvents, loadData, onRender: render });
