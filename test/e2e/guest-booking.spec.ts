import { expect, test } from '@playwright/test';
import { createMeetingTypeViaUi, meetingTypeDescription, uniqueName } from './helpers.js';

test('гость видит типы встреч карточками на /booking', async ({ page }) => {
  const name = uniqueName('Знакомство');
  await createMeetingTypeViaUi(page, name);

  await page.goto('/booking');

  await expect(page.getByRole('heading', { name: 'Выбор типа встречи' })).toBeVisible();
  const card = page.getByRole('link', { name });
  await expect(card).toBeVisible();
  await expect(card.getByText('30 мин')).toBeVisible();
  await expect(card.getByText(meetingTypeDescription)).toBeVisible();
});

test('выбор карточки открывает мастер бронирования с шага «Тип»', async ({ page }) => {
  const name = uniqueName('Созвон');
  await createMeetingTypeViaUi(page, name);

  await page.goto('/booking');
  await page.getByRole('link', { name }).click();

  await expect(page).toHaveURL(/\/booking\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Шаг 1 из 3')).toBeVisible();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Тип', exact: true })).toBeVisible();

  // Каркас мастера: навигация «Продолжить»/«Назад» по трём шагам.
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByText('Шаг 2 из 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Дата и время' })).toBeVisible();

  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByText('Шаг 3 из 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Имя и подтверждение' })).toBeVisible();
  // На последнем шаге «Продолжить» нет — подтверждение появится позже.
  await expect(page.getByRole('button', { name: 'Продолжить' })).toBeHidden();

  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByText('Шаг 2 из 3')).toBeVisible();
});

test('прямая ссылка на тип открывает мастер с пройденным шагом «Тип»', async ({ page }) => {
  const name = uniqueName('Лекция');
  await createMeetingTypeViaUi(page, name);

  await page.goto('/booking');
  await page.getByRole('link', { name }).click();
  await expect(page.getByText('Шаг 1 из 3')).toBeVisible();
  const wizardUrl = page.url();

  // Прямая ссылка — как открытие сохранённого адреса в новой вкладке: без
  // состояния выбора из списка шаг «Тип» уже пройден.
  const directLink = await page.context().newPage();
  await directLink.goto(wizardUrl);

  await expect(directLink.getByText('Шаг 2 из 3')).toBeVisible();
  await expect(directLink.getByRole('heading', { name })).toBeVisible();
  await expect(directLink.getByRole('heading', { name: 'Дата и время' })).toBeVisible();

  await directLink.close();
});

test('прямая ссылка на неизвестный тип показывает понятную ошибку', async ({ page }) => {
  await page.goto('/booking/00000000-0000-0000-0000-000000000000');

  await expect(page.getByText('Тип встречи не найден.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'К выбору типа' })).toBeVisible();
});
