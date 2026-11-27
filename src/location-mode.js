// Demo is intentional and independent of whether a Google key exists.
export const LOCATION_MODE = import.meta.env?.VITE_LOCATION_MODE === 'google' ? 'google' : 'demo';
