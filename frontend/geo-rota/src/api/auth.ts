import api from './apiClient'

export type Role = 'admin' | 'user'

export type AuthUser = {
  id: number
  nome: string
  email: string
  role: Role
  is_active: boolean
}

export type LoginResponse = {
  access_token: string
  token_type: string
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const payload = new URLSearchParams()
  payload.append('username', email)
  payload.append('password', password)

  const { data } = await api.post<LoginResponse>('/auth/token', payload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return data
}

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await api.get<AuthUser>('/usuarios/me')
  return data
}
