// Old UI remains a development-only regression fixture, never a user-facing route.
export const LEGACY_SERVICE_REVIEW = import.meta.env.DEV && import.meta.env.MODE === 'e2e'
    && typeof location !== 'undefined' && new URLSearchParams(location.search).get('legacyServiceReview') === '1';
