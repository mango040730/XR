import {test,expect,snapshot,screenshot} from './fixtures';

for(const url of ['/?fishing','/?fishing&ui=1'])test(`fishing view ${url} keeps minimal mode navigation while mouse WASD and fishing keys remain active`,async({page},info)=>{
 await page.goto(url.replace('/?', '/?offline=1&'));await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 const assertClear=async()=>{
  await expect(page.locator('.fishing-hud')).toBeHidden();
  await expect(page.locator('.fishing-hud > *')).toHaveCount(0);
  await expect(page.locator('button:visible,a:visible,input:visible')).toHaveCount(1);
  expect((await snapshot(page)).interactables.filter(i=>/^(cast:|stand:|home$|samples$|quality$)/.test(i.id))).toHaveLength(0);
 };
 await assertClear();await screenshot(page,info,'space-only-entry');
 await page.locator('canvas').click();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
 await page.mouse.move(720,500);const pose=(await snapshot(page)).player;
 await page.mouse.move(720+(pose.yaw-Math.PI/2)/.002,500);
 await page.keyboard.down('w');try{await expect.poll(async()=>(await snapshot(page)).player.position[0],{intervals:[30]}).toBeLessThan(1.5);}finally{await page.keyboard.up('w');}
 await page.keyboard.press('e');await expect.poll(async()=>(await snapshot(page)).fishing.user.seatId).toBe('S3');
 await page.keyboard.press('f');expect((await snapshot(page)).fishing.user.fishing).toBe('cast');
 await assertClear();await page.keyboard.press('Escape');await screenshot(page,info,'space-only-seated');
 await page.keyboard.press('f');expect((await snapshot(page)).fishing.user.fishing).toBe('idle');
 await page.keyboard.press('q');expect((await snapshot(page)).fishing.user.seatId).toBeNull();
 await page.setViewportSize({width:390,height:844});await assertClear();await screenshot(page,info,'space-only-mobile');
 await page.locator('.fix-space-next').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');
});

test('service fishing simulation hides its chrome and banners while other service screens keep UI',async({page},info)=>{
 await page.goto('/?offline=1&ui=1&legacyServiceReview=1');await expect(page.locator('.service-shell')).toHaveAttribute('data-route','login');
 const click=async(action:string)=>page.locator(`[data-action="${action}"]`).first().click();
 await click('login');await page.getByRole('textbox',{name:'닉네임',exact:true}).fill('물가친구');await click('avatar-next');
 await click('nav:neighborhood-choice');await click('neighborhood:jayang');await click('nav:modes');await click('mode:solo');await click('join:fish');
 await expect(page.locator('.service-shell')).toHaveAttribute('data-route','simulation');
 await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.activeId==='indoor-fishing'&&window.__XR_DEBUG__?.snapshot().world.status==='ready');
 await expect(page.locator('.fishing-hud,.service-stage,.service-chrome')).toHaveCount(3);
 for(const selector of ['.fishing-hud','.service-stage','.service-chrome'])await expect(page.locator(selector)).toBeHidden();
 await expect(page.locator('.fishing-hud > *,.service-chrome > *,.simulation-hud > *')).toHaveCount(0);
 await expect(page.locator('button:visible,a:visible,input:visible')).toHaveCount(0);await screenshot(page,info,'space-only-service');
 await page.goBack();
 await expect(page.locator('.service-shell')).toHaveAttribute('data-route','loading');
 await page.goBack();
 await expect(page.locator('.service-shell')).toHaveAttribute('data-route','servers');
 await expect(page.locator('.service-stage')).toBeVisible();
 await expect(page.locator('.service-chrome')).toBeVisible();
});

test('Cardboard fishing shows only the stereoscopic world without a service panel or reticle',async({page},info)=>{
 await page.setViewportSize({width:1000,height:600});await page.goto('/?offline=1&ui=1&legacyServiceReview=1');
 const click=async(action:string)=>page.locator(`[data-action="${action}"]`).first().click();
 await click('login');await click('avatar-next');await click('nav:neighborhood-choice');await click('neighborhood:jayang');
 await click('nav:cardboard-guide');await click('cardboard-start');
 async function gaze(action:string){
  await page.keyboard.press('r');
  const node=page.locator(`[data-action="${action}"]`).first();await expect(node).toBeAttached();
  const box=(await node.boundingBox())!,frame=(await page.locator('.design-frame').boundingBox())!,scale=frame.width/1200;
  const x=(box.x+box.width/2-frame.x)/scale,y=(box.y+box.height/2-frame.y)/scale;
  const pose=(await snapshot(page)).player;
  const yaw=Math.atan2((x-600)*3/1200,2.8),pitch=Math.atan2((300-y)*1.5/600,Math.hypot((x-600)*3/1200,2.8));
  await page.mouse.move(500,300);await page.mouse.down();await page.mouse.move(500+yaw/.004,300-(pitch-pose.pitch)/.004,{steps:8});await page.mouse.up();
  await page.waitForTimeout(1400);
 }
 await gaze('nav:modes');await gaze('mode:solo');await gaze('join:fish');
 await expect(page.locator('.service-shell')).toHaveClass(/fishing-space-only/);
 await expect(page.locator('.service-shell')).toHaveClass(/immersive/);
 await expect(page.locator('.fishing-hud > *,.service-chrome > *,.simulation-hud > *')).toHaveCount(0);
 await expect(page.locator('button:visible,a:visible,input:visible')).toHaveCount(0);
 expect((await snapshot(page)).interactables.filter(i=>/^(cast:|stand:|home$|samples$|quality$)/.test(i.id))).toHaveLength(0);
 await screenshot(page,info,'space-only-cardboard');
});
