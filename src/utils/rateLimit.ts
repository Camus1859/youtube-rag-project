import { redis } from '../utils/redis.js'

type RateLimitResult = {
  isAllowed: boolean
  remaining: number
  resetTime: number
}

export const checkRateLimit = async (
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60,
): Promise<RateLimitResult> => {
  const now = Math.floor(Date.now() / 1000)
  const windowKey = Math.floor(now / windowSeconds)
  const key = `ratelimit:${identifier}:${windowKey}`

  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, windowSeconds)
  }

  const resetTime = (windowKey + 1) * windowSeconds

  if (count <= limit) {
    return {
      isAllowed: true,
      remaining: limit - count,
      resetTime,
    }
  }

  return {
    isAllowed: false,
    remaining: 0,
    resetTime,
  }
}
