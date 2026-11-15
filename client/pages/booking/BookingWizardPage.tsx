import { Anchor, Badge, Button, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { getMeetingTypeOptions } from '@app/api/react-query';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';

type WizardStep = 1 | 2 | 3;

// Steps of the guest booking wizard, in order; the indicator is plain text
// («Шаг N из 3») — the Stepper component is deliberately not used.
const stepTitles: Record<WizardStep, string> = {
  1: 'Тип',
  2: 'Дата и время',
  3: 'Имя и подтверждение',
};

type WizardLocationState = {
  fromList?: boolean;
};

export function BookingWizardPage() {
  const { meetingTypeId } = useParams<{ meetingTypeId: string }>();
  const { state } = useLocation();
  // Picking a card in the list opens the wizard at step «Тип»; a direct link
  // already carries the chosen type, so that step counts as passed.
  const fromList = (state as WizardLocationState | null)?.fromList === true;
  const [step, setStep] = useState<WizardStep>(fromList ? 1 : 2);

  const {
    data: meetingType,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getMeetingTypeOptions({ path: { id: meetingTypeId ?? '' } }),
    // A missing type is a final 404, not something worth retrying.
    retry: false,
  });

  if (isPending) {
    return (
      <Center>
        <Loader aria-label="Загрузка типа встречи" />
      </Center>
    );
  }

  if (isError) {
    const notFound = 'code' in error && error.code === 'meeting_type_not_found';
    return (
      <Stack gap="sm">
        <Anchor component={Link} to="/booking">
          К выбору типа
        </Anchor>
        <Text c="dimmed">
          {notFound ? 'Тип встречи не найден.' : 'Не удалось загрузить тип встречи.'}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/booking">
        К выбору типа
      </Anchor>
      <Title order={1}>{meetingType.name}</Title>
      <Text c="dimmed">Шаг {step} из 3</Text>
      <Title order={2}>{stepTitles[step]}</Title>
      {step === 1 && (
        <Stack gap="xs">
          <Badge variant="light" color="teal" w="fit-content">
            {meetingType.durationMinutes} мин
          </Badge>
          {meetingType.description && <Text>{meetingType.description}</Text>}
        </Stack>
      )}
      {/* Шаги 2 и 3 появляются в следующих задачах: #13 — даты и слоты, #14 — имя. */}
      {step === 2 && <Text c="dimmed">Здесь появится выбор даты и времени.</Text>}
      {step === 3 && <Text c="dimmed">Здесь появятся имя и подтверждение.</Text>}
      <Group gap="sm">
        {step > 1 && (
          <Button
            variant="default"
            onClick={() => setStep((current) => (current - 1) as WizardStep)}
          >
            Назад
          </Button>
        )}
        {step < 3 && (
          <Button onClick={() => setStep((current) => (current + 1) as WizardStep)}>
            Продолжить
          </Button>
        )}
      </Group>
    </Stack>
  );
}
