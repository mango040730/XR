import { mkdir,writeFile } from 'node:fs/promises';
import { test,expect,snapshot,screenshot } from './fixtures';
test.beforeEach(async({page})=>{
 await page.goto('/?offline=1&fishing&ui=1&fishingUiReview=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 await expect(page.locator('.fishing-hud')).toBeVisible();
});
test('fishing overview and opposite side render actual volume with desktop fallback',async({page},info)=>{
 expect((await snapshot(page)).world.activeId).toBe('indoor-fishing');expect((await snapshot(page)).xr.supported).toBe(false);
 await page.locator('[data-help]').click();await page.locator('[data-do="review"]').click();await page.locator('[data-close]').click();
 await screenshot(page,info,'fishing-overview');
 expect((await snapshot(page)).render.triangles).toBeGreaterThan(1000);
 await page.locator('[data-help]').click();await page.locator('[data-do="opposite"]').click();await page.locator('[data-close]').click();
 await screenshot(page,info,'fishing-opposite');
 await page.locator('[data-do="home"]').click();expect((await snapshot(page)).player.position).toEqual([6.25,0,4.35]);
 const metrics=await page.evaluate(async()=>{
  const samples:number[]=[];let previous=performance.now();
  for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const now=performance.now();samples.push(now-previous);previous=now;}
  samples.sort((a,b)=>a-b);const s=window.__XR_DEBUG__!.snapshot();const gl=document.querySelector('canvas')!.getContext('webgl2')!;const ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {viewport:[innerWidth,innerHeight],frames:samples.length,medianMs:samples[45],p95Ms:samples[85],estimatedFps:1000/samples[45],render:s.render,memory:s.memory,renderer:gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL??gl.RENDERER),userAgent:navigator.userAgent};
 });await mkdir('test-results',{recursive:true});await writeFile('test-results/fishing-performance.json',JSON.stringify(metrics,null,2));
});
test('walks and collides then sits casts retrieves stands and resets without leaked seat ownership',async({page},info)=>{
 // Move around the southeast corner, along the real rear aisle, using real pointer lock/WASD.
 await page.locator('canvas').click();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
 // Face west, exactly, via browser mouse input relative to the known spawn heading.
 const yaw=(await snapshot(page)).player.yaw;await page.mouse.move(720,500);
 const after=(await snapshot(page)).player.yaw;await page.mouse.move(720+(after-Math.PI/2)/.002,500);
 await expect.poll(async()=>Math.abs((await snapshot(page)).player.yaw-Math.PI/2)).toBeLessThan(.02);
 expect(yaw).toBeCloseTo(.84);
 await page.keyboard.down('w');try{await expect.poll(async()=>(await snapshot(page)).player.position[0],{intervals:[30],timeout:12000}).toBeLessThan(1.5);}finally{await page.keyboard.up('w');}
 await page.keyboard.press('e');await expect(page.locator('[data-seat]')).toContainText('S3');
 expect((await snapshot(page)).fishing.user.seatId).toBe('S3');
 await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');expect((await snapshot(page)).player.position).toEqual([1,0,3.22]);
 await page.clock.install();
 await page.keyboard.press('f');expect((await snapshot(page)).fishing.user.fishing).toBe('cast');
 await expect(page.locator('[data-message]')).toContainText('30초~2분');
 // A naturally downward seated view, delivered through ordinary mouse input.
 await page.mouse.move(720,500);const seatedPose=(await snapshot(page)).player;
 await page.mouse.move(720+seatedPose.yaw/.002,500+(seatedPose.pitch+.55)/.002);await page.keyboard.press('Escape');await screenshot(page,info,'fishing-seated');
 await page.clock.fastForward(28_000);expect((await snapshot(page)).fishing.user.fishing).toBe('cast');
 await page.clock.fastForward(92_001);
 await expect.poll(async()=>(await snapshot(page)).fishing.user.fishing).toBe('caught');
 expect((await snapshot(page)).fishing.user.catchCount).toBe(1);
 const caught=(await snapshot(page)).fishing.user.lastCatch;expect(['병어','고등어','숭어']).toContain(caught.name);
 await page.clock.fastForward(1250);await screenshot(page,info,'fishing-catch');
 await page.locator('[data-primary]').click();expect((await snapshot(page)).fishing.user.fishing).toBe('cast');
 await page.locator('[data-primary]').click();expect((await snapshot(page)).fishing.user.fishing).toBe('idle');
 await page.clock.resume();
 await page.locator('[data-do="stand"]').click();expect((await snapshot(page)).player.position).toEqual([1,0,4.25]);expect((await snapshot(page)).fishing.user.seatId).toBeNull();
 await page.locator('canvas').click();await page.mouse.move(720,500);const current=(await snapshot(page)).player.yaw;await page.mouse.move(720+current/.002,500);
 await page.keyboard.down('w');try{await page.waitForTimeout(1600);}finally{await page.keyboard.up('w');}
 // Chair blocks forward movement. Pool protection is also checked separately in unit tests.
 expect((await snapshot(page)).player.position[2]).toBeGreaterThanOrEqual(3.8);
 await page.keyboard.press('Escape');await page.locator('[data-help]').click();await page.locator('[data-samples]').uncheck();expect(Object.keys((await snapshot(page)).fishing.occupancy)).toHaveLength(0);
});
test('mobile touch navigation keeps controls reachable',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.fh-touch')).toBeVisible();
 const origin=(await snapshot(page)).player.position;
 const button=await page.locator('[data-move="left"]').boundingBox();expect(button).not.toBeNull();await page.mouse.move(button!.x+button!.width/2,button!.y+button!.height/2);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();
 expect((await snapshot(page)).player.position).not.toEqual(origin);await screenshot(page,info,'fishing-mobile');
});
