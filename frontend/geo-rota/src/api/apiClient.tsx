import axios, { type AxiosError } from 'axios'

import { tokenStorage } from '../utils/tokenStorage'

type UnauthorizedHandler = (() => void) | null

let unauthorizedHandler: UnauthorizedHandler = null

export const setUnauthorizedHandler = (handler?: () => void) => {
  unauthorizedHandler = handler ?? null
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  config.withCredentials = true
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStorage.clear()
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)

export default api
