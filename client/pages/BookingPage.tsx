import { Stack, Text, Title } from '@mantine/core';
import { GUEST_VARIANTS } from '../prototype/guest';
import { useVariant } from '../prototype/PrototypeSwitcher';

export function BookingPage() {
  const [variant] = useVariant();
  // Прототип виден только в dev-сборке (тикет «Спека: UX-потоки трёх сценариев»).
  if (import.meta.env.DEV) {
    const Variant = GUEST_VARIANTS[variant];
    return <Variant />;
  }
  return (
    <Stack gap="md">
      <Title order={1}>Выбор типа встречи</Title>
      <Text>Типов встреч пока нет — загляните позже.</Text>
    </Stack>
  );
}
