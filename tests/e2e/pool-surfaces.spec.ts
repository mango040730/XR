import { test,expect,snapshot,screenshot } from './fixtures';

test('pool seams stay stable while walking and looking across both sides',async({page},info)=>{
 test.setTimeout(60_000);
 await page.goto('/?offline=1&fishing&ui=1&fishingUiReview=1');
 await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 await page.locator('[data-help]').click();await page.locator('[data-do="review"]').click();await page.locator('[data-close]').click();
 await page.locator('canvas').click();await page.mouse.move(720,500);
 const pose=(await snapshot(page)).player;
 await page.mouse.move(720+(pose.yaw-.86)/.002,500+(pose.pitch+.5)/.002);
 await screenshot(page,info,'pool-seams-near');
 const before=(await snapshot(page)).player.position;
 await page.keyboard.down('a');
 try{await expect.poll(async()=>Math.abs((await snapshot(page)).player.position[0]-before[0])).toBeGreaterThan(.2);}
 finally{await page.keyboard.up('a');}
 await page.mouse.move(760,475);await screenshot(page,info,'pool-seams-moving');
 await page.keyboard.press('Escape');
 await page.locator('[data-help]').click();await page.locator('[data-do="opposite"]').click();await page.locator('[data-close]').click();
 await page.locator('canvas').click();await page.mouse.move(720,500);
 const opposite=(await snapshot(page)).player;
 await page.mouse.move(720+(opposite.yaw+2.3)/.002,500+(opposite.pitch+.45)/.002);
 await screenshot(page,info,'pool-seams-opposite');
 expect((await snapshot(page)).world.activeId).toBe('indoor-fishing');
});
