import { expect, test, type Page } from '@playwright/test';
import dayjs from 'dayjs';
import 'dayjs/locale/ru.js';
import { createMeetingTypeViaUi, uniqueName } from './helpers.js';

// Day cells are labelled by Mantine in the calendar locale (Calendar gets
// locale="ru"), so the test mirrors the same dayjs format for its targets.
const label = (iso: string) => dayjs(iso).locale('ru').format('D MMMM YYYY');

// «Сегодня» in the UTC+3 calendar — the server's frame (ADR 0002).
function todayUtc3(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// The next bookable weekdays: the window starts tomorrow, weekends give no
// slots (the server omits them, the calendar disables them).
function nextWeekdays(count: number): string[] {
  const days: string[] = [];
  let date = Date.parse(`${todayUtc3()}T12:00:00Z`);
  while (days.length < count) {
    date += 24 * 60 * 60 * 1000;
    const iso = new Date(date).toISOString().slice(0, 10);
    const weekday = new Date(`${iso}T12:00:00Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(iso);
    }
  }
  return days;
}

// Clicks a day cell, paging forward if the day is in a later month.
async function openDayCell(page: Page, iso: string): Promise<void> {
  const cell = page.getByRole('button', { name: label(iso) });
  const nextMonth = page.getByRole('button', { name: 'Следующий месяц' });
  // The step shows a loader while the slots load — wait for the calendar grid
  // before paging, otherwise a blind click lands in the wrong month.
  await page.locator('table button').first().waitFor({ state: 'visible' });
  for (let attempt = 0; attempt < 3 && !(await cell.isVisible()); attempt += 1) {
    await nextMonth.click();
  }
  await cell.click();
}

async function openWizardStepDateAndTime(page: Page, name: string): Promise<void> {
  await createMeetingTypeViaUi(page, name);
  await page.goto('/booking');
  await page.getByRole('link', { name }).click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByRole('heading', { name: 'Дата и время' })).toBeVisible();
}

test('шаг «Дата и время» показывает календарь с задизейбленными днями без слотов', async ({
  page,
}) => {
  const name = uniqueName('Консультация');
  await openWizardStepDateAndTime(page, name);

  // Сегодня не бронируется никогда, и день вне окна записи тоже не даёт слотов.
  await expect(page.locator('button[data-today]')).toBeDisabled();
  const yesterday = new Date(Date.parse(`${todayUtc3()}T12:00:00Z`) - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await expect(page.getByRole('button', { name: label(yesterday) })).toBeDisabled();
});

test('выбранный день показывает слоты; смена дня сбрасывает выбранный слот', async ({ page }) => {
  const name = uniqueName('Созвон');
  await openWizardStepDateAndTime(page, name);

  // Тип создан с длительностью 30 минут: сетка от 09:00, первый слот 09:00–09:30.
  const [firstDay, secondDay] = nextWeekdays(2);

  await openDayCell(page, firstDay);
  const slot = page.getByRole('button', { name: '09:00–09:30' });
  await expect(slot).toBeVisible();
  await slot.click();
  await expect(slot, 'выбранный слот помечается').toHaveAttribute('aria-pressed', 'true');

  await openDayCell(page, secondDay);
  await expect(page.getByRole('button', { name: '09:00–09:30' })).toBeVisible();
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
});
