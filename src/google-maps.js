let loading, failCurrent, authHandler;
let attempt = 0;
const authListeners = new Set();
export function onMapsAuthError(listener) { authListeners.add(listener); return () => authListeners.delete(listener); }

export function loadGoogleMaps(key) {
  if (!key?.trim()) return Promise.reject(new Error('MISSING_API_KEY'));
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script'), callback = `__meetJoinMapsReady${++attempt}`;
    let finished = false;
    const cleanup = () => { clearTimeout(timer); script.onerror = null; delete window[callback]; if (failCurrent === fail) failCurrent = null; };
    const fail = () => { if (finished) return; finished = true; cleanup(); script.remove(); loading = null; reject(new Error('MAP_LOAD_FAILED')); };
    const timer = setTimeout(fail, 20000);
    window[callback] = async () => {
      try {
        const [maps, geocoding] = await Promise.all([window.google.maps.importLibrary('maps'), window.google.maps.importLibrary('geocoding')]);
        if (finished) return;
        finished = true; cleanup(); resolve({ ...maps, ...geocoding });
      } catch { fail(); }
    };
    failCurrent = fail;
    if (!authHandler) {
      const previousAuthFailure = window.gm_authFailure;
      authHandler = () => { failCurrent?.(); authListeners.forEach(listener => listener()); if (typeof previousAuthFailure === 'function') previousAuthFailure(); };
      window.gm_authFailure = authHandler;
    }
    const params = new URLSearchParams({ key: key.trim(), loading: 'async', callback, v: 'quarterly', language: 'ko', region: 'KR', auth_referrer_policy: 'origin' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true; script.onerror = fail;
    script.nonce = document.querySelector('script[nonce]')?.nonce ?? '';
    document.head.append(script);
  });
  return loading;
}

export async function googleMapProvider(key) {
  const api = await loadGoogleMaps(key), geocoder = new api.Geocoder();
  return {
    geocode: request => geocoder.geocode(request),
    createMap: (host, center) => new api.Map(host, {
      center, zoom: 16, renderingType: api.RenderingType.RASTER,
      styles: [{ stylers: [{ saturation: -100 }, { lightness: 10 }] }],
      disableDefaultUI: true, clickableIcons: false, gestureHandling: 'none', keyboardShortcuts: false,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: false,
    }),
  };
}
