import {test,expect} from './fixtures';
test('pre-entry connection placeholders never appear on home, content, rating or booking pages',async({page})=>{
 test.setTimeout(90000);await page.goto('/');await expect(page.locator('.social-ui')).toBeAttached();
 const clean=async()=>{await expect(page.getByText('입장 전',{exact:true})).toHaveCount(0);await expect(page.getByText('실시간 연결을 준비 중입니다.',{exact:true})).toHaveCount(0);await expect(page.locator('.social-status')).toBeHidden();};
 await clean();await page.locator('[data-action="mode:team"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','simulation',{timeout:40000});await clean();
 await page.locator('[data-action="finish"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','rating');await clean();
 await page.locator('[data-action="mode-rating:4"]').click();await page.locator('[data-action="people-rating:5"]').click();await page.locator('[data-action="rate"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes',{timeout:40000});await page.getByRole('button',{name:'약속잡기',exact:true}).click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-date');await clean();
 await page.locator('.calendar [data-action^="date:"]').nth(15).click();await page.locator('[data-action="time:17:00"]').click();await page.locator('[data-action="appointment-next"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','appointment-place');await clean();
 await page.locator('[data-action="home"]').click();await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route','modes',{timeout:40000});await clean();
});
