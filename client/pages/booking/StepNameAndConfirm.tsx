import { Alert, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import type { Booking, ErrorCode, Slot } from '@app/api/types';
import { createBookingMutation } from '@app/api/react-query';
import { zCreateBookingRequest } from '@app/api/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiErrorKey, errorCodeOf, isConflictCode } from '../../lib/api-errors';
import { dayLabel, timeRangeLabel } from '../../lib/datetime';
import { useT, type MessagePath } from '../../lib/i18n';
import { SHORT_TEXT_MAX, SHORT_TEXT_MIN } from '../../lib/limits';

type StepNameAndConfirmProps = {
  meetingTypeId: string;
  meetingTypeName: string;
  // The picked slot; without it there is nothing to confirm.
  selectedSlot: Slot | null;
  // Hands the created booking up to the wizard for the success screen.
  onBooked: (booking: Booking) => void;
  // Returns to step «Дата и время» — the way out of a taken slot.
  onBackToDateTime: () => void;
};

export function StepNameAndConfirm({
  meetingTypeId,
  meetingTypeName,
  selectedSlot,
  onBooked,
  onBackToDateTime,
}: StepNameAndConfirmProps) {
  const t = useT();
  const [guestName, setGuestName] = useState('');
  const [fieldErrorKey, setFieldErrorKey] = useState<MessagePath | null>(null);
  const [apiMessageKey, setApiMessageKey] = useState<MessagePath | null>(null);
  const [apiCode, setApiCode] = useState<ErrorCode | null>(null);

  const createBooking = useMutation({
    ...createBookingMutation(),
    onSuccess: (booking) => onBooked(booking),
    onError: (error) => {
      // Contract errors carry the machine-readable code; the catalog turns the
      // code into a phrase, anything else falls back to `errors.unexpected`.
      setApiCode(errorCodeOf(error));
      setApiMessageKey(apiErrorKey(error));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSlot) {
      return;
    }
    // The picked slot's moment carries +03:00, while the generated Zod check
    // for `start` accepts only the Z form: normalize the same instant — the
    // server reads any offset as the instant and answers in +03:00.
    const start = new Date(Date.parse(selectedSlot.start)).toISOString();
    const parsed = zCreateBookingRequest.safeParse({ meetingTypeId, start, guestName });
    if (!parsed.success) {
      setFieldErrorKey('booking.confirm.nameInvalid');
      return;
    }
    setFieldErrorKey(null);
    setApiCode(null);
    setApiMessageKey(null);
    createBooking.mutate({ body: parsed.data });
  };

  if (!selectedSlot) {
    return <Text c="dimmed">{t('booking.confirm.noSlotSelected')}</Text>;
  }

  // Moments carry the +03:00 offset (ADR 0002) — the summary labels come from
  // the shared substring helpers (client/lib/datetime.ts).
  const slotDay = dayLabel(selectedSlot.start);
  const slotTime = timeRangeLabel(selectedSlot.start, selectedSlot.end);

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm" w="fit-content" maw="100%">
        {apiMessageKey && <Alert color="red">{t(apiMessageKey)}</Alert>}
        {apiCode && isConflictCode(apiCode) && (
          <Button variant="default" w="fit-content" onClick={onBackToDateTime}>
            {t('booking.confirm.otherTime')}
          </Button>
        )}
        <Text size="sm" c="dimmed">
          {t('booking.confirm.summary', {
            meetingTypeName,
            day: slotDay,
            time: slotTime,
          })}
        </Text>
        <TextInput
          label={t('booking.confirm.nameLabel')}
          placeholder={t('booking.confirm.namePlaceholder')}
          value={guestName}
          onChange={(event) => setGuestName(event.currentTarget.value)}
          error={
            fieldErrorKey ? t(fieldErrorKey, { min: SHORT_TEXT_MIN, max: SHORT_TEXT_MAX }) : null
          }
        />
        <Group justify="flex-end" gap="sm">
          <Button type="submit" loading={createBooking.isPending}>
            {t('booking.confirm.submit')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
