import { Stack, Text, Title } from '@mantine/core';
import { ADMIN_VARIANTS } from '../prototype/admin';
import { useVariant } from '../prototype/PrototypeSwitcher';

export function AdminPage() {
  const [variant] = useVariant();
  // Прототип виден только в dev-сборке (тикет «Спека: UX-потоки трёх сценариев»).
  if (import.meta.env.DEV) {
    const Variant = ADMIN_VARIANTS[variant];
    return <Variant />;
  }
  return (
    <Stack gap="md">
      <Title order={1}>Администрирование</Title>
      <Text>Раздел в разработке.</Text>
    </Stack>
  );
}
