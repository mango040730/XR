import {lookAt} from './fixtures';
import { test,expect,chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const origin='http://127.0.0.1:4175';
const snap=(page:Page)=>page.evaluate(()=>window.__SOCIAL_DEBUG__!.snapshot());
async function enter(page:Page,room:string,name:string){
  await page.goto(`${origin}/?room=${room}#my-room`);
  await expect.poll(()=>page.evaluate(()=>!!window.__SOCIAL_DEBUG__?.snapshot().local)).toBe(true);
  await page.getByLabel('닉네임',{exact:true}).fill(name);await page.locator('[data-action="social-join"]').click();
  await expect.poll(async()=>(await snap(page)).id).toBeTruthy();
}
async function walk(page:Page,key:string,predicate:(position:number[])=>boolean){
  await page.keyboard.down(key);
  try{await expect.poll(async()=>predicate((await page.evaluate(()=>window.__XR_DEBUG__!.snapshot())).player.position),{timeout:12000,intervals:[30]}).toBe(true);}
  finally{await page.keyboard.up(key);}
}
async function unlock(page:Page){await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(false);}

test('first person stays at eye height and never shows the local avatar while walking',async({page})=>{
  await page.goto(`${origin}/#my-room`);await expect.poll(()=>page.evaluate(()=>!!window.__SOCIAL_DEBUG__?.snapshot().local)).toBe(true);
  expect((await snap(page)).thirdPerson).toBe(false);expect((await snap(page)).camera.local).toEqual([0,1.65,0]);expect((await snap(page)).local!.visible).toBe(false);
  await walk(page,'w',p=>p[2]>-.9);const result=await snap(page);expect(result.camera.position[1]).toBeCloseTo(1.67);expect(result.camera.local).toEqual([0,1.65,0]);expect(result.local!.visible).toBe(false);
});

test('two actual browser processes share movement, real GLB actions, exclusive seating, chat and departure',async({page},info)=>{
  const second=await chromium.launch({channel:'chromium',args:[]});const b=await second.newPage({viewport:{width:1280,height:800}});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));b.on('pageerror',e=>errors.push(e.message));
  let requests=0;page.on('response',r=>{if(r.url().endsWith('/avatars/cub-scout-v6.glb'))requests++;});
  try{
    const room='pair-'+Date.now();await enter(page,room,'사용자 A');
    expect((await snap(page)).users).toHaveLength(1);expect((await snap(page)).remotes).toHaveLength(0);
    await enter(b,room,'사용자 B');await expect.poll(async()=>(await snap(page)).remotes.length).toBe(1);await expect.poll(async()=>(await snap(b)).remotes.length).toBe(1);
    expect(requests).toBe(1);expect((await snap(page)).thirdPerson).toBe(false);expect((await snap(page)).local!.visible).toBe(false);expect((await snap(b)).remotes[0].visible).toBe(true);
    await page.mouse.click(640,420);await page.keyboard.down('w');
    await expect.poll(async()=>(await snap(b)).remotes[0].animation).toBe('walk');await page.keyboard.up('w');
    const aId=(await snap(page)).id;await expect.poll(async()=>(await snap(b)).users.find(u=>u.id===aId)!.position[2]).toBeLessThan(5.9);
    await b.keyboard.press('1');await expect.poll(async()=>(await snap(page)).remotes[0].animation).toBe('wave');await expect.poll(async()=>(await snap(page)).remotes[0].animation).toBe('idle');
    await page.keyboard.press('e');
    await expect.poll(async()=>(await snap(page)).users.find(u=>u.id===aId)!.seatId).toBe('owner-chair');await expect.poll(async()=>(await snap(b)).remotes[0].animation).toBe('sit');
    expect((await snap(page)).local!.visible).toBe(false);expect((await snap(page)).camera.local).toEqual([0,1.12,0]);expect((await snap(b)).remotes[0].visible).toBe(true);
    const bId=(await snap(b)).id;
    await walk(b,'w',p=>p[2]>-1.0);await b.keyboard.press('e');
    await expect(b.locator('.social-error')).toContainText('다른 사용자');expect((await snap(b)).users.find(u=>u.id===bId)!.seatId).toBeNull();

    await unlock(page);await page.locator('[data-action="social-chat-toggle"]').click();await page.getByLabel('메시지',{exact:true}).fill('<b>안녕하세요</b>');await page.locator('[data-action="social-send"]').click();
    await unlock(b);await b.locator('[data-action="social-chat-toggle"]').click();await expect(b.locator('.social-log')).toContainText('<b>안녕하세요</b>');await expect(b.locator('.social-log b')).toHaveCount(0);
    await mkdir('test-results/screenshots',{recursive:true});await b.screenshot({path:'test-results/screenshots/social-two-users.png'});await info.attach('two-users',{path:'test-results/screenshots/social-two-users.png',contentType:'image/png'});

    await page.close();await expect.poll(async()=>(await snap(b)).remotes.length).toBe(0);
    await b.keyboard.press('e');await expect.poll(async()=>(await snap(b)).users.find(u=>u.id===bId)!.seatId).toBe('owner-chair');
    expect(errors).toEqual([]);
  }finally{await second.close();}
});

