import {test,expect,snapshot,screenshot} from './fixtures';

test('team enters the attached bowling GLB, walks across the foyer seam, and rates the captured scene',async({page},info)=>{
 test.setTimeout(90000);await page.goto('/?offline=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 const response=page.waitForResponse(r=>r.url().endsWith('/bowling/retro_bowling_alley.glb'));
 await page.locator('[data-action="mode:team"]').click();expect((await response).status()).toBe(200);
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation');const start=await snapshot(page);
 expect(start.world.activeId).toBe('bowling');expect(start.models[0].url).toContain('retro_bowling_alley.glb');expect(start.player.position).toEqual([0,0,-1]);expect(start.render.fov).toBe(65);
 await screenshot(page,info,'bowling-entry');
 // Real keyboard input, without any click or pointer lock. Walk down the clear outer aisle.
 await page.keyboard.down('d');try{await expect.poll(async()=>(await snapshot(page)).player.position[0],{timeout:12000,intervals:[30]}).toBeGreaterThan(7.3);}finally{await page.keyboard.up('d');}
 await page.keyboard.down('w');try{await expect.poll(async()=>(await snapshot(page)).player.position[2],{timeout:12000,intervals:[30]}).toBeLessThan(-8.5);}finally{await page.keyboard.up('w');}
 expect(await page.evaluate(()=>document.pointerLockElement)).toBeNull();await screenshot(page,info,'bowling-aisle');const before=await snapshot(page);
 await page.locator('[data-action="finish"]').click();await expect(page.locator('.rating-space-frame')).toBeVisible();expect((await snapshot(page)).activeRootId).toBe(before.activeRootId);expect((await snapshot(page)).player).toEqual(before.player);await screenshot(page,info,'bowling-rating');
 await page.locator('[data-action="home"]').click();await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('my-room');await page.keyboard.press('m');await page.locator('[data-action="mode:team"]').click();await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('bowling');expect((await snapshot(page)).activeRootId).not.toBe(before.activeRootId);
});
