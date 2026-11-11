import type { Message } from '@app/api/types'
import { resolve } from 'node:path'
import Fastify, { type FastifyInstance } from 'fastify'
import FastifyVite from '@fastify/vite'

type BuildAppOptions = {
  // Tests disable the client to avoid starting Vite.
  serveClient?: boolean
  // Tests disable logging to keep the output clean.
  logger?: boolean
}

export async function buildApp({
  serveClient = true,
  logger = true,
}: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger })

  // Running from `server/` during development and from `dist/` in production,
  // so `..` points to the project root in both cases.
  const root = resolve(import.meta.dirname, '..')

  if (serveClient) {
    await app.register(FastifyVite, {
      root,
      dev: process.argv.includes('--dev'),
      spa: true,
    })
  }

  // The handler return type comes from the TypeSpec contract, so a contract
  // change that breaks the server fails the typecheck.
  app.get('/api/message', async (): Promise<Message> => {
    return { message: 'Hello from Fastify!' }
  })

  if (serveClient) {
    app.get('/', (_request, reply) => reply.html())
  }

  // SPA fallback: any non-API GET request renders the client app,
  // so client-side routes work on a hard refresh or direct link.
  app.setNotFoundHandler((request, reply) => {
    if (serveClient && request.method === 'GET' && !/^\/api(\/|$)/.test(request.url)) {
      return reply.html()
    }
    return reply.code(404).send({ message: 'Not Found' })
  })

  if (serveClient) {
    await app.vite.ready()
  }

  return app
}
