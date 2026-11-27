import { createLocationController } from './location-controller.js';
import { readSavedLocation, saveLocation } from './location-data.js';
import { googleMapProvider, onMapsAuthError } from './google-maps.js';
import { showFieldError, validateField } from './entry-validation.js';
import { LOCATION_MODE } from './location-mode.js';
import { mountDemoLocationView } from './demo-location-view.js';

export function mountLocationView(root, { onConfirm }) {
  if(LOCATION_MODE==='demo')return mountDemoLocationView(root,{onConfirm});
  const host = root.querySelector('.entry-google-map'), panel = root.querySelector('.entry-map');
  const submit = root.querySelector('[type=submit]'), reset = root.querySelector('[data-action=reset-location]');
  const message = root.querySelector('.entry-map-message'), status = root.querySelector('.entry-map-state');
  const retry = root.querySelector('[data-action=retry-location]'), tools = root.querySelector('.entry-map-tools');
  const search = root.querySelector('[name=location-search]'), address = root.querySelector('.entry-map-address');
  const marker = root.querySelector('.entry-map-marker');
  let map, controller, disposed = false, confirming = false;
  const listeners = [];
  const center = () => { const point = map?.getCenter(); return point ? {lat:point.lat(),lng:point.lng()} : null; };
  function update(value) {
    if (disposed) return;
    panel.dataset.status = value.status; panel.dataset.mode = value.mode;
    if (value.error) panel.dataset.error = value.error; else delete panel.dataset.error;
    panel.setAttribute('aria-busy', String(['loading-map','locating','resolving','saving'].includes(value.status)));
    submit.disabled = !value.canConfirm; submit.textContent = value.status === 'saving' ? '위치를 저장하고 있어요…' : '좋아요';
    reset.disabled = ['loading-map','map-error','saving','confirmed'].includes(value.status);
    tools.hidden = (value.mode !== 'manual' && value.status !== 'gps-error') || ['map-error','loading-map','saving','confirmed'].includes(value.status);
    retry.hidden = !['gps-error','geocode-error','map-error'].includes(value.status);
    message.textContent = value.message;
    status.hidden = !value.message;
    address.hidden = !value.location?.address; address.textContent = value.location?.address ?? ''; address.title = address.textContent;
    if (value.error === 'SEARCH_FAILED') showFieldError(search, value.message);
    else if (value.status === 'ready') showFieldError(search, '');
    marker.hidden = !value.center;
    if (value.center && controller?.provider && !map && value.status !== 'map-error') {
      try {
        map = controller.provider.createMap(host, value.center);
        listeners.push(map.addListener('center_changed', () => controller.previewManualCenter(center())));
        listeners.push(map.addListener('idle', () => controller.settleManualCenter(center())));
      } catch { controller.failMap(); return; }
    }
    if (map) {
      const current = center();
      if (value.center && (!current || Math.abs(current.lat-value.center.lat)>1e-7 || Math.abs(current.lng-value.center.lng)>1e-7)) map.setCenter(value.center);
      const manual = value.mode === 'manual' && !['saving','confirmed'].includes(value.status);
      map.setOptions({ gestureHandling: manual ? 'greedy' : 'none', keyboardShortcuts: manual, draggable: manual, scrollwheel: manual });
    }
  }
  controller = createLocationController({
    loadProvider: () => googleMapProvider(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
    geolocation: navigator.geolocation, onChange: update, save: saveLocation, restore: readSavedLocation,
  });
  const unsubscribeAuth = onMapsAuthError(() => controller.failMap());
  function searchLocation() { if (validateField(search, { required: true })) void controller.search(search.value); }
  function click(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'reset-location') { controller.beginManual(); search.focus({preventScroll:true}); }
    else if (action === 'search-location') searchLocation();
    else if (action === 'current-location') controller.startGPS();
    else if (action === 'retry-location') {
      if (controller.snapshot.error === 'MAP_AUTH_FAILED') window.location.reload();
      else void controller.retry();
    }
  }
  function key(event) {
    if (event.target === search && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); searchLocation(); }
  }
  root.addEventListener('click', click); root.addEventListener('keydown', key);
  const observer = new ResizeObserver(() => {
    if (map && controller.snapshot.center) map.setCenter(controller.snapshot.center);
  });
  observer.observe(panel);
  void controller.start();
  return {
    async confirm() {
      if (confirming || disposed) return;
      confirming = true;
      try { const selected = await controller.confirm(); if (selected && !disposed) await onConfirm(selected); }
      finally { confirming = false; }
    },
    dispose() {
      if (disposed) return; disposed = true;
      controller.dispose(); observer.disconnect(); unsubscribeAuth();
      listeners.forEach(listener => listener.remove());
      root.removeEventListener('click',click); root.removeEventListener('keydown',key);
    },
  };
}
