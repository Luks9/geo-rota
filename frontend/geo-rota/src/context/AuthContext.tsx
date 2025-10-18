import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'

import { setUnauthorizedHandler } from '../api/apiClient'
import { fetchCurrentUser, login as loginRequest, type AuthUser } from '../api/auth'
import { tokenStorage } from '../utils/tokenStorage'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isInitializing: boolean
  isAuthenticating: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

const defaultErrorMessage = 'Falha ao autenticar. Verifique suas credenciais e tente novamente.'

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => tokenStorage.get())
  const [isInitializing, setIsInitializing] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logout = useCallback(() => {
    tokenStorage.clear()
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      const responseMessage = err.response?.data && (err.response.data as { detail?: string }).detail
      if (typeof responseMessage === 'string' && responseMessage.trim() !== '') {
        return responseMessage
      }
    }
    return defaultErrorMessage
  }

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      return
    }
    try {
      const profile = await fetchCurrentUser()
      setUser(profile)
    } catch (err) {
      logout()
      throw err
    }
  }, [logout, token])

  const login = useCallback(
    async (email: string, password: string) => {
      setIsAuthenticating(true)
      setError(null)
      try {
        const { access_token: accessToken } = await loginRequest(email.trim(), password)
        tokenStorage.set(accessToken)
        setToken(accessToken)
        const profile = await fetchCurrentUser()
        setUser(profile)
      } catch (err) {
        const message = extractErrorMessage(err)
        tokenStorage.clear()
        setToken(null)
        setUser(null)
        setError(message)
        throw new Error(message)
      } finally {
        setIsAuthenticating(false)
      }
    },
    [],
  )

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
    })

    return () => {
      setUnauthorizedHandler(undefined)
    }
  }, [logout])

  useEffect(() => {
    if (!token) {
      setIsInitializing(false)
      return
    }

    let isMounted = true
    const run = async () => {
      try {
        await refreshUser()
      } catch {
        if (isMounted) logout()
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    run()

    return () => {
      isMounted = false
    }
  }, [logout, refreshUser, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isInitializing,
      isAuthenticating,
      error,
      login,
      logout,
      refreshUser,
    }),
    [error, isAuthenticating, isInitializing, login, logout, refreshUser, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
