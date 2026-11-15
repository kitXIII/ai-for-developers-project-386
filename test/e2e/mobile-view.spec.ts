import { expect, test } from '@playwright/test';

// Mantine `sm` breakpoint: below 576px the burger menu replaces the header buttons.
const isMobileViewport = (viewport: { width: number } | null) => (viewport?.width ?? 1280) < 576;

test('главная страница показывает заголовок и кнопку записи', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Календарь звонков' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Записаться' })).toBeVisible();
});

test('кнопка «Записаться» ведёт на страницу бронирования', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Записаться' }).click();

  await expect(page).toHaveURL('/booking');
  await expect(page.getByRole('heading', { name: 'Выбор типа встречи' })).toBeVisible();
});

test('страница администрирования открывается по прямой ссылке', async ({ page }) => {
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Администрирование' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Типы встреч' })).toBeVisible();
});

test.describe('мобильная навигация', () => {
  test.skip(({ viewport }) => !isMobileViewport(viewport), 'только мобильный проект');

  test('показывает бургер и прячет кнопку администрирования', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Переключить меню' })).toBeVisible();
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Администрирование' }),
    ).toBeHidden();
  });

  test('меню ведёт в администрирование и обратно на главную', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Переключить меню' }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'Администрирование' }).click();

    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('heading', { name: 'Администрирование' })).toBeVisible();

    await page.getByRole('button', { name: 'Переключить меню' }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'На главную' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Календарь звонков' })).toBeVisible();
  });
});

test.describe('десктопная навигация', () => {
  test.skip(({ viewport }) => isMobileViewport(viewport), 'только десктопный проект');

  test('показывает кнопку администрирования и прячет бургер', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Переключить меню' })).toBeHidden();
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Администрирование' }),
    ).toBeVisible();
  });

  test('кнопка в шапке ведёт в администрирование и обратно', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('banner').getByRole('link', { name: 'Администрирование' }).click();
    await expect(page).toHaveURL('/admin');

    await page.getByRole('banner').getByRole('link', { name: 'На главную' }).click();
    await expect(page).toHaveURL('/');
  });
});
