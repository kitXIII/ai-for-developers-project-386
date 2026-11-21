import { Stack, Tabs, Title } from '@mantine/core';
import { useT } from '../lib/i18n';
import { BookingsTab } from './admin/BookingsTab';
import { MeetingTypesTab } from './admin/MeetingTypesTab';

export function AdminPage() {
  const t = useT();

  return (
    <Stack gap="md">
      <Title order={1}>{t('admin.title')}</Title>
      <Tabs defaultValue="meeting-types">
        <Tabs.List>
          <Tabs.Tab value="meeting-types">{t('admin.tabs.meetingTypes')}</Tabs.Tab>
          <Tabs.Tab value="bookings">{t('admin.tabs.bookings')}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="meeting-types" pt="sm">
          <MeetingTypesTab />
        </Tabs.Panel>
        <Tabs.Panel value="bookings" pt="sm">
          <BookingsTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
