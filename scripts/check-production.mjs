import { readdir, readFile } from 'node:fs/promises';

const assets = new URL('../dist/assets/', import.meta.url);
for (const name of await readdir(assets)) {
  if (!name.endsWith('.js')) continue;
  if (/^(ServiceExperience|startLab)-/.test(name)) throw new Error(`Legacy UI chunk leaked into production: ${name}`);
  const text = await readFile(new URL(name, assets), 'utf8');
  if (/__XR_DEBUG__|__SOCIAL_DEBUG__|attachSocialDiagnostics|e2e-missing-model|e2e-invalid-model|attachEngineDiagnostics|fishingUiReview|legacyServiceReview/.test(text)) {
    throw new Error(`Development-only code leaked into production: ${name}`);
  }
}
console.log('Production isolation: no E2E diagnostics or negative world fixtures in JS bundles');
