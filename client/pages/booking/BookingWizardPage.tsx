import { Anchor, Badge, Button, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import type { Booking, Slot } from '@app/api/types';
import { getMeetingTypeOptions } from '@app/api/react-query';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { isMeetingTypeNotFound } from '../../lib/api-errors';
import { dayLabel, timeRangeLabel } from '../../lib/datetime';
import { useT, type MessagePath } from '../../lib/i18n';
import { StepDateAndTime } from './StepDateAndTime';
import { StepNameAndConfirm } from './StepNameAndConfirm';

// Steps of the guest booking wizard, in order; the indicator is plain text
// («Шаг N из 3») — the Stepper component is deliberately not used. The catalog
// keys are named by role, not by text. The map is the only list of the steps:
// the step type comes from its keys, the count from the last step (steps are
// numbered from 1).
const stepTitleKeys = {
  1: 'booking.wizard.steps.type',
  2: 'booking.wizard.steps.dateTime',
  3: 'booking.wizard.steps.confirm',
} as const satisfies Record<number, MessagePath>;

type WizardStep = keyof typeof stepTitleKeys;

const LAST_STEP: WizardStep = 3;
const STEP_COUNT = LAST_STEP;

type WizardLocationState = {
  fromList?: boolean;
};

// The route component: a changed meeting type remounts the wizard (new key), so
// the picked day and slot never leak from one type into another.
export function BookingWizardPage() {
  const { meetingTypeId } = useParams<{ meetingTypeId: string }>();
  const { state } = useLocation();
  // Picking a card in the list opens the wizard at step «Тип»; a direct link
  // already carries the chosen type, so that step counts as passed.
  const fromList = (state as WizardLocationState | null)?.fromList === true;

  return (
    <BookingWizard key={meetingTypeId} meetingTypeId={meetingTypeId ?? ''} fromList={fromList} />
  );
}

function BookingWizard({ meetingTypeId, fromList }: { meetingTypeId: string; fromList: boolean }) {
  const t = useT();
  const [step, setStep] = useState<WizardStep>(fromList ? 1 : 2);
  // The picked day and slot live here so step «Имя и подтверждение» (#14) can
  // book them; picking another day always invalidates the picked slot.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  // The created booking switches the wizard to the success screen.
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const handleSelectDay = (day: string): void => {
    setSelectedDay(day);
    setSelectedSlot(null);
  };

  const {
    data: meetingType,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getMeetingTypeOptions({ path: { id: meetingTypeId } }),
    // A missing type is a final 404, not something worth retrying.
    retry: false,
  });

  if (isPending) {
    return (
      <Center>
        <Loader aria-label={t('booking.wizard.loading')} />
      </Center>
    );
  }

  if (isError) {
    const notFound = isMeetingTypeNotFound(error);
    return (
      <Stack gap="sm">
        <Anchor component={Link} to="/booking">
          {t('booking.wizard.backToList')}
        </Anchor>
        <Text c="dimmed">
          {notFound ? t('booking.wizard.notFound') : t('booking.wizard.loadFailed')}
        </Text>
      </Stack>
    );
  }

  // The success screen replaces the whole wizard: the booking is done, there is
  // nothing to go back to. The summary comes from the server's response.
  if (createdBooking) {
    return (
      <Stack gap="md">
        <Title order={2}>{t('booking.success.title')}</Title>
        <Stack gap="xs">
          <Text>{t('booking.success.meetingType', { name: createdBooking.meetingTypeName })}</Text>
          <Text>{t('booking.success.day', { day: dayLabel(createdBooking.start) })}</Text>
          <Text>
            {t('booking.success.time', {
              time: timeRangeLabel(createdBooking.start, createdBooking.end),
            })}
          </Text>
          <Text>{t('booking.success.guest', { name: createdBooking.guestName })}</Text>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/booking">
        {t('booking.wizard.backToList')}
      </Anchor>
      <Title order={1}>{meetingType.name}</Title>
      <Text c="dimmed">{t('booking.wizard.stepCounter', { step, total: STEP_COUNT })}</Text>
      <Title order={2}>{t(stepTitleKeys[step])}</Title>
      {step === 1 && (
        <Stack gap="xs">
          <Badge variant="light" color="teal" w="fit-content">
            {t('common.duration', { minutes: meetingType.durationMinutes })}
          </Badge>
          {meetingType.description && <Text>{meetingType.description}</Text>}
        </Stack>
      )}
      {step === 2 && (
        <StepDateAndTime
          meetingTypeId={meetingTypeId}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
      )}
      {step === LAST_STEP && (
        <StepNameAndConfirm
          meetingTypeId={meetingTypeId}
          meetingTypeName={meetingType.name}
          selectedSlot={selectedSlot}
          onBooked={setCreatedBooking}
          onBackToDateTime={() => setStep(2)}
        />
      )}
      <Group gap="sm">
        {step > 1 && (
          <Button
            variant="default"
            onClick={() => setStep((current) => (current - 1) as WizardStep)}
          >
            {t('common.actions.back')}
          </Button>
        )}
        {step < LAST_STEP && (
          <Button onClick={() => setStep((current) => (current + 1) as WizardStep)}>
            {t('common.actions.next')}
          </Button>
        )}
      </Group>
    </Stack>
  );
}
