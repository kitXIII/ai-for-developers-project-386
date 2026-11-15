import { expect, test } from '@playwright/test';

// The dev server keeps meeting types in memory across tests, so every run
// creates types with unique names and asserts on its own data only.
const uniqueName = (prefix: string) => `${prefix} ${Date.now()}`;

test('владелец создаёт тип встречи в Modal и попадает на его детализацию', async ({ page }) => {
  const name = uniqueName('Созвон по проекту');

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Создать тип' }).click();

  await page.getByLabel('Название').fill(name);
  await page.getByLabel('Описание').fill('Обсуждаем статус проекта');
  await page.getByLabel('Длительность (минуты)').fill('25');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();

  // После успешного создания — автоматический переход на детализацию.
  await expect(page).toHaveURL(/\/admin\/meeting-types\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText('Длительность: 25 мин')).toBeVisible();
  await expect(page.getByText('Обсуждаем статус проекта')).toBeVisible();
});

test('созданный тип встречи виден в списке типов', async ({ page }) => {
  const name = uniqueName('Лекция');

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Создать тип' }).click();
  await page.getByLabel('Название').fill(name);
  await page.getByLabel('Длительность (минуты)').fill('45');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();

  await expect(page).toHaveURL(/\/admin\/meeting-types\//);
  await page.getByRole('link', { name: 'К списку типов' }).click();

  await expect(page).toHaveURL('/admin');
  await expect(page.getByRole('tab', { name: 'Типы встреч' })).toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
});

test('форма создания типа показывает понятные ошибки валидации', async ({ page }) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Создать тип' }).click();

  await page.getByLabel('Длительность (минуты)').fill('3');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();

  await expect(
    page.getByText('Название обязательно: от 1 до 100 символов, без пробелов по краям'),
  ).toBeVisible();
  await expect(page.getByText('Длительность — целое число минут от 5 до 540')).toBeVisible();

  // Модал остаётся открытым — можно исправить ввод.
  await expect(page.getByRole('heading', { name: 'Создать тип встречи' })).toBeVisible();
});
