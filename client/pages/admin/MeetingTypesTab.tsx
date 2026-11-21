import { Alert, Button, Card, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { listAdminMeetingTypesOptions } from '@app/api/react-query';
import { Link } from 'react-router';
import { useT } from '../../lib/i18n';
import { CreateMeetingTypeModal } from './CreateMeetingTypeModal';

export function MeetingTypesTab() {
  const t = useT();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const { data: meetingTypes, isPending, isError } = useQuery(listAdminMeetingTypesOptions());

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button onClick={openCreate}>{t('admin.meetingTypes.create')}</Button>
      </Group>
      {isPending && (
        <Center>
          <Loader aria-label={t('admin.meetingTypes.loading')} />
        </Center>
      )}
      {isError && <Alert color="red">{t('admin.meetingTypes.loadFailed')}</Alert>}
      {meetingTypes && meetingTypes.length === 0 && (
        <Text c="dimmed">{t('admin.meetingTypes.empty')}</Text>
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
                {t('admin.meetingTypes.duration', { minutes: meetingType.durationMinutes })}
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
