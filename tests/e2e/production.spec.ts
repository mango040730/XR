import { test, expect } from './fixtures';

test('production exposes only first-fix UI and loads the real GLB without debug globals',async({page})=>{
 await page.goto('/?offline=1&lab=1&legacyServiceReview=1&ui=1');
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');
 await expect(page.locator('#world-select,.service-chrome,.service-touch-controls,.ds-screen')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__XR_DEBUG__)).toBeUndefined();
 const glb=page.waitForResponse(response=>response.url().endsWith('/bowling/retro_bowling_alley.glb'));
 await page.locator('[data-action="mode:team"]').click();expect((await glb).status()).toBe(200);
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation');
 await expect(page.locator('button:visible,a:visible,input:visible')).toHaveCount(5);
 expect(await page.locator('canvas').evaluate(canvas=>!!(canvas as HTMLCanvasElement).getContext('webgl2'))).toBe(true);
 expect(await page.evaluate(()=>window.__XR_DEBUG__)).toBeUndefined();
});

test('production social view loads the provided GLB but never exposes test diagnostics or fabricated peers',async({page})=>{
 const model=page.waitForResponse(r=>r.url().endsWith('/avatars/cub-scout-v6.glb'));
 await page.goto('/#my-room');expect((await model).status()).toBe(200);
 await page.locator('[data-node-id="115:397"]').click();await expect(page.locator('.social-join')).toBeVisible();await expect(page.locator('.social-status')).toBeHidden();
 expect(await page.evaluate(()=>window.__SOCIAL_DEBUG__)).toBeUndefined();expect(await page.evaluate(()=>window.__XR_DEBUG__)).toBeUndefined();
 await expect(page.locator('.social-log li')).toHaveCount(0);
});

test('production fishing keeps only the first-fix next-step button',async({page})=>{
 await page.goto('/?offline=1&ui=1');
 await expect(page.locator('[data-action="login"]')).toHaveCount(0);
 await page.locator('[data-action="mode:social"]').click();
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation');
 await expect(page.locator('.fishing-hud')).not.toHaveAttribute('hidden','');
 await expect(page.locator('button:visible,a:visible,input:visible')).toHaveCount(5);
 await expect(page.locator('.fishing-hud > *,.service-chrome,.service-touch-controls,.vr-panel-tools')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__XR_DEBUG__)).toBeUndefined();
});

test('production fishing ignores HUD flags and keeps only mode navigation',async({page},info)=>{
  await page.goto('/?offline=1&fishing&ui=1&fishingUiReview=1');
  await expect(page.locator('.fishing-hud')).toHaveCount(1);
  await expect(page.locator('.fishing-hud')).not.toHaveAttribute('hidden','');
  await expect(page.locator('.fishing-hud > *')).toHaveCount(0);
  await expect(page.locator('button:visible,a:visible,input:visible')).toHaveCount(1);
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(()=>window.__XR_DEBUG__)).toBeUndefined();
  await page.screenshot({path:info.outputPath('fishing-no-ui-production.png')});
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('button:visible,a:visible,input:visible')).toHaveCount(1);
});
