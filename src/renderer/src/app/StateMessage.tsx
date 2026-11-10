import { Alert } from '@mantine/core'
import { IconCheck, IconInfoCircle, IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react'

export function StateMessage({
  kind = 'info',
  title,
  children,
}: {
  kind?: 'info' | 'success' | 'warning' | 'error'
  title: string
  children?: React.ReactNode
}) {
  const icons = {
    info: IconInfoCircle,
    success: IconCheck,
    warning: IconAlertTriangle,
    error: IconAlertCircle,
  }
  const Icon = icons[kind]
  const textColor = { info: '#19578a', success: '#09634f', warning: '#8a3d00', error: '#a12622' }[
    kind
  ]
  return (
    <Alert
      color={{ info: 'blue', success: 'teal', warning: 'orange', error: 'red' }[kind]}
      icon={<Icon size={18} />}
      title={title}
      role={kind === 'error' ? 'alert' : 'status'}
      styles={{
        title: { color: textColor },
        message: { color: textColor },
        icon: { color: textColor },
      }}
    >
      {children}
    </Alert>
  )
}
