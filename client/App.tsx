import { getMessageOptions } from '@app/api/react-query'
import { useQuery } from '@tanstack/react-query'

export function App() {
  const { data, error, isPending } = useQuery(getMessageOptions())

  return (
    <main>
      {error !== null && <p>Ошибка: {error.message}</p>}
      {error === null && isPending && <p>Загрузка…</p>}
      {error === null && !isPending && data !== undefined && <p>{data.message}</p>}
    </main>
  )
}
