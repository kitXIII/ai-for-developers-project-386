import { Alert, Badge, Card, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { listMeetingTypesOptions } from '@app/api/react-query';
import { Link } from 'react-router';

export function BookingPage() {
  const { data: meetingTypes, isPending, isError } = useQuery(listMeetingTypesOptions());

  return (
    <Stack gap="md">
      <Title order={1}>Выбор типа встречи</Title>
      {isPending && (
        <Center>
          <Loader aria-label="Загрузка типов встреч" />
        </Center>
      )}
      {isError && <Alert color="red">Не удалось загрузить типы встреч.</Alert>}
      {meetingTypes && meetingTypes.length === 0 && (
        <Text c="dimmed">Типов встреч пока нет — загляните позже.</Text>
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
                  {meetingType.durationMinutes} мин
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
