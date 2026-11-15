import { Stack, Tabs, Title } from '@mantine/core';
import { BookingsTab } from './admin/BookingsTab';
import { MeetingTypesTab } from './admin/MeetingTypesTab';

export function AdminPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Администрирование</Title>
      <Tabs defaultValue="meeting-types">
        <Tabs.List>
          <Tabs.Tab value="meeting-types">Типы встреч</Tabs.Tab>
          <Tabs.Tab value="bookings">Бронирования</Tabs.Tab>
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
