import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function AdminPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Администрирование</Title>
      <Text>Интерфейс администратора в разработке.</Text>
      <Group gap="sm">
        <Button component={Link} to="/" variant="default">
          На главную
        </Button>
      </Group>
    </Stack>
  );
}
