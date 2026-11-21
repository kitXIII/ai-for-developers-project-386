import type { Slot } from '@app/api/types';
import { listAvailableSlotsOptions } from '@app/api/react-query';
import { Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { dayLabel, timeRangeLabel } from '../../lib/datetime';
import { useT } from '../../lib/i18n';

type StepDateAndTimeProps = {
  meetingTypeId: string;
  selectedDay: string | null;
  // Picking another day always invalidates the picked slot.
  onSelectDay: (day: string) => void;
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
};

// The server returns only the days with free slots (the whole window in one
// response), so every other day of the visible month — today, weekends, days
// outside the booking window — is disabled in the calendar.
export function StepDateAndTime({
  meetingTypeId,
  selectedDay,
  onSelectDay,
  selectedSlot,
  onSelectSlot,
}: StepDateAndTimeProps) {
  const t = useT();
  const [viewedMonth, setViewedMonth] = useState<string | null>(null);
  const {
    data: slotsDays,
    isPending,
    isError,
  } = useQuery(listAvailableSlotsOptions({ path: { id: meetingTypeId } }));

  if (isPending) {
    return (
      <Center>
        <Loader aria-label={t('booking.dateTime.loading')} />
      </Center>
    );
  }

  if (isError) {
    return <Text c="dimmed">{t('booking.dateTime.loadFailed')}</Text>;
  }

  const availableDays = new Set(slotsDays.map((day) => day.date));
  const daySlots = slotsDays.find((day) => day.date === selectedDay)?.slots ?? [];

  return (
    <Stack gap="md" w="fit-content">
      <Calendar
        locale="ru"
        ariaLabels={{
          nextMonth: t('booking.dateTime.nextMonth'),
          previousMonth: t('booking.dateTime.previousMonth'),
        }}
        // The first day with slots opens the calendar; the guest can page further.
        date={viewedMonth ?? slotsDays[0]?.date}
        onDateChange={setViewedMonth}
        excludeDate={(date) => !availableDays.has(date)}
        getDayProps={(date) => ({
          selected: date === selectedDay,
          onClick: () => onSelectDay(date),
        })}
      />
      {selectedDay && (
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            {t('booking.dateTime.freeTime', { date: dayLabel(selectedDay) })}
          </Text>
          <Group gap="xs">
            {daySlots.map((slot) => (
              <Button
                key={slot.start}
                variant={slot.start === selectedSlot?.start ? 'filled' : 'default'}
                aria-pressed={slot.start === selectedSlot?.start}
                onClick={() => onSelectSlot(slot)}
              >
                {timeRangeLabel(slot.start, slot.end)}
              </Button>
            ))}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
