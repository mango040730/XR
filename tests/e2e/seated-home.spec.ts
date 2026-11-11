import {test,expect,snapshot,screenshot} from './fixtures';

test('fresh and old home URLs immediately show mode cards from the owner chair, keeping home visible after navigation keys',async({page},info)=>{
 test.setTimeout(90000);
 for(const url of ['/?offline=1','/?offline=1#my-room']){
  await page.goto(url);await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
  await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');
  const seated=(await snapshot(page)).player;expect(seated.position).toEqual([1.65,.02,2.05]);expect(seated.yaw).toBeCloseTo(.5);expect(seated.eyeHeight).toBe(1.12);expect(seated.seated).toBe(true);
  await expect(page.locator('.fix-mode-card')).toHaveCount(3);await expect(page.locator('.fix-space-next')).toHaveCount(0);
  await page.keyboard.press('m');await page.keyboard.press('Escape');await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');expect((await snapshot(page)).player).toEqual(seated);
 }
 await screenshot(page,info,'seated-home-desktop');
 await page.keyboard.down('w');try{await expect.poll(async()=>(await snapshot(page)).player.seated).toBe(false);}finally{await page.keyboard.up('w');}
 expect((await snapshot(page)).player.eyeHeight).toBe(1.65);expect(await page.evaluate(()=>document.pointerLockElement)).toBeNull();
 await page.locator('[data-action="home"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');expect((await snapshot(page)).player.seated).toBe(true);
 await page.locator('[data-action="mode:team"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation',{timeout:40000});expect((await snapshot(page)).player.seated).toBe(false);
 await page.locator('[data-action="finish"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','rating');
 await page.locator('[data-action="home"]').click();await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('my-room');await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');expect((await snapshot(page)).player.seated).toBe(true);
 await page.setViewportSize({width:390,height:844});await screenshot(page,info,'seated-home-mobile');
});
