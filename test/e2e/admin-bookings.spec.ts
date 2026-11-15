import { expect, test, type Page } from '@playwright/test';
import dayjs from 'dayjs';
import 'dayjs/locale/ru.js';
import { createMeetingTypeViaUi } from './helpers.js';

// The mobile and desktop projects run in parallel against the same dev server,
// so Date.now() alone can collide within a millisecond — add a random suffix.
const uniqueName = (prefix: string) =>
  `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Day cells are labelled by Mantine in the calendar locale (Calendar gets
// locale="ru"), so the test mirrors the same dayjs format for its targets.
const dayLabel = (iso: string) => dayjs(iso).locale('ru').format('D MMMM YYYY');

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
  const cell = page.getByRole('button', { name: dayLabel(iso) });
  const nextMonth = page.getByRole('button', { name: 'Следующий месяц' });
  // The step shows a loader while the slots load — wait for the calendar grid
  // before paging, otherwise a blind click lands in the wrong month.
  await page.locator('table button').first().waitFor({ state: 'visible' });
  for (let attempt = 0; attempt < 3 && !(await cell.isVisible()); attempt += 1) {
    await nextMonth.click();
  }
  await cell.click();
}

// README scenario end to end (С1+С2+С3), everything through the UI: the owner
// creates a meeting type, a guest books a free slot, the owner finds the
// booking in the «Бронирования» tab and checks the guest name and the time.
test('бронь гостя видна во вкладке «Бронирования» — владелец сверяет имя и время', async ({
  page,
}) => {
  // С1: владелец создаёт тип встречи в «Администрировании».
  const typeName = uniqueName('Знакомство');
  await createMeetingTypeViaUi(page, typeName);

  // С2: гость проходит мастер и бронирует свободный слот. Второй будний день
  // окна: первый день у booking-confirm.spec (его 2-й и 3-й слоты), этот день
  // бронирует только данная спека — коллизий между проектами нет.
  await page.goto('/booking');
  await page.getByRole('link', { name: typeName }).click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByRole('heading', { name: 'Дата и время' })).toBeVisible();

  await openDayCell(page, nextWeekdays(2)[1]);

  // Два проекта этой спеки берут соседние слоты дня: какой бы ни успел первым,
  // второй сдвигается на более позднее время и не пересекается с первым.
  const slotIndex = test.info().project.name === 'desktop' ? 4 : 3;
  const targetSlot = page.locator('button[aria-pressed]').nth(slotIndex);
  const slotLabel = (await targetSlot.textContent())?.trim() ?? '';
  await targetSlot.click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(page.getByRole('heading', { name: 'Имя и подтверждение' })).toBeVisible();

  const guestName = uniqueName('Игорь');
  await page.getByLabel('Имя').fill(guestName);
  await page.getByRole('button', { name: 'Подтвердить' }).click();
  await expect(page.getByRole('heading', { name: 'Бронирование подтверждено' })).toBeVisible();

  // С3: владелец открывает вкладку «Бронирования» и сверяет время и имя гостя.
  await page.goto('/admin');
  await page.getByRole('tab', { name: 'Бронирования' }).click();
  const whenLabel = `${dayjs(nextWeekdays(2)[1]).locale('ru').format('D MMMM')}, ${slotLabel}`;
  const row = page.getByRole('row').filter({ hasText: guestName });
  await expect(row, 'бронь гостя видна в списке').toBeVisible();
  await expect(row).toContainText(typeName);
  await expect(row).toContainText(whenLabel);
});
