// PROTOTYPE (тикет #19): скелет слоёв на одном сценарии — «гость бронирует слот».
// Ветка prototype/layers-skeleton, в main не мержится. Запуск: `pnpm prototype:skeleton`.
//
// Что здесь проверяется: выдерживает ли раскладка models/repositories/services/routes
// реальный код, если провести через неё сценарий целиком. Все слои — рядом с теми
// местами, где они окажутся после рефакторинга; старый server/app.ts не тронут,
// поэтому на ветке видны оба варианта сразу.
//
// Скрипт печатает состояние хранилища после каждого шага, чтобы было видно, что
// реально произошло, а не только ответ HTTP.
import Fastify from 'fastify';
import { DEFAULT_SCHEDULE } from './models/schedule.js';
import { assertValidMeetingType } from './models/meeting-type.js';
import { generateSlots } from './models/slots.js';
import { inMemoryMeetingTypes } from './repositories/meeting-types.js';
import { inMemoryBookings } from './repositories/bookings.js';
import { createBookingRoutes } from './routes/bookings-adapter.js';
import { formatMoment } from './shared/moment.js';

// «Сегодня» заморожено: понедельник 16.11.2026, 21:30 UTC+3 (как в docs/test-plan.md).
const NOW_MS = Date.parse('2026-11-16T21:30:00+03:00');

async function main(): Promise<void> {
  const meetingTypes = inMemoryMeetingTypes();
  const bookings = inMemoryBookings();

  const app = Fastify();
  createBookingRoutes(app, {
    meetingTypes,
    bookings,
    schedule: DEFAULT_SCHEDULE,
    now: () => NOW_MS,
  });

  const seed = {
    name: 'Консультация',
    description: 'Тридцать минут по видеосвязи',
    durationMinutes: 30,
  };
  // Инварианты модели проверяются до записи: тот же путь, что будет у сценария создания.
  assertValidMeetingType(seed);
  const consultation = await meetingTypes.create(seed);

  // Модель умеет считать сетку слотов; адаптер потом отформатирует её для контракта.
  const days = generateSlots({
    nowMs: NOW_MS,
    durationMinutes: consultation.durationMinutes,
    busy: [],
    schedule: DEFAULT_SCHEDULE,
  });
  console.log(
    `Свободных дней в окне: ${days.length}. 17.11 старты: ${days[0]?.slots
      .map((slot) => formatMoment(slot.startMs, DEFAULT_SCHEDULE).slice(11, 16))
      .join(', ')}\n`,
  );

  const post = (body: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: '/api/v1/bookings', payload: body });

  const scenarios: Array<{ title: string; run: () => Promise<void> }> = [
    {
      title: 'гость бронирует свободный слот',
      run: async () => {
        const response = await post({
          meetingTypeId: consultation.id,
          start: '2026-11-17T10:00:00+03:00',
          guestName: 'Анна',
        });
        report(response.statusCode, response.body);
      },
    },
    {
      title: 'тот же слот второй раз',
      run: async () => {
        const response = await post({
          meetingTypeId: consultation.id,
          start: '2026-11-17T10:00:00+03:00',
          guestName: 'Борис',
        });
        report(response.statusCode, response.body);
      },
    },
    {
      title: 'неизвестный тип встречи',
      run: async () => {
        const response = await post({
          meetingTypeId: 'missing',
          start: '2026-11-17T10:00:00+03:00',
          guestName: 'Вера',
        });
        report(response.statusCode, response.body);
      },
    },
    {
      title: 'старт за окном записи (5 декабря)',
      run: async () => {
        const response = await post({
          meetingTypeId: consultation.id,
          start: '2026-12-05T10:00:00+03:00',
          guestName: 'Глеб',
        });
        report(response.statusCode, response.body);
      },
    },
    {
      title: 'старт вне сетки (10:10 при шаге 30 минут)',
      run: async () => {
        const response = await post({
          meetingTypeId: consultation.id,
          start: '2026-11-17T10:10:00+03:00',
          guestName: 'Дина',
        });
        report(response.statusCode, response.body);
      },
    },
    {
      title: 'имя из одних пробелов',
      run: async () => {
        const response = await post({
          meetingTypeId: consultation.id,
          start: '2026-11-17T11:00:00+03:00',
          guestName: '   ',
        });
        report(response.statusCode, response.body);
      },
    },
  ];

  console.log('Слои: models → repositories → services → routes (адаптер)\n');

  for (const { title, run } of scenarios) {
    console.log(`— ${title}`);
    await run();
    await printState(bookings);
    console.log('');
  }

  await app.close();
}

function report(statusCode: number, body: string): void {
  console.log(`  HTTP ${statusCode} ${body}`);
}

async function printState(bookings: ReturnType<typeof inMemoryBookings>): Promise<void> {
  const stored = await bookings.list();
  console.log(`  в хранилище: ${stored.length} брон.`);
  for (const booking of stored) {
    console.log(
      `    ${formatMoment(booking.startMs, DEFAULT_SCHEDULE)} — ${formatMoment(
        booking.endMs,
        DEFAULT_SCHEDULE,
      )} · ${booking.guestName} · ${booking.meetingTypeName}`,
    );
  }
}

await main();
