import { test, expect, snapshot, screenshot } from './fixtures';

test('solo enters the authored woodworking space; social enters fishing; real movement collides with the workbench', async ({ page }, info) => {
  test.setTimeout(90000);
  await page.goto('/?offline=1');
  await page.locator('[data-action="mode:solo"]').click();
  await expect.poll(async () => (await snapshot(page)).world.activeId, { timeout: 40000 }).toBe('woodworking');
  await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', 'simulation');
  await expect.poll(async () => (await snapshot(page)).render.triangles).toBeGreaterThan(10000);
  const start = await snapshot(page);
  expect(start.models[0].url).toContain('forest-atelier-original.glb');expect(start.models[0].meshes).toBe(43);
  expect(start.render.fov).toBe(77); expect(start.render.fog).toBe('d4dbbd');
  expect(start.player.position).toEqual([0, 0, 5.6]);
  await expect(page.locator('button:visible,a:visible,input:visible')).toHaveCount(5);
  await screenshot(page, info, 'woodworking-entry');
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(false);
  await page.keyboard.down('w');
  try { await expect.poll(async () => (await snapshot(page)).player.position[2], { timeout: 15000, intervals: [20] }).toBeLessThan(.5); }
  finally { await page.keyboard.up('w'); }
  await page.keyboard.down('a');
  try { await expect.poll(async () => (await snapshot(page)).player.position[0], { timeout: 8000 }).toBeLessThan(-1.4); await page.waitForTimeout(650); }
  finally { await page.keyboard.up('a'); }
  const stopped = (await snapshot(page)).player.position;
  expect(stopped[0]).toBeGreaterThanOrEqual(-1.61); expect(stopped[2]).toBeGreaterThan(-.5);
  await screenshot(page, info, 'woodworking-workbench');
  await page.keyboard.press('m');
  await page.locator('[data-action="mode:social"]').click();
  await expect.poll(async () => (await snapshot(page)).world.activeId, { timeout: 40000 }).toBe('indoor-fishing');
  const fishing = await snapshot(page);
  expect(fishing.render.fov).toBe(70); expect(fishing.render.fog).toBeNull();
  expect(fishing.worldRoots).toEqual(['world:indoor-fishing']); expect(fishing.disposed.geometry).toBeGreaterThan(0); expect(fishing.disposed.texture).toBeGreaterThan(0);
  await screenshot(page, info, 'social-fishing-entry');
  await page.keyboard.press('m'); await page.locator('[data-action="mode:solo"]').click();
  await expect.poll(async () => (await snapshot(page)).world.activeId, { timeout: 40000 }).toBe('woodworking');
  expect((await snapshot(page)).worldRoots).toEqual(['world:woodworking']);
  expect((await snapshot(page)).render.fov).toBe(77);
});

test('new atelier reports the actual GLB failure, retains my room and retries successfully',async({page,browserLog})=>{
 test.setTimeout(90000);const asset='/assets/models/woodworking-original/forest-atelier-original.glb';browserLog.expectedFailures.add(asset);browserLog.expectedConsole.add('목공방 GLB 로딩 실패');
 await page.goto('/?offline=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');const old=await snapshot(page);
 await page.route('**/woodworking-original/forest-atelier-original.glb',route=>route.fulfill({status:404,body:'missing'}));
 await page.locator('[data-action="mode:solo"]').click();await expect(page.locator('.fix-mode-notice')).toContainText('forest-atelier-original.glb');await expect(page.locator('.fix-mode-notice')).toContainText('HTTP 404');expect((await snapshot(page)).activeRootId).toBe(old.activeRootId);
 await page.unroute('**/woodworking-original/forest-atelier-original.glb');await page.locator('[data-action="mode:solo"]').click();await expect.poll(async()=>(await snapshot(page)).world.activeId,{timeout:40000}).toBe('woodworking');expect((await snapshot(page)).models[0].meshes).toBe(43);
});
