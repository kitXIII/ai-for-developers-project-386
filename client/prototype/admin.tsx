// ПРОТОТИП: три варианта «Администрирования» (список типов → создание → детализация, брони).
// A — таблицы и отдельная форма создания, B — вкладки и карточки, C — мастер-деталь.
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import type { Booking, GuestMeetingType } from '@app/api/types';
import { BOOKINGS, MEETING_TYPES } from './fixtures';

function formatStart(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function CreateTypeForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | string>(30);
  return (
    <Stack gap="sm" maw={480}>
      <Title order={2}>Новый тип встречи</Title>
      <TextInput
        label="Название"
        placeholder="Знакомство"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Textarea
        label="Описание"
        placeholder="О чём созвон"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <NumberInput
        label="Длительность, минуты"
        min={5}
        max={540}
        value={duration}
        onChange={setDuration}
      />
      <Group>
        <Button disabled={!name.trim()} onClick={onDone}>
          Создать
        </Button>
        <Button variant="default" onClick={onDone}>
          Отмена
        </Button>
      </Group>
      <Text c="dimmed" size="sm">
        Прототип: создание ничего не сохраняет.
      </Text>
    </Stack>
  );
}

function TypeDetails({ type, bookings }: { type: GuestMeetingType; bookings: Booking[] }) {
  const own = bookings.filter((b) => b.meetingTypeId === type.id);
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Title order={2}>{type.name}</Title>
        <Badge>{type.durationMinutes} мин</Badge>
      </Group>
      <Text c="dimmed">{type.description}</Text>
      <Title order={4}>Бронирования</Title>
      {own.length === 0 ? (
        <Text c="dimmed" size="sm">
          Бронирований этого типа пока нет.
        </Text>
      ) : (
        <Stack gap="xs">
          {own.map((b) => (
            <Paper key={b.id} withBorder p="sm" radius="md">
              <Text size="sm" fw={600}>
                {b.guestName}
              </Text>
              <Text size="sm" c="dimmed">
                {formatStart(b.start)}
              </Text>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function BookingsList({ bookings }: { bookings: Booking[] }) {
  return (
    <Table highlightOnHover verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Когда (UTC+3)</Table.Th>
          <Table.Th>Тип</Table.Th>
          <Table.Th>Гость</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {bookings.map((b) => (
          <Table.Tr key={b.id}>
            <Table.Td>{formatStart(b.start)}</Table.Td>
            <Table.Td>{b.meetingTypeName}</Table.Td>
            <Table.Td>{b.guestName}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function AdminVariantA() {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (mode === 'create') return <CreateTypeForm onDone={() => setMode('list')} />;
  const selected = MEETING_TYPES.find((t) => t.id === selectedId) ?? null;
  if (selected)
    return (
      <Stack gap="sm">
        <Button variant="light" onClick={() => setSelectedId(null)} maw={200}>
          ← Ко всем типам
        </Button>
        <TypeDetails type={selected} bookings={BOOKINGS} />
      </Stack>
    );
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={1}>Администрирование</Title>
        <Button onClick={() => setMode('create')}>Создать тип</Button>
      </Group>
      <Title order={3}>Типы встреч</Title>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Название</Table.Th>
            <Table.Th>Длительность</Table.Th>
            <Table.Th>Описание</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {MEETING_TYPES.map((t) => (
            <Table.Tr key={t.id} onClick={() => setSelectedId(t.id)} style={{ cursor: 'pointer' }}>
              <Table.Td fw={600}>{t.name}</Table.Td>
              <Table.Td>{t.durationMinutes} мин</Table.Td>
              <Table.Td c="dimmed">{t.description}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Title order={3}>Предстоящие бронирования</Title>
      <BookingsList bookings={BOOKINGS} />
    </Stack>
  );
}

function AdminVariantB() {
  const [creating, setCreating] = useState(false);
  return (
    <Stack gap="md">
      <Title order={1}>Администрирование</Title>
      <Tabs defaultValue="types">
        <Tabs.List>
          <Tabs.Tab value="types">Типы встреч</Tabs.Tab>
          <Tabs.Tab value="bookings">Бронирования</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="types" pt="md">
          <Group justify="flex-end" mb="sm">
            <Button onClick={() => setCreating(true)}>Создать тип</Button>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {MEETING_TYPES.map((t) => (
              <Card key={t.id} withBorder radius="md" padding="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={700}>{t.name}</Text>
                    <Badge variant="light">{t.durationMinutes} мин</Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t.description}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
        <Tabs.Panel value="bookings" pt="md">
          <Stack gap="xs">
            {BOOKINGS.map((b) => (
              <Paper key={b.id} withBorder p="sm" radius="md">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text fw={600} size="sm">
                      {b.guestName}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {b.meetingTypeName}
                    </Text>
                  </Stack>
                  <Text size="sm">{formatStart(b.start)}</Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
      <Modal
        opened={creating}
        onClose={() => setCreating(false)}
        title="Новый тип встречи"
        centered
      >
        <CreateTypeForm onDone={() => setCreating(false)} />
      </Modal>
    </Stack>
  );
}

function AdminVariantC() {
  const [selectedId, setSelectedId] = useState(MEETING_TYPES[0].id);
  const [creating, setCreating] = useState(false);
  const selected = MEETING_TYPES.find((t) => t.id === selectedId) ?? MEETING_TYPES[0];
  return (
    <Stack gap="md">
      <Title order={1}>Администрирование</Title>
      <Group justify="space-between">
        <Text fw={600}>Типы встреч и их брони</Text>
        <Button onClick={() => setCreating(true)}>Создать тип</Button>
      </Group>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Stack gap="xs">
          {MEETING_TYPES.map((t) => (
            <Paper
              key={t.id}
              withBorder
              p="sm"
              radius="md"
              style={
                t.id === selected.id
                  ? { borderColor: 'var(--mantine-color-blue-filled)' }
                  : undefined
              }
            >
              <Group
                justify="space-between"
                wrap="nowrap"
                onClick={() => setSelectedId(t.id)}
                style={{ cursor: 'pointer' }}
              >
                <Stack gap={2}>
                  <Text fw={600}>{t.name}</Text>
                  <Text size="sm" c="dimmed">
                    {t.durationMinutes} мин
                  </Text>
                </Stack>
                <Badge variant="light">
                  {BOOKINGS.filter((b) => b.meetingTypeId === t.id).length} броней
                </Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
        <Paper withBorder p="md" radius="md">
          <TypeDetails type={selected} bookings={BOOKINGS} />
        </Paper>
      </SimpleGrid>
      <Modal
        opened={creating}
        onClose={() => setCreating(false)}
        title="Новый тип встречи"
        centered
      >
        <CreateTypeForm onDone={() => setCreating(false)} />
      </Modal>
    </Stack>
  );
}

export const ADMIN_VARIANTS = { A: AdminVariantA, B: AdminVariantB, C: AdminVariantC };
