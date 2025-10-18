import { useContext, useMemo } from 'react'

import NotificationContext, { type NotificationOptions } from '../context/NotificationContext'

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification deve ser utilizado dentro de um NotificationProvider')
  }
  const { notify, dismiss, clear } = context

  return useMemo(
    () => ({
      notify,
      dismiss,
      clear,
      success: (message: string, options: Omit<NotificationOptions, 'message' | 'type'> = {}) =>
        notify({ ...options, message, type: 'success' }),
      info: (message: string, options: Omit<NotificationOptions, 'message' | 'type'> = {}) =>
        notify({ ...options, message, type: 'info' }),
      warning: (message: string, options: Omit<NotificationOptions, 'message' | 'type'> = {}) =>
        notify({ ...options, message, type: 'warning' }),
      danger: (message: string, options: Omit<NotificationOptions, 'message' | 'type'> = {}) =>
        notify({ ...options, message, type: 'danger' }),
    }),
    [clear, dismiss, notify],
  )
}

export type { NotificationOptions } from '../context/NotificationContext'
