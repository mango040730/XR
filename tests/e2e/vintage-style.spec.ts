import { mkdir,writeFile } from 'node:fs/promises';
import { test,expect,snapshot,screenshot, lookAt } from './fixtures';

test('vintage teal and walnut render in sunlight and pendant light from both sides',async({page},info)=>{
 test.setTimeout(60_000);
 await page.goto('/?offline=1&fishing&ui=1&fishingUiReview=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 await screenshot(page,info,'vintage-entry');
 await page.locator('[data-help]').click();await page.locator('[data-do="review"]').click();await page.locator('[data-close]').click();
 await screenshot(page,info,'vintage-overview');
 await page.locator('canvas').click();await page.mouse.move(720,500);
 await lookAt(page,.86,-.5);
 await page.keyboard.press('Escape');await screenshot(page,info,'vintage-water-and-materials');
 await page.locator('[data-help]').click();await page.locator('[data-do="opposite"]').click();await page.locator('[data-close]').click();
 await screenshot(page,info,'vintage-opposite');
 const performanceSample=await page.evaluate(async()=>{
  const intervals:number[]=[];let previous=performance.now();
  for(let i=0;i<70;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>=10)intervals.push(now-previous);previous=now;}
  intervals.sort((a,b)=>a-b);return {viewport:[innerWidth,innerHeight],samples:intervals.length,medianMs:intervals[30],p95Ms:intervals[57],render:window.__XR_DEBUG__!.snapshot().render};
 });
 await mkdir('test-results',{recursive:true});await writeFile('test-results/vintage-performance.json',JSON.stringify(performanceSample,null,2));
 await page.locator('[data-help]').click();await page.locator('[data-low]').check();await page.locator('[data-close]').click();
 await screenshot(page,info,'vintage-low');
 await page.setViewportSize({width:390,height:844});await screenshot(page,info,'vintage-mobile');
 expect((await snapshot(page)).world.activeId).toBe('indoor-fishing');
});
