import { mkdir, writeFile } from 'node:fs/promises';
import { test as base, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import type { EngineSnapshot } from '../../src/dev/engineDiagnostics';

interface BrowserLog {
  pageErrors: string[];
  console: Array<{ type: string; text: string; url: string }>;
  failures: Array<{ url: string; error: string }>;
  responses: Array<{ url: string; status: number; contentType: string }>;
  expectedFailures: Set<string>;
}

export const test = base.extend<{ browserLog: BrowserLog }>({
  browserLog: [async ({ page, browser }, use, testInfo) => {
    const log: BrowserLog = { pageErrors: [], console: [], failures: [], responses: [], expectedFailures: new Set() };
    page.on('pageerror', error => log.pageErrors.push(error.stack ?? error.message));
    page.on('console', message => log.console.push({ type: message.type(), text: message.text(), url: message.location().url }));
    page.on('requestfailed', request => log.failures.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' }));
    page.on('response', response => {
      if (response.status() >= 400 || response.url().endsWith('.glb')) {
        log.responses.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] ?? '' });
      }
    });
    await use(log);
    const finalSnapshot = await page.evaluate(() => window.__XR_DEBUG__?.snapshot() ?? null).catch(() => null);
    const webGL = await page.evaluate(() => {
      const gl = document.querySelector('canvas')?.getContext('webgl2');
      if (!gl) return null;
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) };
    }).catch(() => null);
    await mkdir('test-results/browser-logs', { recursive: true });
    const path = `test-results/browser-logs/${testInfo.project.name}-${testInfo.title.replace(/[^a-z0-9]+/gi, '-')}.json`;
    await writeFile(path, JSON.stringify({ ...log, expectedFailures: [...log.expectedFailures], browser: browser.version(), webGL, finalSnapshot }, null, 2));
    await testInfo.attach('browser-diagnostics', { path, contentType: 'application/json' });
    const expected = (url: string) => log.expectedFailures.has(new URL(url || 'about:blank').pathname);
    expect(log.pageErrors, 'uncaught browser runtime errors').toEqual([]);
    expect(log.failures.filter(item => !expected(item.url)), 'unexpected failed network requests').toEqual([]);
    expect(log.responses.filter(item => item.status >= 400 && !expected(item.url)), 'unexpected HTTP errors').toEqual([]);
    expect(log.console.filter(item => item.type === 'error' && !expected(item.url)), 'unexpected console errors').toEqual([]);
  }, { auto: true }],
});

export { expect };
export function snapshot(page: Page): Promise<EngineSnapshot> {
  return page.evaluate(() => {
    if (!window.__XR_DEBUG__) throw new Error('Development diagnostics not installed');
    return window.__XR_DEBUG__.snapshot();
  });
}

export async function enter(page: Page, id: string): Promise<void> {
  await page.locator('#world-select').selectOption(id);
  await page.locator('[data-enter]').click();
  await expect.poll(async () => (await snapshot(page)).world.activeId).toBe(id);
  await expect.poll(async () => (await snapshot(page)).world.status).toBe('ready');
  await renderFrames(page);
  await expect.poll(async () => (await snapshot(page)).render.triangles).toBeGreaterThan(0);
}

export async function renderFrames(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

export async function screenshot(page: Page, info: TestInfo, name: string): Promise<void> {
  await renderFrames(page);
  await mkdir('test-results/screenshots', { recursive: true });
  const path = `test-results/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}
