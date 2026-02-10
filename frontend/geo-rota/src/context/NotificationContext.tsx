import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import NotificationContainer, { type NotificationItem, type NotificationType } from '../components/NotificationContainer'

type NotificationContextValue = {
  notify: (options: NotificationOptions) => string
  dismiss: (id: string) => void
  clear: () => void
}

export type NotificationOptions = {
  message: string
  title?: string
  type?: NotificationType
  duration?: number | null
  dismissible?: boolean
}

type TimerRegistry = Record<string, number>

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

type NotificationProviderProps = {
  children: ReactNode
}

const DEFAULT_DURATION = 4000

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const timers = useRef<TimerRegistry>({})

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
    const timer = timers.current[id]
    if (timer) {
      window.clearTimeout(timer)
      delete timers.current[id]
    }
  }, [])

  const clear = useCallback(() => {
    setNotifications([])
    Object.values(timers.current).forEach((timer) => window.clearTimeout(timer))
    timers.current = {}
  }, [])

  const notify = useCallback(
    (options: NotificationOptions) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ntf_${Date.now()}_${Math.random()}` // eslint-disable-line no-magic-numbers
      const {
        message,
        title,
        type = 'info',
        dismissible = true,
        duration = DEFAULT_DURATION,
      } = options

      setNotifications((prev) => [
        ...prev,
        {
          id,
          message,
          title,
          type,
          dismissible,
        },
      ])

      if (duration && duration > 0) {
        const timerId = window.setTimeout(() => {
          dismiss(id)
        }, duration)
        timers.current[id] = timerId
      }

      return id
    },
    [dismiss],
  )

  const value = useMemo<NotificationContextValue>(
    () => ({
      notify,
      dismiss,
      clear,
    }),
    [clear, dismiss, notify],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer notifications={notifications} onClose={dismiss} />
    </NotificationContext.Provider>
  )
}

export default NotificationContext
