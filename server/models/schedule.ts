// PROTOTYPE (тикет #19, ветка prototype/layers-skeleton — не мержится).
//
// Настройки расписания — данные, которые приходят снаружи (композиционный корень),
// а не литералы внутри правил. Дефолты повторяют README.
export type Schedule = {
  // Смещение часового пояса владельца календаря в минутах (UTC+3 = 180).
  utcOffsetMinutes: number;
  // Рабочий день в минутах от полуночи по местному времени: 9:00–18:00.
  workdayStartMinute: number;
  workdayEndMinute: number;
  // Окно записи: 14 календарных дней, начиная с завтрашнего.
  windowDays: number;
};

export const DEFAULT_SCHEDULE: Schedule = {
  utcOffsetMinutes: 180,
  workdayStartMinute: 9 * 60,
  workdayEndMinute: 18 * 60,
  windowDays: 14,
};
