import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import { useT } from '../lib/i18n';

export function HomePage() {
  const t = useT();

  return (
    <Stack gap="md">
      <Title order={1}>{t('common.appName')}</Title>
      <Text size="lg">{t('home.description')}</Text>
      <Group gap="sm">
        <Button component={Link} to="/booking">
          {t('home.bookAction')}
        </Button>
      </Group>
    </Stack>
  );
}
