// Fishing is UI-free in normal development and production, including ?ui=1.
// Existing UI regression fixtures are isolated to the guarded E2E build.
export const FISHING_UI_VISIBLE=import.meta.env.DEV&&import.meta.env.MODE==='e2e'
  &&typeof location!=='undefined'&&new URLSearchParams(location.search).get('fishingUiReview')==='1';
