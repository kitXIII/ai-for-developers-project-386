import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function BookingPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Выбор типа встречи</Title>
      <Text>Типов встреч пока нет — загляните позже.</Text>
      <Group gap="sm">
        <Button component={Link} to="/" variant="default">
          На главную
        </Button>
      </Group>
    </Stack>
  );
}
