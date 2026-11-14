import { expect, test } from '@playwright/test';

test('неизвестный путь показывает страницу 404 с переходом на главную', async ({ page }) => {
  await page.goto('/no-such-page');

  await expect(page.getByText('404', { exact: false })).toBeVisible();

  await page.getByRole('main').getByRole('link', { name: 'На главную' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Календарь звонков' })).toBeVisible();
});
