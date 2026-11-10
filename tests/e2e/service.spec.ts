import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const shots='test-results/screenshots';
async function click(page:Page,action:string){await page.locator(`[data-action="${action}"]`).first().click();}
async function route(page:Page,name:string){
  await expect(page.locator('.service-shell')).toHaveAttribute('data-route',name);
  if(['modes','rating','appointment-date','appointment-place'].includes(name)){
    await expect(page.locator('.fix-frame')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    await expect(page.locator('.fix-frame > [data-name="image 111"],.fix-frame > [data-name="image 112"]')).toHaveCount(0);
    await expect(page.locator('.service-viewport canvas')).toHaveCSS('visibility','visible');
    await expect.poll(()=>page.evaluate(()=>window.__XR_DEBUG__?.snapshot().render.triangles??0)).toBeGreaterThan(0);
  }
}
async function calendarFits(page:Page){
  const box=(await page.locator('.calendar').boundingBox())!;
  for(const day of await page.locator('.calendar [data-action^="date:"]').all()){
    const cell=(await day.boundingBox())!;
    expect(cell.y).toBeGreaterThanOrEqual(box.y);
    expect(cell.y+cell.height).toBeLessThanOrEqual(box.y+box.height);
  }
}
async function shot(page:Page,name:string){await mkdir(shots,{recursive:true});await page.evaluate(()=>document.fonts.ready);await page.locator('.design-frame img').evaluateAll(imgs=>Promise.all(imgs.map(img=>(img as HTMLImageElement).decode())));await page.screenshot({path:`${shots}/${name}.png`});}
async function onboard(page:Page){await page.goto('/?ui=1&legacyServiceReview=1');await click(page,'login');await route(page,'avatar');await page.getByRole('textbox',{name:'닉네임',exact:true}).fill('동네친구');await click(page,'nav:avatar-picker');await click(page,'avatar:amber');await click(page,'nav:avatar');await click(page,'avatar-next');await click(page,'nav:neighborhood-choice');await click(page,'neighborhood:jayang');await route(page,'my-room');}
for(const device of ['pc','mobile']as const)test(`${device}: full local service from login to appointment`,async({browser})=>{
  const context=await browser.newContext(device==='mobile'?{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1440,height:1000}});const page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const failures:string[]=[];page.on('requestfailed',r=>failures.push(r.url()));
  await onboard(page);await shot(page,`service-${device}-my-room`);
  await click(page,'nav:modes');await click(page,'mode:team');await route(page,'servers');await expect(page.locator('[data-node-id="1144:495"]')).toContainText('협력');await click(page,'join:fish');await route(page,'simulation');
  await expect.poll(()=>page.evaluate(()=>window.__XR_DEBUG__?.snapshot().world.activeId)).toBe('glb-test-room');await shot(page,`service-${device}-simulation`);
  await click(page,'nav:pause');await route(page,'pause');await click(page,'nav:simulation');await click(page,'finish');await route(page,'rating');
  await click(page,'mode-rating:4');await click(page,'people-rating:5');await shot(page,`service-${device}-rating`);for(const id of ['chang','ryo','707'])await click(page,'person-rating:'+id);await click(page,'rate');await route(page,'rating-done');await click(page,'home');await route(page,'my-room');
  await click(page,'nav:chat');await page.locator('input[name="chat"]').fill('다음에도 함께해요');await click(page,'chat-send');await expect(page.locator('.ds-list')).toContainText('다음에도 함께해요');await click(page,'home');await route(page,'my-room');
  await click(page,'nav:invite');await click(page,'invite:chang');await route(page,'invite-done');await click(page,'home');await route(page,'my-room');
  await click(page,'nav:appointments');await click(page,'attendee:ryo');await click(page,'appointment-start');await route(page,'appointment-date');await calendarFits(page);
  const date=page.locator('.calendar [data-action^="date:"]').nth(15);await date.click();await click(page,'time:17:00');await shot(page,`service-${device}-date`);await click(page,'appointment-next');await click(page,'place:park');await shot(page,`service-${device}-place`);await click(page,'appointment-create');await route(page,'appointment-done');await shot(page,`service-${device}-appointment`);await click(page,'nav:appointments');
  await expect(page.locator('.ds-list')).toContainText('어린이대공원');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('xr-spatial-service-demo-v1')!));expect(saved.profile.avatar).toBe('amber');expect(saved.profile.neighborhood).toBe('jayang');expect(saved.ratings).toHaveLength(1);expect(saved.appointments).toHaveLength(1);expect(saved.appointments[0].participants).toEqual(['chang','ryo']);
  await page.reload();await route(page,'my-room');expect(errors).toEqual([]);expect(failures).toEqual([]);await context.close();
});
test('full room recovers to server selection and incoming invite can be declined',async({page})=>{
  await onboard(page);await page.evaluate(()=>{const key='xr-spatial-service-demo-v1';const data=JSON.parse(localStorage.getItem(key)!);data.rooms[0].current=data.rooms[0].capacity;localStorage.setItem(key,JSON.stringify(data));});await page.reload();await click(page,'nav:modes');await click(page,'mode:solo');await click(page,'join:fish');await route(page,'error');await expect(page.locator('.ds-subtitle')).toContainText('정원');await click(page,'back');await route(page,'servers');await click(page,'nav:invitations');await click(page,'decline:demo-incoming');await expect(page.locator('.ds-list')).toContainText('거절');
});
test('Cardboard renders live stereoscopic panels and gaze activates a real login button',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('/?legacyServiceReview=1');await click(page,'nav:cardboard-guide');await click(page,'cardboard-start');
  await expect(page.locator('.service-shell')).toHaveClass(/immersive/);await expect(page.locator('.sensor-status')).toContainText('기다리고');
  await page.waitForTimeout(350);await shot(page,'service-mobile-cardboard-login');
  // Real pointer dragging rotates the camera. A 45px downward UI offset is a
  // -atan(.1125/2.8) camera pitch; input sensitivity is .004 rad per pixel.
  const control=await page.locator('[data-action="login"]').first().boundingBox();expect(control).not.toBeNull();
  const frame=await page.locator('.design-frame').boundingBox();const scale=frame!.width/1200;
  const x=(control!.x+control!.width/2-frame!.x)/scale,y=(control!.y+control!.height/2-frame!.y)/scale;
  const yaw=Math.atan2((x-600)*3/1200,2.8),pitch=Math.atan2((300-y)*1.5/600,2.8);
  await page.mouse.move(400,180);await page.mouse.down();await page.mouse.move(400-yaw/.004,180-pitch/.004,{steps:10});await page.mouse.up();
  await route(page,'avatar');await shot(page,'service-mobile-cardboard-avatar');
  await page.keyboard.press('Escape');await expect(page.locator('.service-shell')).not.toHaveClass(/immersive/);await expect(page.locator('.service-stage')).toHaveCSS('opacity','1');
});
test('13 original Figma frames render code components and local assets for visual audit',async({page})=>{
  await page.setViewportSize({width:1200,height:600});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const id of [700,715,750,742,764,552,472,494,407,450,635,574,618]){
    await page.goto('/?legacyServiceReview=1&designReview='+id);await expect(page.locator('.design-frame')).toHaveAttribute('data-node-id','1144:'+id);await page.evaluate(()=>document.fonts.ready);await page.locator('.design-frame img').evaluateAll(images=>Promise.all(images.map(img=>(img as HTMLImageElement).decode())));
    await page.mouse.move(0,0);await shot(page,'figma-'+id);
    expect(await page.locator('.design-frame img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  }expect(errors).toEqual([]);
});

test('Cardboard full journey uses real gaze hits through simulation, conversation and booking',async({page})=>{
  test.setTimeout(100_000);await page.setViewportSize({width:1000,height:600});await page.goto('/?fishingUiReview=1&legacyServiceReview=1');await click(page,'nav:cardboard-guide');await click(page,'cardboard-start');await route(page,'login');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  async function gaze(action:string){
    await page.keyboard.press('r');
    const node=page.locator(`.design-frame [data-action="${action}"]`).first();await expect(node).toBeAttached();
    const box=(await node.boundingBox())!,frame=(await page.locator('.design-frame').boundingBox())!,scale=frame.width/1200;
    const x=(box.x+box.width/2-frame.x)/scale,y=(box.y+box.height/2-frame.y)/scale;
    const pose=await page.evaluate(()=>window.__XR_DEBUG__!.snapshot().player);
    const yaw=Math.atan2((x-600)*3/1200,2.8),pitch=Math.atan2((300-y)*1.5/600,Math.hypot((x-600)*3/1200,2.8));
    await page.mouse.move(500,300);await page.mouse.down();await page.mouse.move(500+yaw/.004,300-(pitch-pose.pitch)/.004,{steps:8});await page.mouse.up();
    // No DOM click or success adapter: the rendered plane's actual ray hit and
    // uninterrupted dwell invoke the same application action as PC input.
    await page.waitForTimeout(1400);
  }
  await gaze('login');await route(page,'avatar');await gaze('avatar-next');await gaze('nav:neighborhood-choice');await gaze('neighborhood:jayang');await route(page,'my-room');
  await gaze('nav:modes');await gaze('mode:solo');await gaze('join:fish');await route(page,'simulation');
  const before=await page.evaluate(()=>window.__XR_DEBUG__!.snapshot().player.position);await gaze('step:forward');const after=await page.evaluate(()=>window.__XR_DEBUG__!.snapshot().player.position);expect(Math.hypot(after[0]-before[0],after[2]-before[2])).toBeGreaterThan(.1);
  await gaze('finish');await route(page,'rating');await gaze('mode-rating:4');await gaze('people-rating:5');for(const id of ['chang','ryo','707'])await gaze('person-rating:'+id);await gaze('rate');await route(page,'rating-done');await gaze('home');await route(page,'my-room');
  await gaze('nav:chat');await gaze('chat-preset');await expect(page.locator('.ds-list')).toContainText('오늘 함께해서');await gaze('home');await route(page,'my-room');await gaze('nav:appointments');await gaze('appointment-start');
  const date=(await page.locator('.calendar [data-action^="date:"]').nth(15).getAttribute('data-action'))!;await gaze(date);await gaze('time:17:00');await gaze('appointment-next');await gaze('place:park');await gaze('appointment-create');await route(page,'appointment-done');await shot(page,'service-cardboard-appointment');
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('xr-spatial-service-demo-v1')!));expect(data.ratings).toHaveLength(1);expect(data.appointments).toHaveLength(1);expect(errors).toEqual([]);
  await gaze('cardboard-stop');await expect(page.locator('.service-shell')).not.toHaveClass(/immersive/);
});
