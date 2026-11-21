import { Alert, Center, Loader, Stack, Table, Text } from '@mantine/core';
import { listBookingsOptions } from '@app/api/react-query';
import { useQuery } from '@tanstack/react-query';
import { dayLabel, timeRangeLabel } from '../../lib/datetime';
import { useT } from '../../lib/i18n';

// The owner checks the upcoming bookings of every type (С3). The server answers
// sorted by `start` asc, so the nearest booking is always the first row.
export function BookingsTab() {
  const t = useT();
  const { data: bookings, isPending, isError } = useQuery(listBookingsOptions());

  return (
    <Stack gap="md">
      {isPending && (
        <Center>
          <Loader aria-label={t('admin.bookings.loading')} />
        </Center>
      )}
      {isError && <Alert color="red">{t('admin.bookings.loadFailed')}</Alert>}
      {bookings && bookings.length === 0 && <Text c="dimmed">{t('admin.bookings.empty')}</Text>}
      {bookings && bookings.length > 0 && (
        <Table horizontalSpacing="xs" verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              {/* The column header names the frame: «Когда (UTC+3)». */}
              <Table.Th>{t('admin.bookings.columns.when')}</Table.Th>
              <Table.Th>{t('admin.bookings.columns.type')}</Table.Th>
              <Table.Th>{t('admin.bookings.columns.guest')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {bookings.map((booking) => (
              <Table.Tr key={booking.id}>
                <Table.Td>
                  {dayLabel(booking.start)}, {timeRangeLabel(booking.start, booking.end)}
                </Table.Td>
                {/* The type name is denormalized in the booking (spec #10) — no join. */}
                <Table.Td>{booking.meetingTypeName}</Table.Td>
                <Table.Td>{booking.guestName}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
