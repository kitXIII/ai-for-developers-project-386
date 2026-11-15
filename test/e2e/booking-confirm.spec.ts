import { expect, test, type Page } from '@playwright/test';
import { createMeetingTypeViaUi } from './helpers.js';

// The mobile and desktop projects run in parallel against the same dev server,
// so Date.now() alone can collide within a millisecond — add a random suffix.
const uniqueName = (prefix: string) =>
  `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Opens the wizard on step «Имя и подтверждение» with the first free day and
// one of its first slots picked; returns the label of the picked slot
// (ЧЧ:ММ–ЧЧ:ММ).
async function openWizardStepName(page: Page, name: string): Promise<string> {
  await createMeetingTypeViaUi(page, name);
  await page.goto('/booking');
  await page.getByRole('link', { name }).click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByRole('heading', { name: 'Дата и время' })).toBeVisible();

  // The first enabled day cell is the first day with slots: today, weekends
  // and days outside the window are disabled (ticket #13).
  await page.locator('table button').first().waitFor({ state: 'visible' });
  await page.locator('table button:not([disabled])').first().click();

  // Slot buttons carry aria-pressed. The specs run in parallel against the
  // same dev server, and bookings block across types — so each project takes
  // its own slot of the day (mobile the 2nd, desktop the 3rd): the 1st stays
  // free for booking-slots.spec, which pins its visibility, and the two
  // projects never race for the same wall-clock time.
  const slotIndex = test.info().project.name === 'desktop' ? 2 : 1;
  const targetSlot = page.locator('button[aria-pressed]').nth(slotIndex);
  const slotLabel = (await targetSlot.textContent())?.trim() ?? '';
  await targetSlot.click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByRole('heading', { name: 'Имя и подтверждение' })).toBeVisible();
  return slotLabel;
}

test('гость проходит мастер до экрана успеха со сводкой', async ({ page }) => {
  const name = uniqueName('Знакомство');
  const guestName = uniqueName('Мария');
  const slotLabel = await openWizardStepName(page, name);

  await page.getByLabel('Имя').fill(guestName);
  await page.getByRole('button', { name: 'Подтвердить' }).click();

  await expect(page.getByRole('heading', { name: 'Бронирование подтверждено' })).toBeVisible();
  await expect(page.getByText(`Тип встречи: ${name}`)).toBeVisible();
  await expect(page.getByText(`Время: ${slotLabel} (UTC+3)`)).toBeVisible();
  await expect(page.getByText(/День: \d{1,2} [а-яё]+/)).toBeVisible();
  await expect(page.getByText(`Гость: ${guestName}`)).toBeVisible();
});

test('ошибка валидации формы гостя видна в UI', async ({ page }) => {
  const name = uniqueName('Созвон');
  await openWizardStepName(page, name);

  const confirm = page.getByRole('button', { name: 'Подтвердить' });
  const nameError = page.getByText('Имя обязательно: от 1 до 100 символов, без пробелов по краям');

  await confirm.click();
  await expect(nameError).toBeVisible();

  // Одни пробелы — та же ошибка: имя из пробелов не принимается.
  await page.getByLabel('Имя').fill('   ');
  await confirm.click();
  await expect(nameError).toBeVisible();

  // Мастер не уходит с шага подтверждения, пока имя не пройдёт валидацию.
  await expect(page.getByRole('heading', { name: 'Имя и подтверждение' })).toBeVisible();
});