test('different rooms stay isolated; switching a world and reconnecting clear the prior membership',async({page,browser})=>{
  const context=await browser.newContext({viewport:{width:1280,height:800}});const b=await context.newPage();
  try{
    const room='isolation-'+Date.now();await enter(page,room,'A');await enter(b,room+'-other','B');
    expect((await snap(page)).users).toHaveLength(1);expect((await snap(b)).remotes).toHaveLength(0);
    await b.goto(`${origin}/?room=${room}#my-room`);await b.getByLabel('닉네임',{exact:true}).fill('B');await b.locator('[data-action="social-join"]').click();
    await expect.poll(async()=>(await snap(page)).users.length).toBe(2);
    await b.route('**/test-room/scene.glb',route=>route.fulfill({status:404,body:'missing'}));
    await b.locator('.service-stage [data-action="nav:modes"]').click();await b.locator('[data-action="mode:team"]').click();
    await expect(b.locator('.fix-mode-notice')).toContainText('공간을 열지 못했어요');expect((await snap(b)).room).toBe('my-room:'+room);
    await b.keyboard.press('m');await walk(b,'w',p=>p[2]>-.9);
    const bId=(await snap(b)).id;await expect.poll(async()=>(await snap(page)).users.find(u=>u.id===bId)?.position[2]??-2).toBeGreaterThan(-.9);
    await unlock(b);
    await b.locator('.service-stage [data-action="nav:modes"]').click();await b.locator('[data-action="mode:social"]').click();
    await expect.poll(async()=>(await snap(b)).room).toBe('indoor-fishing:'+room);await expect.poll(async()=>(await snap(page)).users.length).toBe(1);expect((await snap(b)).remotes).toHaveLength(0);
    const id=(await snap(page)).id;await page.context().setOffline(true);await expect.poll(async()=>(await snap(page)).id).toBeNull();await page.context().setOffline(false);
    await expect.poll(async()=>(await snap(page)).id,{timeout:20000}).toBeTruthy();expect((await snap(page)).id).not.toBe(id);expect((await snap(page)).users).toHaveLength(1);
  }finally{await context.close();}
});

test('explicit microphone opt-in negotiates real WebRTC audio, spatial range, mute and cleanup',async({page,browser})=>{
  const context=await browser.newContext({viewport:{width:1280,height:800},permissions:['microphone']});const b=await context.newPage();
  try{
    const room='voice-'+Date.now();await enter(page,room,'목소리 A');await enter(b,room,'목소리 B');
    expect((await snap(page)).voice.enabled).toBe(false);expect((await snap(page)).voice.peers).toBe(0);
    await page.locator('[data-action="social-voice"]').click();expect((await snap(b)).voice.enabled).toBe(false);
    await b.locator('[data-action="social-voice"]').click();
    const voice=(p:Page)=>p.evaluate(()=>window.__SOCIAL_DEBUG__!.voice());
    await expect.poll(async()=>(await voice(page))[0]?.received??0,{timeout:20000}).toBeGreaterThan(0);await expect.poll(async()=>(await voice(b))[0]?.received??0).toBeGreaterThan(0);
    await expect.poll(async()=>(await voice(page))[0]?.gain??0).toBeGreaterThan(.9);
    await b.locator('[data-action="social-mute"]').click();expect((await snap(b)).voice.muted).toBe(true);await b.locator('[data-action="social-mute"]').click();
    await lookAt(b,0);
    // Pass the actual portal plant instead of trying to walk through its GLB collision box.
    await walk(b,'a',p=>p[0]<2.5);
    await walk(b,'w',p=>p[2]<-3.15);await expect.poll(async()=>(await voice(page))[0]?.gain??1).toBeLessThan(.999);
    await walk(b,'s',p=>p[2]>-2.0);await expect.poll(async()=>(await voice(page))[0]?.gain??0).toBeGreaterThan(.999);
    await unlock(b);await b.locator('[data-action="social-voice"]').click();await expect.poll(async()=>(await snap(page)).voice.peers).toBe(0);expect((await snap(b)).voice.enabled).toBe(false);
  }finally{await context.close();}
});
