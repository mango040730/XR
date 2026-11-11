import {test,expect,snapshot,screenshot,lookAt} from './fixtures';

test('bowling seating remains readable without washed-out floor and furniture highlights',async({page},info)=>{
 test.setTimeout(90000);await page.goto('/?offline=1');await page.locator('[data-action="mode:team"]').click();await expect.poll(()=>page.evaluate(()=>window.__XR_DEBUG__?.snapshot().world.activeId),{timeout:40000}).toBe('bowling');
 await screenshot(page,info,'bowling-lighting-entry');
 const walk=async(key:string,axis:number,predicate:(n:number)=>boolean)=>{await page.keyboard.down(key);try{await expect.poll(async()=>predicate((await snapshot(page)).player.position[axis]),{timeout:14000,intervals:[20]}).toBe(true);}finally{await page.keyboard.up(key);}};
 await walk('d',0,n=>n>6.55);await walk('w',2,n=>n< -6.55);
 const pose=(await snapshot(page)).player;await lookAt(page,Math.atan2(pose.position[0],pose.position[2]+2.8),Math.atan2(-.8,Math.hypot(pose.position[0],pose.position[2]+2.8)));
 await screenshot(page,info,'bowling-lighting-seating');
 // Measure the actual rendered lower floor, without UI or mutable engine diagnostics.
 const light=await page.evaluate(async()=>{
  const source=document.querySelector('canvas')!;
  const src=await new Promise<string>(resolve=>requestAnimationFrame(()=>resolve(source.toDataURL('image/png'))));
  const img=new Image();img.src=src;await img.decode();const canvas=new OffscreenCanvas(img.width,img.height),ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);
  const {data}=ctx.getImageData(Math.floor(img.width*.12),Math.floor(img.height*.72),Math.floor(img.width*.76),Math.floor(img.height*.25));
  let luminance=0,washed=0,count=0;for(let i=0;i<data.length;i+=4){luminance+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];washed+=Number(Math.min(data[i],data[i+1],data[i+2])>=242);count++;}
  return {mean:luminance/count,washedFraction:washed/count};
 });
 await info.attach('floor-highlight-measurement',{body:JSON.stringify(light),contentType:'application/json'});
 expect(light.mean).toBeGreaterThan(60);expect(light.washedFraction).toBeLessThan(.12);
});
