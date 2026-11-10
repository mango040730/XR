import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

async function click(page: Page, action: string) {
    await page.locator(`[data-action="${action}"]`).first().click();
}
async function ready(page: Page) {
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.fix-frame img').evaluateAll(images => Promise.all(images.map(img => (img as HTMLImageElement).decode())));
}

test('mode notice dismisses, stays dismissed during hover, and returns on the next visit over a live world', async ({ page }) => {
    await page.goto('/?ui=1&legacyServiceReview=1');
    await click(page, 'login'); await click(page, 'avatar-next');
    await click(page, 'nav:neighborhood-choice'); await click(page, 'neighborhood:jayang');
    await click(page, 'nav:modes');
    const notice = page.getByRole('status').filter({ hasText: '원하는 모드를 선택하세요' });
    await expect(notice).toHaveCSS('opacity', '1');
    await expect(page.locator('.fix-frame > [data-name="image 111"],.fix-frame > [data-name="image 112"]')).toHaveCount(0);
    await expect(page.locator('.fix-frame')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect.poll(() => page.evaluate(() => window.__XR_DEBUG__?.snapshot().world.activeId)).toBe('my-room');
    await expect.poll(() => page.evaluate(() => window.__XR_DEBUG__?.snapshot().render.triangles ?? 0)).toBeGreaterThan(0);
    await expect(page.locator('.service-viewport canvas')).toBeVisible();
    await expect(page.locator('.fix-mode-notice')).toBeHidden({ timeout: 6000 });
    await page.locator('[data-action="mode:solo"]').hover({ position: { x: 100, y: 180 } });
    await expect(page.locator('.fix-mode-notice')).toBeHidden();
    await ready(page);
    await mkdir('test-results/live-world-ui', { recursive: true });
    await page.screenshot({ path: 'test-results/live-world-ui/modes-notice-dismissed.png' });
    await click(page, 'mode:solo'); await click(page, 'nav:modes');
    await expect(notice).toHaveCSS('opacity', '1');
    await page.screenshot({ path: 'test-results/live-world-ui/modes-notice-visible.png' });
    // Reduced motion keeps the same dismissal deadline without fading.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await click(page, 'mode:solo'); await click(page, 'nav:modes');
    await expect(notice).toBeVisible();
    await expect(page.locator('.fix-mode-notice')).toBeHidden({ timeout: 6000 });
});

test('four first-fix reference screens render their local assets in the designed slots', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 600 });
    await mkdir('test-results/figma-fix', { recursive: true });
    const audit = [];
    const failures: string[] = [];
    page.on('requestfailed', request => failures.push(request.url()));
    for (const id of ['51:919', '50:1645', '49:807', '49:1070']) {
        await page.goto('/?designReview=' + id);
        await ready(page);
        await expect(page.locator('.fix-frame')).toHaveAttribute('data-node-id', id);
        const assets = await page.locator('.fix-frame img').evaluateAll(images => images.map(node => {
            const img = node as HTMLImageElement;
            const r = img.getBoundingClientRect();
            return { slot: img.closest('[data-node-id]')?.getAttribute('data-node-id'), path: new URL(img.src).pathname,
                naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, width: r.width, height: r.height, x: r.x, y: r.y };
        }));
        for (const asset of assets) {
            expect(asset.path).toMatch(/^\/assets\/figma-fix\//);
            expect(asset.naturalWidth).toBeGreaterThan(0);
            expect(asset.width).toBeGreaterThan(0);
            expect(asset.height).toBeGreaterThan(0);
            expect(asset.slot).toBeTruthy();
        }
        const typography = await page.locator('.fix-frame p').evaluateAll(nodes => nodes.map(node => {
            const style = getComputedStyle(node);
            return { text: node.textContent?.trim(), family: style.fontFamily, weight: style.fontWeight, size: style.fontSize };
        }));
        audit.push({ id, assets, typography });
        await page.screenshot({ path: `test-results/figma-fix/reference-${id.replace(':', '-')}.png` });
    }
    expect(failures).toEqual([]);
    await writeFile('test-results/figma-fix/asset-geometry.json', JSON.stringify(audit, null, 2));
});

test('every mode expands on hover and keyboard focus, resets on exit, and still enters its servers', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 664 });
    await page.goto('/?ui=1&legacyServiceReview=1');
    await click(page, 'login'); await click(page, 'avatar-next');
    await click(page, 'nav:neighborhood-choice'); await click(page, 'neighborhood:jayang');
    await click(page, 'nav:modes'); await ready(page);
    for (const id of ['social', 'solo', 'team']) {
        const card = page.locator(`[data-action="mode:${id}"]`);
        // Aim at the bottom edge, shared by the compact and expanded layouts.
        await card.hover({ position: { x: 100, y: 180 } });
        await expect(card).toHaveCSS('height', '400px');
        await expect(card).toHaveCSS('flex-basis', '542px');
        await expect(card.locator('.fix-mode-description')).toBeVisible();
        const others = page.locator(`.fix-mode-card:not([data-action="mode:${id}"])`);
        for (const other of await others.all()) {
            await expect(other).toHaveCSS('height', '200px');
            await expect(other).toHaveCSS('flex-basis', '261px');
        }
        await page.screenshot({ path: `test-results/figma-fix/hover-${id}.png` });
        await page.mouse.move(10, 10);
        await expect(card).toHaveCSS('height', '200px');
        await expect(card.locator('.fix-mode-description')).toBeHidden();
        await page.keyboard.press('Tab');
        await card.focus();
        await expect(card).toHaveCSS('height', '400px');
        const other = others.first();
        await other.hover({ position: { x: 100, y: 180 } });
        await expect(other).toHaveCSS('height', '400px');
        await expect(card).toHaveCSS('height', '200px');
        await page.mouse.move(10, 10);
        await expect(card).toHaveCSS('height', '400px');
        await page.keyboard.press('Enter');
        await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'servers');
        await expect(page.locator('[data-node-id="1144:495"]')).toContainText({ social: '친목', solo: '혼자', team: '협력' }[id]!);
        await click(page, 'nav:modes');
    }
});

test('touch users can enter every mode without a hover step', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const tap = async (action: string) => page.locator(`[data-action="${action}"]`).first().tap();
    await page.goto('/?ui=1&legacyServiceReview=1');
    await tap('login'); await tap('avatar-next');
    await tap('nav:neighborhood-choice'); await tap('neighborhood:jayang');
    await tap('nav:modes');
    for (const id of ['social', 'solo', 'team']) {
        await tap('mode:' + id);
        await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'servers');
        await tap('nav:modes');
        await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'modes');
    }
    await context.close();
});
