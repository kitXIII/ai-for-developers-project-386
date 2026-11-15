import { Anchor, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { getAdminMeetingTypeOptions } from '@app/api/react-query';
import { Link, useParams } from 'react-router';

export function MeetingTypeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: meetingType,
    isPending,
    isError,
    error,
  } = useQuery({
    ...getAdminMeetingTypeOptions({ path: { id: id ?? '' } }),
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
        <Text c="dimmed">
          {notFound ? 'Тип встречи не найден.' : 'Не удалось загрузить тип встречи.'}
        </Text>
        <Anchor component={Link} to="/admin">
          К списку типов
        </Anchor>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Anchor component={Link} to="/admin">
        К списку типов
      </Anchor>
      <Title order={1}>{meetingType.name}</Title>
      <Text c="dimmed">Длительность: {meetingType.durationMinutes} мин</Text>
      {meetingType.description && <Text>{meetingType.description}</Text>}
    </Stack>
  );
}
