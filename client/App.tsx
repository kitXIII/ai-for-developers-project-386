import { getMessage } from '@app/api'
import { useEffect, useState } from 'react'

export function App() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getMessage()
      .then(({ data }) => {
        if (!cancelled && data) {
          setMessage(data.message)
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main>
      {error !== null && <p>Ошибка: {error}</p>}
      {error === null && message === null && <p>Загрузка…</p>}
      {message !== null && <p>{message}</p>}
    </main>
  )
}
