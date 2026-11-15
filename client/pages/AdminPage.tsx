import { Stack, Tabs, Title } from '@mantine/core';
import { MeetingTypesTab } from './admin/MeetingTypesTab';

export function AdminPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Администрирование</Title>
      <Tabs defaultValue="meeting-types">
        <Tabs.List>
          <Tabs.Tab value="meeting-types">Типы встреч</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="meeting-types" pt="sm">
          <MeetingTypesTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
