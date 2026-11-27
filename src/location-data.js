export const LOCATION_STORAGE_KEY = 'meet-join.location.v1';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function validCoordinates(value) {
  return Boolean(value && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90
    && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180);
}
export function validLocation(value) {
  return validCoordinates(value) && typeof value.address === 'string' && Boolean(value.address.trim());
}
export function copyLocation(value) {
  if (!validLocation(value)) return null;
  return {
    lat: value.lat, lng: value.lng, address: value.address.trim(),
    placeId: typeof value.placeId === 'string' ? value.placeId : '',
    source: value.source === 'gps' ? 'gps' : 'manual',
    accuracy: Number.isFinite(value.accuracy) && value.accuracy >= 0 ? value.accuracy : null,
    confirmedAt: value.confirmedAt ?? null,
  };
}
export function saveLocation(value, storage = globalThis.localStorage, now = Date.now()) {
  if (!validLocation(value)) throw new Error('INVALID_LOCATION');
  // Keep the resolved address in the existing in-memory profile, not an
  // indefinite Google content cache. Re-resolve it when restoring a selection.
  const { address: _address, ...saved } = copyLocation(value);
  storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ ...saved, confirmedAt: now, expiresAt: now + MAX_AGE }));
}
export function readSavedLocation(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(LOCATION_STORAGE_KEY));
    if (!validCoordinates(saved) || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= now
      || saved.expiresAt > now + MAX_AGE) {
      storage.removeItem(LOCATION_STORAGE_KEY); return null;
    }
    return { lat: saved.lat, lng: saved.lng };
  } catch { return null; }
}
