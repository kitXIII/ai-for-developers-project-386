import { Anchor, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { getAdminMeetingTypeOptions } from '@app/api/react-query';
import { isMeetingTypeNotFound } from '../../lib/api-errors';
import { useT } from '../../lib/i18n';
import { Link, useParams } from 'react-router';

export function MeetingTypeDetailPage() {
  const t = useT();
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
        <Loader aria-label={t('admin.meetingTypeDetail.loading')} />
      </Center>
    );
  }

  if (isError) {
    const notFound = isMeetingTypeNotFound(error);
    return (
      <Stack gap="sm">
        <Text c="dimmed">
          {notFound
            ? t('admin.meetingTypeDetail.notFound')
            : t('admin.meetingTypeDetail.loadFailed')}
        </Text>
        <Anchor component={Link} to="/admin">
          {t('admin.meetingTypeDetail.back')}
        </Anchor>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Anchor component={Link} to="/admin">
        {t('admin.meetingTypeDetail.back')}
      </Anchor>
      <Title order={1}>{meetingType.name}</Title>
      <Text c="dimmed">
        {t('admin.meetingTypeDetail.duration', { minutes: meetingType.durationMinutes })}
      </Text>
      {meetingType.description && <Text>{meetingType.description}</Text>}
    </Stack>
  );
}
