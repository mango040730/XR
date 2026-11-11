import { test,expect,snapshot,screenshot, lookAt } from './fixtures';
import type { Page } from '@playwright/test';
async function look(page:Page,yaw:number,pitch:number){
 await page.locator('canvas').click();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(false);
 await page.mouse.move(720,500);
 await lookAt(page,yaw,pitch);
}
test('forest background shows faceted broadleaf trees and parallax outside both windows',async({page},info)=>{
 test.setTimeout(60_000);
 await page.goto('/?offline=1&fishing&ui=1&fishingUiReview=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 await look(page,-Math.PI/2,.08);await page.keyboard.press('Escape');await screenshot(page,info,'forest-east-window');
 const start=(await snapshot(page)).player.position;
 await look(page,-Math.PI/2,.08);await page.keyboard.down('a');
 try{await expect.poll(async()=>Math.abs((await snapshot(page)).player.position[2]-start[2])).toBeGreaterThan(.25);}
 finally{await page.keyboard.up('a');}
 await page.keyboard.press('Escape');await screenshot(page,info,'forest-east-parallax');
 await page.locator('[data-help]').click();await page.locator('[data-do="review"]').click();await page.locator('[data-close]').click();
 await screenshot(page,info,'forest-room-overview');
 await page.locator('[data-help]').click();await page.locator('[data-do="opposite"]').click();await page.locator('[data-close]').click();
 await look(page,Math.PI/2,.08);await page.keyboard.press('Escape');await screenshot(page,info,'forest-west-window');
 expect((await snapshot(page)).world.activeId).toBe('indoor-fishing');
});
