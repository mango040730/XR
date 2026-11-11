import {test,expect,snapshot,screenshot,lookAt} from './fixtures';

test('moves immediately, looks only on drag, and keeps the cursor free through rating',async({page},info)=>{
 test.setTimeout(90000);await page.goto('/?offline=1#my-room');await page.waitForFunction(()=>!!window.__XR_DEBUG__);
 await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready',{},{timeout:40000});
 const pose=(await snapshot(page)).player;
 // No canvas click or pointer-lock request precedes movement.
 await page.keyboard.down('ArrowUp');try{await expect.poll(async()=>Math.hypot(...(await snapshot(page)).player.position.map((n,i)=>n-pose.position[i]))).toBeGreaterThan(.25);}finally{await page.keyboard.up('ArrowUp');}
 expect(await page.evaluate(()=>document.pointerLockElement)).toBeNull();
 const yaw=(await snapshot(page)).player.yaw;await page.mouse.move(400,300);await page.mouse.move(600,350);expect((await snapshot(page)).player.yaw).toBe(yaw);
 await lookAt(page,yaw-.35);expect((await snapshot(page)).player.yaw).toBeCloseTo(yaw-.35);expect(await page.evaluate(()=>document.pointerLockElement)).toBeNull();
 await page.keyboard.press('m');await page.locator('[data-action="mode:solo"]').click();
 await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('woodworking');
 await page.keyboard.down('w');try{await expect.poll(async()=>(await snapshot(page)).player.position[2]).toBeLessThan(5);}finally{await page.keyboard.up('w');}
 await lookAt(page,-.25,-.1);const content=await snapshot(page);await screenshot(page,info,'new-atelier-live');
 await page.locator('[data-action="finish"]').click();
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','rating');
 await expect(page.locator('.rating-space-frame')).toBeVisible();
 expect((await snapshot(page)).activeRootId).toBe(content.activeRootId);expect((await snapshot(page)).player).toEqual(content.player);expect((await snapshot(page)).worldFrozen).toBe(true);
 const image=await page.locator('.rating-space-frame').getAttribute('src');expect(image?.startsWith('data:image/png;base64,')).toBe(true);
 expect(await page.locator('.rating-space-frame').evaluate(async node=>{const img=node as HTMLImageElement;await img.decode();return img.naturalWidth;})).toBeGreaterThan(500);
 await page.keyboard.down('w');await page.mouse.move(720,400);await page.mouse.down();await page.mouse.move(900,450);await page.mouse.up();await page.waitForTimeout(300);await page.keyboard.up('w');
 expect((await snapshot(page)).player).toEqual(content.player);expect(await page.locator('.rating-space-frame').getAttribute('src')).toBe(image);
 await page.locator('[data-action="mode-rating:4"]').click();await page.locator('[data-action="people-rating:5"]').click();expect(await page.locator('.rating-space-frame').getAttribute('src')).toBe(image);await screenshot(page,info,'new-atelier-frozen-rating');
 await page.locator('[data-action="rate"]').click();await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('my-room');await expect(page.locator('.rating-space-frame')).toBeHidden();expect((await snapshot(page)).worldFrozen).toBe(false);
});
