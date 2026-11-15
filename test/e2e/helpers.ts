import { expect, type Page } from '@playwright/test';

// The dev server keeps meeting types in memory across tests, so each scenario
// creates its own type through the admin UI and asserts on it only.
export const uniqueName = (prefix: string) => `${prefix} ${Date.now()}`;

export const meetingTypeDescription = 'Короткий видеозвонок для знакомства';

// Data is seeded through the UI only — no API fixtures (docs/test-plan.md).
export async function createMeetingTypeViaUi(page: Page, name: string): Promise<void> {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Создать тип' }).click();
  await page.getByLabel('Название').fill(name);
  await page.getByLabel('Описание').fill(meetingTypeDescription);
  await page.getByLabel('Длительность (минуты)').fill('30');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/meeting-types\/[0-9a-f-]{36}$/);
}
