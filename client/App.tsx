import { useEffect, useState } from 'react'

type MessageResponse = {
  message: string
}

export function App() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/message')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        return response.json() as Promise<MessageResponse>
      })
      .then((data) => {
        if (!cancelled) {
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
