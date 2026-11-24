// Global UI action bindings so HTML stays declarative without inline event handlers

function bindAction(selector, handler) {
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener("click", handler);
  });
}

bindAction('[data-action="open-add-component"]', () => {
  window.GearTrackUI?.openAddComponentModal?.();
});

bindAction('[data-action="open-add-bike"]', () => {
  window.GearTrackUI?.openAddBikeModal?.();
});
