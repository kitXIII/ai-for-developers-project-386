import { Stack, Text, Title } from '@mantine/core';

export function BookingPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Выбор типа встречи</Title>
      <Text>Типов встреч пока нет — загляните позже.</Text>
    </Stack>
  );
}
