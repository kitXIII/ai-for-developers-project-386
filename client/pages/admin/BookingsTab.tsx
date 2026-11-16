import { Alert, Center, Loader, Stack, Table, Text } from '@mantine/core';
import { listBookingsOptions } from '@app/api/react-query';
import { useQuery } from '@tanstack/react-query';
import { dayLabel, timeRangeLabel } from '../../lib/datetime';

// The owner checks the upcoming bookings of every type (С3). The server answers
// sorted by `start` asc, so the nearest booking is always the first row.
export function BookingsTab() {
  const { data: bookings, isPending, isError } = useQuery(listBookingsOptions());

  return (
    <Stack gap="md">
      {isPending && (
        <Center>
          <Loader aria-label="Загрузка бронирований" />
        </Center>
      )}
      {isError && <Alert color="red">Не удалось загрузить бронирования.</Alert>}
      {bookings && bookings.length === 0 && (
        <Text c="dimmed">
          Бронирований пока нет — как только гость запишется, бронь появится здесь.
        </Text>
      )}
      {bookings && bookings.length > 0 && (
        <Table horizontalSpacing="xs" verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              {/* The column header names the frame: «Когда (UTC+3)». */}
              <Table.Th>Когда (UTC+3)</Table.Th>
              <Table.Th>Тип</Table.Th>
              <Table.Th>Гость</Table.Th>
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
