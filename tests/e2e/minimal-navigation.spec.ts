import { test, expect, snapshot, screenshot } from './fixtures';

test('Cardboard gaze activates the simulation return button and the termination notice expires', async ({ page }, info) => {
    await page.setViewportSize({ width: 1000, height: 600 });
    await page.goto('/?offline=1'); await page.locator('[data-action="mode:team"]').click();
    await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'simulation');
    await page.keyboard.press('v'); await expect(page.locator('.first-fix-shell')).toHaveClass(/immersive/);
    await page.evaluate(() => document.fonts.ready);
    const next = page.locator('[data-action="finish"]');
    const box = (await next.boundingBox())!, frame = (await page.locator('.simulation-frame').boundingBox())!;
    const scale = frame.width / 1200;
    const x = (box.x + box.width / 2 - frame.x) / scale, y = (box.y + box.height / 2 - frame.y) / scale;
    const pitch = Math.atan2((300 - y) * 1.5 / 600, Math.hypot((x - 600) * 3 / 1200, 2.8));
    const before = (await snapshot(page)).player.pitch;
    const yaw = Math.atan2((x - 600) * 3 / 1200, 2.8);
    await page.mouse.move(500, 300); await page.mouse.down();
    await page.mouse.move(500 + yaw / .004, 300 - (pitch - before) / .004, { steps: 8 }); await page.mouse.up();
    await expect(next).toHaveClass(/gaze-focus/);
    await screenshot(page, info, 'first-fix-minimal-cardboard');
    // A real ray hit and dwell advance the service; no DOM click or debug mutation.
    await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'rating');
    await expect(page.locator('.fix-rating-notice')).toBeHidden({ timeout: 6000 });
    await page.keyboard.press('v'); await expect(page.locator('.first-fix-shell')).not.toHaveClass(/immersive/);
});
