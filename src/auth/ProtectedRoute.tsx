import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import AuthPage from './AuthPage'
import styles from './Auth.module.css'

interface Props {
  children: ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка…</div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return <>{children}</>
}
