import { Alert, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import type { Booking, ErrorCode, Slot } from '@app/api/types';
import { createBookingMutation } from '@app/api/react-query';
import { zCreateBookingRequest } from '@app/api/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { dayLabel, timeRangeLabel } from '../../lib/datetime';

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

// One understandable Russian phrase per contract error code the operation can
// answer with; the code decides the meaning, this map decides the wording.
const apiErrorMessages: Record<ErrorCode, string> = {
  validation_failed: 'Проверьте правильность заполнения формы.',
  meeting_type_not_found: 'Тип встречи не найден.',
  slot_taken: 'Это время уже занято. Выберите другой слот.',
  outside_window: 'Это время вне окна записи: бронировать можно на 14 дней вперёд.',
  outside_schedule: 'Это время вне графика работы: брони доступны в будни с 09:00 до 18:00.',
};

// 409 codes mean the picked slot is gone or unusable — the fix is another slot.
const conflictCodes: ErrorCode[] = ['slot_taken', 'outside_window', 'outside_schedule'];

export function StepNameAndConfirm({
  meetingTypeId,
  meetingTypeName,
  selectedSlot,
  onBooked,
  onBackToDateTime,
}: StepNameAndConfirmProps) {
  const [guestName, setGuestName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiCode, setApiCode] = useState<ErrorCode | null>(null);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const createBooking = useMutation({
    ...createBookingMutation(),
    onSuccess: (booking) => onBooked(booking),
    onError: (error) => {
      // Contract errors carry the machine-readable code; anything else
      // (network, unexpected) stays a generic failure.
      if ('code' in error && error.code in apiErrorMessages) {
        setApiCode(error.code);
        setApiMessage(apiErrorMessages[error.code]);
      } else {
        setApiCode(null);
        setApiMessage('Не удалось создать бронирование. Попробуйте ещё раз.');
      }
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
      setFieldError('Имя обязательно: от 1 до 100 символов, без пробелов по краям');
      return;
    }
    setFieldError(null);
    setApiCode(null);
    setApiMessage(null);
    createBooking.mutate({ body: parsed.data });
  };

  if (!selectedSlot) {
    return <Text c="dimmed">Сначала выберите дату и время.</Text>;
  }

  // Moments carry the +03:00 offset (ADR 0002) — the summary labels come from
  // the shared substring helpers (client/lib/datetime.ts).
  const slotDay = dayLabel(selectedSlot.start);
  const slotTime = timeRangeLabel(selectedSlot.start, selectedSlot.end);

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm" w="fit-content" maw="100%">
        {apiMessage && <Alert color="red">{apiMessage}</Alert>}
        {apiCode && conflictCodes.includes(apiCode) && (
          <Button variant="default" w="fit-content" onClick={onBackToDateTime}>
            Выбрать другое время
          </Button>
        )}
        <Text size="sm" c="dimmed">
          {meetingTypeName}, {slotDay}, {slotTime} (UTC+3)
        </Text>
        <TextInput
          label="Имя"
          placeholder="Как к вам обращаться"
          value={guestName}
          onChange={(event) => setGuestName(event.currentTarget.value)}
          error={fieldError}
        />
        <Group justify="flex-end" gap="sm">
          <Button type="submit" loading={createBooking.isPending}>
            Подтвердить
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
