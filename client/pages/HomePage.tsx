import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function HomePage() {
  return (
    <Stack gap="md">
      <Title order={1}>Календарь звонков</Title>
      <Text size="lg">
        Сервис бронирования звонков. Владелец календаря задаёт типы встреч — с названием, описанием
        и длительностью, — а гости выбирают подходящий тип и записываются на свободный слот в
        календаре.
      </Text>
      <Group gap="sm">
        <Button component={Link} to="/booking" color="teal">
          Записаться
        </Button>
      </Group>
    </Stack>
  );
}
