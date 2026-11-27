import { copyLocation, validCoordinates, validLocation } from './location-data.js';

const same = (a, b) => a && b && Math.abs(a.lat - b.lat) < 0.0000001 && Math.abs(a.lng - b.lng) < 0.0000001;
const positionOf = value => ({ lat: typeof value.lat === 'function' ? value.lat() : value.lat, lng: typeof value.lng === 'function' ? value.lng() : value.lng });
function limited(promise, ms = 15000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('TIMEOUT')), ms); })]).finally(() => clearTimeout(timer));
}

// Provider and device APIs are injected for deterministic error/race testing.
// Production always supplies Google Maps and navigator.geolocation.
export function createLocationController({ loadProvider, geolocation, onChange, save, restore = () => null, debounce = 500 }) {
  const model = { status: 'loading-map', mode: 'gps', center: null, location: null, message: '지도를 불러오고 있어요…', error: null };
  let provider, disposed = false, watchId = null, watchRevision = 0, revision = 0, timer, starting = false, lastSearch = '';
  const snapshot = () => ({ ...model, center: model.center ? { ...model.center } : null, location: copyLocation(model.location), canConfirm: model.status === 'ready' || model.status === 'save-error' });
  function emit() { if (!disposed) onChange(snapshot()); }
  function cancel() { revision++; clearTimeout(timer); }
  function stopGPS() { watchRevision++; if (watchId !== null) geolocation?.clearWatch(watchId); watchId = null; }
  function fail(status, message, error) { model.status = status; model.message = message; model.error = error; emit(); }
  function resolved(result, center, source, accuracy) {
    const first = result.results?.find(item => item.formatted_address?.trim());
    if (!first) throw new Error('ZERO_RESULTS');
    return { ...center, address: first.formatted_address, placeId: first.place_id ?? '', source, accuracy: accuracy ?? null, confirmedAt: null };
  }
  async function resolveCenter() {
    if (disposed || !provider || !validCoordinates(model.center)) return;
    const request = ++revision, center = { ...model.center }, source = model.mode === 'gps' ? 'gps' : 'manual', accuracy = model.accuracy;
    model.status = 'resolving'; model.location = null; model.message = '주소를 확인하고 있어요…'; model.error = null; emit();
    try {
      const result = await limited(provider.geocode({ location: center }));
      if (disposed || request !== revision) return;
      model.location = resolved(result, center, source, accuracy);
      model.status = 'ready'; model.message = ''; emit();
    } catch {
      if (!disposed && request === revision) fail('geocode-error', '주소를 확인하지 못했어요. 지도를 옮기거나 다시 시도해 주세요.', 'GEOCODING_FAILED');
    }
  }
  function setCenter(center, accuracy = null) {
    if (!validCoordinates(center) || disposed || ['saving', 'confirmed'].includes(model.status)) return false;
    if (same(center, model.center) && validLocation(model.location)) return false;
    cancel(); model.center = { lat: center.lat, lng: center.lng }; model.accuracy = accuracy;
    model.location = null; model.status = 'resolving'; model.message = '주소를 확인하고 있어요…'; model.error = null; emit();
    return model.status !== 'map-error';
  }
  function scheduleResolve() { clearTimeout(timer); timer = setTimeout(() => { void resolveCenter(); }, debounce); }
  function beginManual() {
    if (disposed || ['saving', 'confirmed'].includes(model.status)) return;
    if (model.mode !== 'manual') {
      stopGPS(); cancel(); model.mode = 'manual';
      if (model.center && !validLocation(model.location)) scheduleResolve();
    }
    emit();
  }
  function startGPS() {
    if (disposed || !provider || ['saving', 'confirmed'].includes(model.status)) return;
    stopGPS(); cancel(); model.mode = 'gps'; model.location = null; model.status = 'locating'; model.message = '현재 위치를 확인하고 있어요…'; model.error = null; emit();
    const session = watchRevision;
    const failure = error => {
      if (disposed || session !== watchRevision || model.mode !== 'gps') return;
      cancel(); model.location = null;
      // Keep the watch after transient POSITION_UNAVAILABLE/TIMEOUT errors;
      // its next fix must still be accepted. Permission denial is terminal.
      if (error?.code === 1) {
        stopGPS(); model.mode = 'manual';
        const saved = restore();
        if (!model.center && validCoordinates(saved)) setCenter(saved);
      }
      fail('gps-error', error?.code === 1 ? '위치 접근이 허용되지 않았어요. 주소 검색으로 동네를 선택해 주세요.' : '현재 위치를 찾지 못했어요. 주소를 검색하거나 다시 시도해 주세요.', error?.code === 1 ? 'PERMISSION_DENIED' : 'GPS_FAILED');
      if (error?.code === 1 && validCoordinates(model.center)) scheduleResolve();
    };
    if (!geolocation) { failure({ code: 2 }); return; }
    try {
      const nextWatch = geolocation.watchPosition(position => {
        if (disposed || session !== watchRevision || model.mode !== 'gps') return;
        const center = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!validCoordinates(center)) { failure({ code: 2 }); return; }
        if (setCenter(center, position.coords.accuracy)) scheduleResolve();
      }, failure, { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 });
      if (session === watchRevision) watchId = nextWatch; else geolocation.clearWatch(nextWatch);
    } catch { failure({ code: 2 }); }
  }
  async function start() {
    if (disposed || starting) return;
    starting = true; model.status = 'loading-map'; model.message = '지도를 불러오고 있어요…'; model.error = null; emit();
    try { restore(); provider = await limited(loadProvider(), 20000); if (!disposed) startGPS(); }
    catch (error) { if (!disposed) fail('map-error', '지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', error?.message === 'MISSING_API_KEY' ? 'MISSING_API_KEY' : 'MAP_LOAD_FAILED'); }
    finally { starting = false; }
  }
  async function search(query) {
    if (!provider || !query.trim() || disposed || ['saving', 'confirmed'].includes(model.status)) return;
    beginManual(); cancel(); const request = revision; lastSearch = query.trim();
    model.status = 'resolving'; model.location = null; model.message = '주소를 검색하고 있어요…'; model.error = null; emit();
    try {
      const result = await limited(provider.geocode({ address: query.trim(), region: 'kr' }));
      if (disposed || request !== revision) return;
      const point = result.results?.[0]?.geometry?.location;
      const center = point ? positionOf(point) : null;
      if (!validCoordinates(center)) throw new Error('ZERO_RESULTS');
      model.center = center; model.location = resolved(result, center, 'manual');
      model.status = 'ready'; model.message = ''; emit();
    } catch { if (!disposed && request === revision) fail('geocode-error', '주소를 찾지 못했어요. 동 이름이나 도로명으로 다시 검색해 주세요.', 'SEARCH_FAILED'); }
  }
  return {
    get snapshot() { return snapshot(); },
    get provider() { return provider; },
    start, startGPS, beginManual, search,
    previewManualCenter(center) {
      if (model.mode !== 'manual') return;
      if (same(center, model.center)) return;
      setCenter(center);
    },
    settleManualCenter(center) {
      if (model.mode !== 'manual' || disposed || ['saving', 'confirmed'].includes(model.status)) return;
      if (same(center, model.center) && validLocation(model.location)) return;
      setCenter(center); if (validCoordinates(model.center)) scheduleResolve();
    },
    retry() { if (model.status === 'map-error') return start(); if (model.error === 'SEARCH_FAILED') return search(lastSearch); if (model.status === 'geocode-error' && model.center) return resolveCenter(); return startGPS(); },
    failMap() { stopGPS(); cancel(); model.location = null; fail('map-error', '지도를 사용할 수 없어요. 잠시 후 다시 시도해 주세요.', 'MAP_AUTH_FAILED'); },
    async confirm() {
      if (disposed || !snapshot().canConfirm || !validLocation(model.location)) return null;
      stopGPS(); cancel(); const selected = copyLocation({ ...model.location, confirmedAt: new Date().toISOString() });
      model.status = 'saving'; model.message = '위치를 저장하고 있어요…'; emit();
      try {
        await save(selected);
        if (disposed) return null;
        model.status = 'confirmed'; model.location = selected; model.message = ''; emit(); return selected;
      } catch { if (!disposed) { model.mode = 'manual'; fail('save-error', '위치를 저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 눌러 주세요.', 'STORAGE_FAILED'); } return null; }
    },
    dispose() { if (disposed) return; disposed = true; stopGPS(); cancel(); },
  };
}
