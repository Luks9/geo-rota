const TOKEN_KEY = 'geo-rota:access-token'

const isBrowser = typeof window !== 'undefined'

function safeGetItem(key: string): string | null {
  if (!isBrowser) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* noop */
  }
}

function safeRemoveItem(key: string): void {
  if (!isBrowser) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

export const tokenStorage = {
  key: TOKEN_KEY,
  get(): string | null {
    return safeGetItem(TOKEN_KEY)
  },
  set(token: string): void {
    safeSetItem(TOKEN_KEY, token)
  },
  clear(): void {
    safeRemoveItem(TOKEN_KEY)
  },
}
