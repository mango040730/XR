import {test,expect,snapshot,screenshot} from './fixtures';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

test('latest appointment references preserve all original assets and the three panel layouts',async({page},info)=>{
 await page.setViewportSize({width:1200,height:600});const audit=[];
 for(const [id,panel,x,y,w,h] of [['115:496','115:508',423,152,728,377],['115:563','115:575',423,152,728,377],['115:704','115:707',423,149,354,409]] as const){
  await page.goto('/?designReview='+id);await expect(page.locator('.service-stage>.updated-frame')).toHaveAttribute('data-node-id',id);await page.evaluate(()=>document.fonts.ready);await page.locator('.updated-frame img').evaluateAll(nodes=>Promise.all(nodes.map(n=>(n as HTMLImageElement).decode())));
  const b=(await page.locator('[data-node-id="'+panel+'"]').boundingBox())!;expect(b.x).toBeCloseTo(x,0);expect(b.y).toBe(y);expect(b.width).toBeCloseTo(w,0);expect(b.height).toBe(h);
  const assets=await page.locator('.updated-frame img').evaluateAll(nodes=>nodes.map(n=>{const i=n as HTMLImageElement,b=i.getBoundingClientRect();return {slot:i.closest('[data-node-id]')?.getAttribute('data-node-id'),path:new URL(i.src).pathname,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,x:b.x,y:b.y,width:b.width,height:b.height};}));
  expect(assets).toHaveLength(id==='115:496'?6:id==='115:563'?8:5);
  for(const a of assets){expect(a.path).toContain('/assets/figma-update/');expect(a.slot).toBeTruthy();expect(a.naturalWidth).toBeGreaterThan(0);expect(a.width).toBeGreaterThan(0);expect(a.height).toBeGreaterThan(0);expect((await stat(resolve('public','.'+a.path))).size).toBeGreaterThan(0);}
  audit.push({id,assets});await screenshot(page,info,'appointment-reference-'+id.replace(':','-'));
 }
 await mkdir('test-results/figma-appointment',{recursive:true});await writeFile('test-results/figma-appointment/assets.json',JSON.stringify(audit,null,2));
});

test('saved appointment shows actual details, returns after ten seconds, and cancels the old deadline after manual exit',async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width:1200,height:600});await page.goto('/?offline=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');await page.getByRole('button',{name:'약속잡기',exact:true}).click();
 await expect(page.locator('.service-stage>.fix-frame')).toHaveAttribute('data-node-id','115:496');await expect(page.locator('[data-action="appointment-next"]')).toBeDisabled();const date=page.locator('.calendar [data-action^="date:"]').nth(15),selected=(await date.getAttribute('data-action'))!.slice(5);await date.click();await page.locator('[data-action="time:17:00"]').click();await page.locator('[data-action="appointment-next"]').click();
 await expect(page.locator('.service-stage>.fix-frame')).toHaveAttribute('data-node-id','115:563');await page.locator('[data-node-id="115:581"]').click();await expect(page.locator('[data-node-id="115:584"]')).toContainText('어린이대공원');const start=Date.now();await page.locator('[data-action="appointment-create"]').click();
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-done');await expect(page.locator('.service-stage>.fix-frame')).toHaveAttribute('data-node-id','115:704');await expect(page.locator('[data-node-id="115:712"]')).toContainText('어린이대공원');await expect(page.locator('[data-node-id="115:713"]')).toContainText(selected.replaceAll('-','.'));await expect(page.locator('[data-node-id="115:713"]')).toContainText('17:00');await expect(page.getByText('[채영짱]과 작당모의 완료!',{exact:true})).toHaveCount(0);expect((await snapshot(page)).world.activeId).toBe('my-room');await screenshot(page,info,'appointment-complete-live');
 await page.waitForTimeout(Math.max(0,8500-(Date.now()-start)));await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-done');await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes',{timeout:4000});expect(Date.now()-start).toBeGreaterThanOrEqual(9900);
 await page.getByRole('button',{name:'약속잡기',exact:true}).click();await page.locator('[data-action="appointment-next"]').click();await page.locator('[data-action="appointment-create"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-done');await page.getByRole('button',{name:'마이룸으로 나가기',exact:true}).click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');await page.getByRole('button',{name:'약속잡기',exact:true}).click();await page.waitForTimeout(10500);await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-date');
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('xr-spatial-service-demo-v1')!));expect(data.appointments).toHaveLength(2);expect(data.appointments[0]).toMatchObject({date:selected,time:'17:00',place:'park'});await screenshot(page,info,'appointment-after-cancelled-return');
 await page.goto('/?offline=1#appointment-done');await page.reload();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes');
});
