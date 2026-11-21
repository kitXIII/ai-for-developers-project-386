import { Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import { useT } from '../lib/i18n';

export function NotFoundPage() {
  const t = useT();

  return (
    <Stack gap="md">
      <Title size="54" order={1}>
        {t('notFound.title')}
      </Title>
      <Text>{t('notFound.text')}</Text>
      <Text>
        <Link to="/">{t('common.nav.home')}</Link>
      </Text>
    </Stack>
  );
}
