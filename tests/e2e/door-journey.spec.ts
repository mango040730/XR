import {test,expect,snapshot,screenshot} from './fixtures';
test.use({video:{mode:'on',size:{width:1280,height:800}}});

test('mode selection walks to the actual opening door and returns facing into the room after rating',async({page},info)=>{
 test.setTimeout(90000);await page.goto('/?offline=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');const start=await snapshot(page);
 await page.locator('[data-action="mode:team"]').click();await expect.poll(async()=>(await snapshot(page)).presentationActive).toBe(true);
 await expect.poll(async()=>Math.hypot(...(await snapshot(page)).player.position.map((n,i)=>n-start.player.position[i]))).toBeGreaterThan(1);
 expect((await snapshot(page)).world.activeId).toBe('my-room');await expect.poll(async()=>(await snapshot(page)).doorAngle??0,{intervals:[20]}).toBeLessThan(-.15);await screenshot(page,info,'door-opening');
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation',{timeout:40000});expect((await snapshot(page)).world.activeId).toBe('bowling');expect((await snapshot(page)).presentationActive).toBe(false);
 await page.locator('[data-action="finish"]').click();await expect(page.locator('.rating-space-frame')).toBeVisible();await page.locator('[data-action="home"]').click();
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes',{timeout:40000});const back=await snapshot(page);expect(back.player.position).toEqual([2.23,.02,-2.85]);expect(back.player.yaw).toBeCloseTo(Math.PI);expect(back.player.seated).toBe(false);expect(back.doorAngle).toBe(0);await screenshot(page,info,'door-return-looking-in');
});
test('cancelling the walk restores the original room and the next mode remains selectable',async({page})=>{
 test.setTimeout(90000);await page.goto('/?offline=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');const root=(await snapshot(page)).activeRootId;
 await page.locator('[data-action="mode:solo"]').click();await expect.poll(async()=>(await snapshot(page)).presentationActive).toBe(true);await page.locator('[data-action="cancel-loading"]').click();
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');await page.waitForTimeout(500);expect((await snapshot(page)).activeRootId).toBe(root);expect((await snapshot(page)).doorAngle).toBe(0);expect((await snapshot(page)).presentationActive).toBe(false);expect((await snapshot(page)).player.seated).toBe(true);
 await page.locator('[data-action="mode:social"]').click();await expect.poll(async()=>(await snapshot(page)).presentationActive).toBe(true);await page.goBack();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');expect((await snapshot(page)).activeRootId).toBe(root);expect((await snapshot(page)).presentationActive).toBe(false);expect((await snapshot(page)).player.seated).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="mode:team"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation',{timeout:40000});
});
