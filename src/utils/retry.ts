const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 500,
  shouldRetry: (error: any) => boolean,
): Promise<T> => {
  let attempt = 0
  while (attempt <= maxRetries) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
      await new Promise(res => setTimeout(res, delay))
      attempt++
    }
  }
    throw new Error("Exceeded maximum retries")
}

const shouldRetryOnNetworkError = (error: any): boolean => {
  const isNetworkError =
    error &&
    (error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'EAI_AGAIN')
  if (isNetworkError) {
    return true
  }

  if (error && error.status === 429) {
    return true
  }
  if (error && error.status >= 500) {
    return true
  }

  return false
}

export { withRetry, shouldRetryOnNetworkError }