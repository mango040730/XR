import { test,expect,snapshot,screenshot } from './fixtures';
test.use({video:{mode:'on',size:{width:1440,height:1000}}});
test('independent swimming renders continuously through camera and quality changes',async({page},info)=>{
 test.setTimeout(60_000);
 await page.goto('/?offline=1&fishing&ui=1&fishingUiReview=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 await page.locator('[data-help]').click();await page.locator('[data-do="review"]').click();await page.locator('[data-close]').click();
 await page.locator('canvas').click();await page.mouse.move(720,500);
 const pose=(await snapshot(page)).player;await page.mouse.move(720+(pose.yaw-.86)/.002,500+(pose.pitch+.5)/.002);await page.keyboard.press('Escape');
 await screenshot(page,info,'free-swimming-start');const before=await snapshot(page);
 await page.waitForTimeout(12_000);await screenshot(page,info,'free-swimming-after');
 const after=await snapshot(page);expect(after.player).toEqual(before.player);expect(after.render.triangles).toBeGreaterThan(1000);expect(after.world.status).toBe('ready');
 await page.locator('[data-help]').click();await page.locator('[data-low]').check();await page.locator('[data-close]').click();
 await page.waitForTimeout(1500);await screenshot(page,info,'free-swimming-low');
 await page.locator('[data-help]').click();await page.locator('[data-do="opposite"]').click();await page.locator('[data-close]').click();
 await screenshot(page,info,'free-swimming-opposite');
});
