import type { CSSProperties, ReactNode } from 'react'

export type NotificationType = 'success' | 'info' | 'warning' | 'danger'

export type NotificationItem = {
  id: string
  message: string
  title?: string
  type: NotificationType
  dismissible?: boolean
}

type NotificationContainerProps = {
  notifications: NotificationItem[]
  onClose: (id: string) => void
}

const typeToClassName: Record<NotificationType, string> = {
  success: 'is-success',
  info: 'is-info',
  warning: 'is-warning',
  danger: 'is-danger',
}

function NotificationContainer({ notifications, onClose }: NotificationContainerProps) {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div style={containerStyle} role="region" aria-live="polite" aria-label="Notificações">
      {notifications.map((notification) => {
        const { id, title, message, type, dismissible = true } = notification
        return (
          <div key={id} className={`notification ${typeToClassName[type]}`} style={notificationStyle}>
            {dismissible && (
              <button
                type="button"
                className="delete"
                aria-label="Fechar notificação"
                onClick={() => onClose(id)}
              />
            )}
            {title && <p className="has-text-weight-semibold mb-1">{title}</p>}
            <NotificationContent>{message}</NotificationContent>
          </div>
        )
      })}
    </div>
  )
}

type NotificationContentProps = {
  children: ReactNode
}

function NotificationContent({ children }: NotificationContentProps) {
  if (typeof children === 'string') {
    return <p>{children}</p>
  }
  return <>{children}</>
}

const containerStyle: CSSProperties = {
  position: 'fixed',
  top: '1.5rem',
  right: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  zIndex: 9999,
  maxWidth: '24rem',
}

const notificationStyle: CSSProperties = {
  boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
  paddingRight: '2.5rem',
}

export default NotificationContainer
