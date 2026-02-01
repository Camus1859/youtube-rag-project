import { redis } from './redis.js'

const TTL_SECONDS = 120

export async function checkIdempotencyKey(key: string): Promise<string | null> {
  const value = await redis.get(`idempotency:${key}`)
  return value as string | null
}

export async function setProcessing(key: string): Promise<void> {
  await redis.set(`idempotency:${key}`, 'PROCESSING', { ex: TTL_SECONDS })
}

