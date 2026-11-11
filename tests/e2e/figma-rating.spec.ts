import {test,expect,snapshot,screenshot} from './fixtures';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

test('both Figma rating layouts retain their original stars, geometry and separate preview identities',async({page},info)=>{
 await page.setViewportSize({width:1200,height:600});const audit=[];
 for(const [id,cards] of [['115:403',['115:406','115:421']],['115:442',['115:445','115:460','115:475']]] as const){
  await page.goto('/?designReview='+id);await expect(page.locator('.service-stage>.fix-frame')).toHaveAttribute('data-node-id',id);
  await page.evaluate(()=>document.fonts.ready);await page.locator('.updated-frame img').evaluateAll(nodes=>Promise.all(nodes.map(n=>(n as HTMLImageElement).decode())));
  const assets=await page.locator('.updated-frame img').evaluateAll(nodes=>nodes.map(n=>{const i=n as HTMLImageElement,b=i.getBoundingClientRect();return {path:new URL(i.src).pathname,slot:i.closest('[data-node-id]')?.getAttribute('data-node-id'),naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,x:b.x,y:b.y,width:b.width,height:b.height};}));
  expect(assets).toHaveLength(cards.length*5);
  for(const a of assets){expect(a.path).toContain('/assets/figma-update/');expect(a.slot).toBeTruthy();expect(a.naturalWidth).toBe(38);expect(a.naturalHeight).toBe(38);expect(a.width).toBe(38);expect(a.height).toBe(38);expect((await stat(resolve('public','.'+a.path))).size).toBeGreaterThan(0);}
  for(const [i,card] of cards.entries()){const b=(await page.locator('[data-node-id="'+card+'"]').boundingBox())!;expect(b.x).toBeCloseTo(189+i*(cards.length===2?420:281));expect(b.y).toBe(216);expect(b.width).toBe(cards.length===2?400:261);expect(b.height).toBe(215);}
  expect(await page.getByText('친구 평가하기',{exact:true}).count()).toBe(cards.length===3?1:0);
  await screenshot(page,info,'rating-reference-'+id.replace(':','-'));audit.push({id,assets});
 }
 await mkdir('test-results/figma-rating',{recursive:true});await writeFile('test-results/figma-rating/assets.json',JSON.stringify(audit,null,2));
});

test('live evaluation defaults to rating1, preserves the captured content, and saves only the two required ratings',async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width:1200,height:600});await page.goto('/?offline=1');await page.locator('[data-action="mode:team"]').click();
 await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation',{timeout:40000});const before=await snapshot(page);
 await page.locator('[data-action="finish"]').click();await expect(page.locator('.service-stage>.fix-frame')).toHaveAttribute('data-node-id','115:403');
 expect((await snapshot(page)).activeRootId).toBe(before.activeRootId);expect((await snapshot(page)).worldFrozen).toBe(true);
 const image=await page.locator('.rating-space-frame').getAttribute('src');expect(image).toContain('data:image/png');
 await expect(page.getByText('친구 평가하기',{exact:true})).toHaveCount(0);await expect(page.locator('.fix-star')).toHaveCount(10);await expect(page.locator('.fix-star[aria-pressed=true]')).toHaveCount(0);
 await expect(page.locator('[data-action="rate"]')).toBeDisabled();await page.locator('[data-action="mode-rating:3"]').click();await expect(page.locator('[data-action="rate"]')).toBeDisabled();
 await page.locator('[data-action="people-rating:4"]').click();await expect(page.locator('.fix-star[aria-pressed=true]')).toHaveCount(7);await expect(page.locator('[data-action="rate"]')).toBeEnabled();expect(await page.locator('.rating-space-frame').getAttribute('src')).toBe(image);
 await screenshot(page,info,'rating1-live');await expect(page.locator('.fix-rating-notice')).toBeHidden({timeout:6000});await page.locator('[data-action="mode-rating:5"]').click();await expect(page.locator('.fix-rating-notice')).toBeHidden();
 await page.locator('[data-action="rate"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-date');
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('xr-spatial-service-demo-v1')!));expect(data.ratings).toHaveLength(1);expect(data.ratings[0].modeRating).toBe(5);expect(data.ratings[0].peopleRating).toBe(4);
});
