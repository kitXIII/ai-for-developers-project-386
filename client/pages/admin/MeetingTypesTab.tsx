import { Alert, Button, Card, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { listAdminMeetingTypesOptions } from '@app/api/react-query';
import { Link } from 'react-router';
import { CreateMeetingTypeModal } from './CreateMeetingTypeModal';

export function MeetingTypesTab() {
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const { data: meetingTypes, isPending, isError } = useQuery(listAdminMeetingTypesOptions());

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button onClick={openCreate}>Создать тип</Button>
      </Group>
      {isPending && (
        <Center>
          <Loader aria-label="Загрузка типов встреч" />
        </Center>
      )}
      {isError && <Alert color="red">Не удалось загрузить типы встреч.</Alert>}
      {meetingTypes && meetingTypes.length === 0 && (
        <Text c="dimmed">
          Типов встреч пока нет. Создайте первый — и гости смогут на него записаться.
        </Text>
      )}
      {meetingTypes && meetingTypes.length > 0 && (
        <Stack gap="sm">
          {meetingTypes.map((meetingType) => (
            <Card
              key={meetingType.id}
              component={Link}
              to={`/admin/meeting-types/${meetingType.id}`}
              withBorder
              shadow="xs"
            >
              <Title order={3}>{meetingType.name}</Title>
              <Text c="dimmed" fz="sm">
                Длительность: {meetingType.durationMinutes} мин
              </Text>
              {meetingType.description && <Text mt="xs">{meetingType.description}</Text>}
            </Card>
          ))}
        </Stack>
      )}
      <CreateMeetingTypeModal opened={createOpened} onClose={closeCreate} />
    </Stack>
  );
}
