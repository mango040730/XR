import { test,expect,snapshot,screenshot } from './fixtures';

test('neumorphic fishing controls expose keyboard focus switches pressed and disabled states',async({page},info)=>{
 await page.goto('/?offline=1&fishing&ui=1&fishingUiReview=1');await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.status==='ready');
 await screenshot(page,info,'neumorphic-fishing-desktop');
 // The brand, home, then help are reachable through normal keyboard navigation.
 await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Tab');
 await expect(page.locator('[data-help]')).toBeFocused();
 await expect(page.locator('[data-help]')).toHaveCSS('outline-style','solid');await screenshot(page,info,'neumorphic-keyboard-focus');
 await page.keyboard.press('Enter');await expect(page.locator('.fh-guide')).toBeVisible();await expect(page.locator('[data-help]')).toHaveAttribute('aria-expanded','true');
 await page.locator('[data-help]').hover();await expect(page.locator('[data-help]')).toHaveCSS('box-shadow',/inset/);
 await page.locator('[data-low]').check();expect((await snapshot(page)).fishing.low).toBe(true);
 await expect(page.getByRole('switch',{name:/가벼운 그래픽/})).toBeChecked();
 await page.locator('[data-low]').evaluate(node=>Promise.all(node.getAnimations({subtree:true}).map(animation=>animation.finished)));
 await screenshot(page,info,'neumorphic-help-and-switches');
 await page.locator('[data-low]').uncheck();await page.locator('[data-close]').click();
 const disabled=page.locator('[data-vr] button:disabled');
 if(await disabled.count())await expect(disabled).toHaveCSS('box-shadow','none');
 await page.setViewportSize({width:390,height:844});await screenshot(page,info,'neumorphic-fishing-mobile');
 await page.locator('[data-help]').click();await expect(page.locator('.fh-guide')).toBeVisible();
 await screenshot(page,info,'neumorphic-help-mobile');
 const close=await page.locator('[data-close]').boundingBox();expect(close).not.toBeNull();expect(close!.x+close!.width).toBeLessThanOrEqual(390);
 await page.locator('[data-close]').click();await expect(page.locator('.fh-guide')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('neumorphic service login and text inputs keep their native actions',async({page},info)=>{
 await page.goto('/?ui=1&legacyServiceReview=1');await expect(page.locator('.service-shell')).toHaveAttribute('data-route','login');
 await page.getByRole('textbox',{name:'이메일 (데모 입력)'}).fill('visitor@example.com');
 await page.locator('input[name=password]').fill('demo');
 await expect(page.locator('input[name=email]')).toHaveCSS('box-shadow',/inset/);
 await screenshot(page,info,'neumorphic-service-login');
 await page.getByRole('button',{name:'데모 로그인',exact:true}).click();await expect(page.locator('.service-shell')).toHaveAttribute('data-route','avatar');
 await screenshot(page,info,'neumorphic-service-avatar');
});

test('neumorphic service simulation keeps fishing controls clear of service navigation',async({page},info)=>{
 await page.goto('/?ui=1&fishingUiReview=1&legacyServiceReview=1');
 const click=async(action:string)=>page.locator(`[data-action="${action}"]`).first().click();
 await click('login');await page.getByRole('textbox',{name:'닉네임',exact:true}).fill('물가친구');await click('avatar-next');
 await click('nav:neighborhood-choice');await click('neighborhood:jayang');await click('nav:modes');await click('mode:social');await click('join:fish');
 await page.waitForFunction(()=>window.__XR_DEBUG__?.snapshot().world.activeId==='indoor-fishing');await expect(page.locator('.fishing-hud')).toBeVisible();
 await screenshot(page,info,'neumorphic-service-fishing');
 const footer=await page.locator('.fh-footer').boundingBox(),chrome=await page.locator('.service-chrome').boundingBox();
 expect(footer!.y+footer!.height).toBeLessThan(chrome!.y);
 await click('nav:pause');await expect(page.locator('.service-shell')).toHaveAttribute('data-route','pause');await screenshot(page,info,'neumorphic-service-pause');
 await click('nav:simulation');await expect(page.locator('.fishing-hud')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await screenshot(page,info,'neumorphic-service-fishing-mobile');
 const mobileFooter=await page.locator('.fh-footer').boundingBox(),mobileChrome=await page.locator('.service-chrome').boundingBox();
 expect(mobileFooter!.y+mobileFooter!.height).toBeLessThan(mobileChrome!.y);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
