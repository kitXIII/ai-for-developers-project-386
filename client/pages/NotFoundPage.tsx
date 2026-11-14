import { Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Stack gap="md">
      <Title size="54" order={1}>
        404
      </Title>
      <Text>Такой страницы нет. Возможно, она была перемещена или удалена.</Text>
      <Text>
        <Link to="/">На главную</Link>
      </Text>
    </Stack>
  );
}
