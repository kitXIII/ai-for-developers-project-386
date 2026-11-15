import { expect, test, type Page } from '@playwright/test';

// The dev server keeps meeting types in memory across tests, so the guest
// scenario creates its own type through the admin UI and asserts on it only.
const uniqueName = (prefix: string) => `${prefix} ${Date.now()}`;
const description = 'Короткий видеозвонок для знакомства';

// Data is seeded through the UI only — no API fixtures (docs/test-plan.md).
async function createMeetingTypeViaUi(page: Page, name: string): Promise<void> {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Создать тип' }).click();
  await page.getByLabel('Название').fill(name);
  await page.getByLabel('Описание').fill(description);
  await page.getByLabel('Длительность (минуты)').fill('30');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/meeting-types\/[0-9a-f-]{36}$/);
}

test('гость видит типы встреч карточками на /booking', async ({ page }) => {
  const name = uniqueName('Знакомство');
  await createMeetingTypeViaUi(page, name);

  await page.goto('/booking');

  await expect(page.getByRole('heading', { name: 'Выбор типа встречи' })).toBeVisible();
  const card = page.getByRole('link', { name });
  await expect(card).toBeVisible();
  await expect(card.getByText('30 мин')).toBeVisible();
  await expect(card.getByText(description)).toBeVisible();
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
