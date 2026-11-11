import { test, expect, snapshot, screenshot } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';

test('updated Figma references preserve every original asset and its rendered geometry', async ({ page }, info) => {
    await page.setViewportSize({ width: 1200, height: 600 });
    const audit = [];
    for (const id of ['115:330', '115:855']) {
        await page.goto('/?designReview=' + id);
        await expect(page.locator('.updated-frame')).toHaveAttribute('data-node-id', id);
        await page.evaluate(() => document.fonts.ready);
        await page.locator('.updated-frame img').evaluateAll(images => Promise.all(images.map(node => (node as HTMLImageElement).decode())));
        const assets = await page.locator('.updated-frame img').evaluateAll(images => images.map(node => {
            const image = node as HTMLImageElement, bounds = image.getBoundingClientRect();
            return { slot: image.closest('[data-node-id]')?.getAttribute('data-node-id'), path: new URL(image.src).pathname,
                naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
        }));
        for (const asset of assets) {
            expect(asset.path).toMatch(/^\/assets\/figma-update\//);
            expect(asset.naturalWidth).toBeGreaterThan(0); expect(asset.naturalHeight).toBeGreaterThan(0);
            expect(asset.width).toBeGreaterThan(0); expect(asset.height).toBeGreaterThan(0);
            expect(asset.slot).toBeTruthy();
        }
        if (id === '115:330') {
            const hero = assets.find(asset => asset.slot === '115:371')!;
            expect(hero).toMatchObject({ x: 353, y: 184, width: 494, height: 233 });
            for (const slot of ['115:397', '115:400']) expect(assets.find(asset => asset.slot === slot)).toMatchObject({ width: 24, height: 24 });
        } else {
            expect(assets.find(asset => asset.slot === '115:858')).toMatchObject({ x: 588, y: 516, width: 24, height: 24 });
        }
        audit.push({ id, assets });
        await screenshot(page, info, 'updated-reference-' + id.replace(':', '-'));
    }
    await mkdir('test-results/figma-update', { recursive: true });
    await writeFile('test-results/figma-update/asset-geometry.json', JSON.stringify(audit, null, 2));
});

test('simulation frame appears only after successful mode entry and disappears on rating or home', async ({ page }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1200, height: 600 });
    await page.goto('/?offline=1');
    await page.waitForFunction(() => window.__XR_DEBUG__?.snapshot().world.status === 'ready');
    await expect(page.locator('.fix-frame')).toHaveAttribute('data-node-id', '115:330');
    await expect(page.locator('.simulation-frame')).toHaveCount(0);
    await expect(page.locator('[data-node-id="115:386"]')).toHaveCSS('opacity', '0');
    await expect(page.locator('[data-action="nav:appointment-date"]')).toHaveAttribute('aria-label', '작당모의');
    await page.locator('[data-action="mode:solo"]').hover({ position: { x: 100, y: 180 } });
    await expect(page.locator('[data-action="mode:solo"]')).toHaveCSS('height', '400px');
    await expect(page.locator('[data-action="mode:solo"]')).toHaveCSS('backdrop-filter', 'blur(10px)');
    await screenshot(page, info, 'updated-live-modes');
    for (const [mode, world] of [['solo', 'woodworking'], ['social', 'indoor-fishing'], ['team', 'bowling']]) {
        await page.locator(`[data-action="mode:${mode}"]`).click();
        await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'loading');
        await expect(page.locator('.simulation-frame')).toHaveCount(0);
        await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'simulation', { timeout: 40000 });
        expect((await snapshot(page)).world.activeId).toBe(world);
        await expect(page.locator('.simulation-frame')).toHaveAttribute('data-node-id', '115:855');
        await expect(page.locator('.simulation-log')).toBeEmpty();
        await expect(page.getByRole('textbox', { name: '채팅 입력하기' })).toBeDisabled();
        await expect(page.getByRole('button', { name: '마이크 켜기', exact: true })).toBeDisabled();
        await expect(page.locator('.fix-space-next')).toHaveCount(0);
        await screenshot(page, info, 'updated-simulation-' + mode);
        await page.locator('[data-action="finish"]').click();
        await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'rating');
        await expect(page.locator('.simulation-frame')).toHaveCount(0);
        await page.locator('[data-action="home"]').click();
        await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'modes', { timeout: 40000 });
    }
});

test('updated mobile frame keeps chat, microphone and return controls inside the viewport', async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto('/?offline=1');
    await page.locator('[data-action="mode:team"]').tap();
    await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'simulation', { timeout: 40000 });
    for (const selector of ['[data-action="finish"]', '.simulation-chat', '.simulation-mic']) {
        const bounds = (await page.locator(selector).boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
        expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    }
    await screenshot(page, info, 'updated-simulation-mobile');
    await page.locator('[data-action="finish"]').tap();
    await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'rating');
    await context.close();
});
