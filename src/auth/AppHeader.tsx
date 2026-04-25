import { useState } from 'react'
import { signOut } from '../lib/auth'
import { useAuth } from './AuthContext'
import styles from './Auth.module.css'

export default function AppHeader() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const handleSignOut = async () => {
    setError(null)
    setLoading(true)
    try {
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выйти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className={styles.header}>
      <span className={styles.email} title={user.email ?? ''}>
        {user.email}
      </span>
      <button
        type="button"
        className={styles.logout}
        onClick={handleSignOut}
        disabled={loading}
      >
        {loading ? 'Выход…' : 'Выйти'}
      </button>
      {error && <span className={styles.headerError}>{error}</span>}
    </header>
  )
}
