// ПРОТОТИП: три варианта гостевого потока «выбор типа → бронирование → успех».
// Варианты структурно разные: A — Stepper-мастер, B — две колонки, всё на одном экране,
// C — список дней-аккордеон + Modal для имени. Мутаций нет: успех имитируется локально.
import {
  Accordion,
  Alert,
  Button,
  Card,
  Group,
  Modal,
  Paper,
  Radio,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { Link } from 'react-router';
import type { GuestMeetingType, Slot, SlotsDay } from '@app/api/types';
import { formatDay, MEETING_TYPES, slotsForType } from './fixtures';

function slotLabel(slot: Slot): string {
  return slot.start.slice(11, 16) + '–' + slot.end.slice(11, 16);
}

function TypePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <Stack gap="sm">
      <Radio.Group value={value} onChange={onChange}>
        <Stack gap="sm">
          {MEETING_TYPES.map((type) => (
            <Paper key={type.id} withBorder p="md" radius="md">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={4}>
                  <Group gap="sm">
                    <Radio value={type.id} />
                    <Text fw={600}>{type.name}</Text>
                  </Group>
                  <Text c="dimmed" size="sm">
                    {type.description}
                  </Text>
                </Stack>
                <Text size="sm" fw={700} c="blue" style={{ whiteSpace: 'nowrap' }}>
                  {type.durationMinutes} мин
                </Text>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Radio.Group>
    </Stack>
  );
}

function SuccessBlock({
  type,
  slot,
  guestName,
}: {
  type: GuestMeetingType;
  slot: Slot;
  guestName: string;
}) {
  return (
    <Alert icon="✓" title="Вы записаны!" color="green">
      <Text>
        «{type.name}» — {formatDay(slot.start.slice(0, 10))}, {slotLabel(slot)} (UTC+3). Ждём вас,{' '}
        {guestName}!
      </Text>
      <Button component={Link} to="/" variant="light" mt="sm">
        На главную
      </Button>
    </Alert>
  );
}

function useGuestFlow() {
  const [typeId, setTypeId] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [guestName, setGuestName] = useState('');
  const [booked, setBooked] = useState(false);
  const type = MEETING_TYPES.find((t) => t.id === typeId) ?? null;
  const days = type ? slotsForType(type) : [];
  return {
    typeId,
    setTypeId,
    slot,
    setSlot,
    guestName,
    setGuestName,
    booked,
    setBooked,
    type,
    days,
  };
}

function GuestVariantA() {
  const flow = useGuestFlow();
  const [step, setStep] = useState(0);
  if (flow.booked && flow.type && flow.slot) {
    return <SuccessBlock type={flow.type} slot={flow.slot} guestName={flow.guestName} />;
  }
  return (
    <Stack gap="md">
      <Title order={1}>Запись на встречу</Title>
      <Stepper active={step} onStepClick={setStep} allowNextStepsSelect={false}>
        <Stepper.Step label="Тип" description="Выберите встречу">
          <TypePicker value={flow.typeId ?? ''} onChange={flow.setTypeId} />
        </Stepper.Step>
        <Stepper.Step label="Дата и время" description="Свободный слот">
          <Stack gap="md">
            {flow.days.slice(0, 5).map((day) => (
              <Paper key={day.date} withBorder p="sm" radius="md">
                <Text fw={600} mb="xs">
                  {formatDay(day.date)}
                </Text>
                <Group gap="xs">
                  {day.slots.map((s) => (
                    <Button
                      key={s.start}
                      size="compact-sm"
                      variant={flow.slot?.start === s.start ? 'filled' : 'default'}
                      onClick={() => flow.setSlot(s)}
                    >
                      {slotLabel(s)}
                    </Button>
                  ))}
                </Group>
              </Paper>
            ))}
            <Text c="dimmed" size="sm">
              Показаны первые 5 дней окна записи (D+1…D+14).
            </Text>
          </Stack>
        </Stepper.Step>
        <Stepper.Step label="Ваши данные" description="Имя и подтверждение">
          <Stack gap="md" maw={420}>
            <TextInput
              label="Ваше имя"
              placeholder="Иван Петров"
              value={flow.guestName}
              onChange={(e) => flow.setGuestName(e.target.value)}
            />
            {flow.type && flow.slot && (
              <Text size="sm">
                «{flow.type.name}», {formatDay(flow.slot.start.slice(0, 10))},{' '}
                {slotLabel(flow.slot)}
              </Text>
            )}
            <Button disabled={!flow.guestName.trim()} onClick={() => flow.setBooked(true)}>
              Подтвердить запись
            </Button>
          </Stack>
        </Stepper.Step>
      </Stepper>
      <Group>
        <Button variant="default" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Назад
        </Button>
        <Button
          disabled={(step === 0 && !flow.typeId) || (step === 1 && !flow.slot)}
          onClick={() => setStep(step + 1)}
        >
          Далее
        </Button>
      </Group>
    </Stack>
  );
}

function GuestVariantB() {
  const flow = useGuestFlow();
  const [dayIndex, setDayIndex] = useState(0);
  const day: SlotsDay | undefined = flow.days[dayIndex];
  if (flow.booked && flow.type && flow.slot) {
    return <SuccessBlock type={flow.type} slot={flow.slot} guestName={flow.guestName} />;
  }
  return (
    <Stack gap="md">
      <Title order={1}>Запись на встречу</Title>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Stack gap="md">
          <Text fw={600}>1. Тип встречи</Text>
          <TypePicker
            value={flow.typeId ?? ''}
            onChange={(id) => {
              flow.setTypeId(id);
              flow.setSlot(null);
              setDayIndex(0);
            }}
          />
          <Text fw={600}>2. Дата</Text>
          <Group gap="xs">
            {flow.days.map((d, index) => (
              <Button
                key={d.date}
                size="compact-sm"
                variant={index === dayIndex ? 'filled' : 'default'}
                onClick={() => {
                  setDayIndex(index);
                  flow.setSlot(null);
                }}
              >
                {d.date.slice(8, 10)}.{d.date.slice(5, 7)}
              </Button>
            ))}
          </Group>
        </Stack>
        <Stack gap="md">
          <Text fw={600}>3. Время</Text>
          {day ? (
            <SimpleGrid cols={3} spacing="xs">
              {day.slots.map((s) => (
                <Button
                  key={s.start}
                  size="compact-sm"
                  variant={flow.slot?.start === s.start ? 'filled' : 'light'}
                  onClick={() => flow.setSlot(s)}
                >
                  {slotLabel(s)}
                </Button>
              ))}
            </SimpleGrid>
          ) : (
            <Text c="dimmed" size="sm">
              Выберите тип встречи, чтобы увидеть слоты.
            </Text>
          )}
          <Card withBorder padding="md" radius="md">
            <Stack gap="sm">
              <TextInput
                label="Ваше имя"
                placeholder="Иван Петров"
                value={flow.guestName}
                onChange={(e) => flow.setGuestName(e.target.value)}
              />
              {flow.type && flow.slot && (
                <Text size="sm">
                  «{flow.type.name}», {formatDay(day.date)}, {slotLabel(flow.slot)}
                </Text>
              )}
              <Button
                disabled={!flow.type || !flow.slot || !flow.guestName.trim()}
                onClick={() => flow.setBooked(true)}
              >
                Забронировать
              </Button>
            </Stack>
          </Card>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}

function GuestVariantC() {
  const flow = useGuestFlow();
  const [modalOpen, setModalOpen] = useState(false);
  if (flow.booked && flow.type && flow.slot) {
    return <SuccessBlock type={flow.type} slot={flow.slot} guestName={flow.guestName} />;
  }
  return (
    <Stack gap="md">
      <Title order={1}>Запись на встречу</Title>
      <Text c="dimmed">
        Выберите тип встречи, затем раскройте день и кликните по свободному времени.
      </Text>
      <TypePicker value={flow.typeId ?? ''} onChange={flow.setTypeId} />
      {flow.type && (
        <Accordion chevronPosition="left">
          {flow.days.map((d) => (
            <Accordion.Item key={d.date} value={d.date}>
              <Accordion.Control>
                {formatDay(d.date)}{' '}
                <Text size="sm" c="dimmed" span>
                  — слотов: {d.slots.length}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Group gap="xs">
                  {d.slots.map((s) => (
                    <Button
                      key={s.start}
                      size="compact-sm"
                      variant="light"
                      onClick={() => {
                        flow.setSlot(s);
                        setModalOpen(true);
                      }}
                    >
                      {slotLabel(s)}
                    </Button>
                  ))}
                </Group>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          flow.slot
            ? `Запись: ${formatDay(flow.slot.start.slice(0, 10))}, ${slotLabel(flow.slot)}`
            : 'Запись'
        }
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Ваше имя"
            placeholder="Иван Петров"
            value={flow.guestName}
            onChange={(e) => flow.setGuestName(e.target.value)}
          />
          <Button
            disabled={!flow.guestName.trim()}
            onClick={() => {
              flow.setBooked(true);
              setModalOpen(false);
            }}
          >
            Подтвердить
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

export const GUEST_VARIANTS = { A: GuestVariantA, B: GuestVariantB, C: GuestVariantC };
