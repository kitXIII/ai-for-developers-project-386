import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../server/app.js'

describe('API', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp({ serveClient: false, logger: false })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/message returns the greeting', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/message' })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/json')
    expect(response.json()).toEqual({ message: 'Hello from Fastify!' })
  })

  it('GET /api/unknown returns a JSON 404', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/unknown' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'Not Found' })
  })

  it('GET /api returns a JSON 404', async () => {
    const response = await app.inject({ method: 'GET', url: '/api' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'Not Found' })
  })

  it('POST /api/message returns a JSON 404', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/message' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ message: 'Not Found' })
  })
})
