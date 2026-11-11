import { getMessageOptions } from '@app/api/react-query';
import { Alert, Loader, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

export function App() {
  const { data, error, isPending } = useQuery(getMessageOptions());

  return (
    <main>
      {error !== null && (
        <Alert title="Ошибка" color="red">
          {error.message}
        </Alert>
      )}
      {error === null && isPending && <Loader size="sm" />}
      {error === null && !isPending && data !== undefined && <Text>{data.message}</Text>}
    </main>
  );
}
