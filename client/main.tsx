import { client } from '@app/api/client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

// SDK calls are same-origin, so requests hit the Fastify server in dev and prod.
client.setConfig({ baseUrl: '/api' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
