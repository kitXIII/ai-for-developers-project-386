import { Alert, Badge, Card, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { listMeetingTypesOptions } from '@app/api/react-query';
import { Link } from 'react-router';
import { useT } from '../lib/i18n';

export function BookingPage() {
  const t = useT();
  const { data: meetingTypes, isPending, isError } = useQuery(listMeetingTypesOptions());

  return (
    <Stack gap="md">
      <Title order={1}>{t('booking.list.title')}</Title>
      {isPending && (
        <Center>
          <Loader aria-label={t('booking.list.loading')} />
        </Center>
      )}
      {isError && <Alert color="red">{t('booking.list.loadFailed')}</Alert>}
      {meetingTypes && meetingTypes.length === 0 && (
        <Text c="dimmed">{t('booking.list.empty')}</Text>
      )}
      {meetingTypes && meetingTypes.length > 0 && (
        <Stack gap="sm">
          {meetingTypes.map((meetingType) => (
            <Card
              key={meetingType.id}
              component={Link}
              to={`/booking/${meetingType.id}`}
              // The wizard starts at step «Тип» when the guest picks a card;
              // a direct link to the same URL counts that step as passed.
              state={{ fromList: true }}
              withBorder
              shadow="xs"
            >
              <Group justify="space-between" wrap="nowrap">
                <Title order={3}>{meetingType.name}</Title>
                <Badge variant="light" color="teal">
                  {t('common.duration', { minutes: meetingType.durationMinutes })}
                </Badge>
              </Group>
              {meetingType.description && <Text mt="xs">{meetingType.description}</Text>}
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
