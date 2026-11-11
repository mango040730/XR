import {test,expect,snapshot,screenshot,lookAt} from './fixtures';

const click=async(page:import('@playwright/test').Page,action:string)=>page.locator(`[data-action="${action}"]`).first().click();
test('new GLB my room surrounds all non-content screens and content worlds still load separately',async({page},info)=>{
 test.setTimeout(100000);
 await page.goto('/?offline=1');await page.waitForFunction(()=>!!window.__XR_DEBUG__);
 await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('my-room');
 await expect.poll(async()=>(await snapshot(page)).render.triangles).toBeGreaterThan(1000);
 const start=await snapshot(page);expect(start.myRoom.version).toBe('2.7.1');expect(start.myRoom.meshCount).toBe(746);expect(start.myRoom.missing).toEqual([]);expect(start.models[0].url).toContain('myroom-v2-2.7.1.glb');expect(start.render.fov).toBe(66);expect(start.player.position).toEqual([1.65,.02,2.05]);expect(start.player.seated).toBe(true);expect(start.player.eyeHeight).toBe(1.12);
 await page.keyboard.press('m');await screenshot(page,info,'my-room-glb-entry');
 await page.locator('canvas').click();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(false);
 const pose=(await snapshot(page)).player;await page.keyboard.down('w');
 try{await expect.poll(async()=>Math.hypot((await snapshot(page)).player.position[0]-pose.position[0],(await snapshot(page)).player.position[2]-pose.position[2]),{intervals:[30]}).toBeGreaterThan(.3);}finally{await page.keyboard.up('w');}
 await page.keyboard.press('m');
 await click(page,'mode:team');await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation',{timeout:40000});expect((await snapshot(page)).world.activeId).toBe('bowling');
 await click(page,'finish');await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','rating');
 await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('bowling');
 await screenshot(page,info,'content-moment-rating');
 const root=(await snapshot(page)).activeRootId;
 await click(page,'mode-rating:4');await click(page,'people-rating:5');await click(page,'rate');
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-date');await expect.poll(async()=>(await snapshot(page)).world.activeId).toBe('my-room');expect((await snapshot(page)).activeRootId).not.toBe(root);
 await page.locator('.calendar [data-action^="date:"]').nth(15).click();await click(page,'time:17:00');await click(page,'appointment-next');
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-place');expect((await snapshot(page)).world.activeId).toBe('my-room');await screenshot(page,info,'my-room-appointment');
 await click(page,'appointment-create');await click(page,'mode:social');await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation',{timeout:40000});expect((await snapshot(page)).world.activeId).toBe('indoor-fishing');
 await page.keyboard.press('m');await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('my-room');
 await page.keyboard.press('m');expect((await snapshot(page)).world.activeId).toBe('my-room');await click(page,'mode:social');await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('indoor-fishing');
});

test('real keyboard movement steps onto the clipped platform and back to the oak floor',async({page},info)=>{
 test.setTimeout(90000);await page.goto('/?offline=1#my-room');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 await page.locator('canvas').click();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(false);
 await page.keyboard.down('w');await expect.poll(async()=>(await snapshot(page)).player.seated).toBe(false);await page.keyboard.up('w');
 const face=(yaw:number)=>lookAt(page,yaw);
 const walk=async(key:string,axis:number,predicate:(n:number)=>boolean)=>{await page.keyboard.down(key);try{await expect.poll(async()=>predicate((await snapshot(page)).player.position[axis]),{timeout:15000,intervals:[20]}).toBe(true);}finally{await page.keyboard.up(key);}};
 await face(0);await walk('w',2,n=>n<-.9);
 await face(Math.PI/2);await walk('w',0,n=>n<.45);
 await face(Math.PI);await walk('w',2,n=>n>-.85);
 await face(Math.PI/2);await walk('w',0,n=>n<.02);
 await face(Math.PI);await walk('w',2,n=>n>.06);
 await face(Math.PI/2);await walk('w',0,n=>n<-.6);expect((await snapshot(page)).player.position[1]).toBe(.18);
 await page.keyboard.press('Escape');await screenshot(page,info,'my-room-platform-step');
 await page.locator('canvas').click();await face(-Math.PI/2);await walk('w',0,n=>n>0);expect((await snapshot(page)).player.position[1]).toBe(.02);
 await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});await expect.poll(async()=>(await snapshot(page)).render.fov).toBe(78);await screenshot(page,info,'my-room-mobile');
});
