import { useState } from 'react'
import type { FormEvent } from 'react'
import { signIn } from '../lib/auth'
import styles from './Auth.module.css'

interface Props {
  onSwitchToSignUp: () => void
}

const isEmailValid = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export default function SignInForm({ onSwitchToSignUp }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!isEmailValid(email)) {
      setError('Введите корректный email')
      return
    }
    if (!password) {
      setError('Введите пароль')
      return
    }

    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Вход</h1>

      <label className={styles.label}>
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </label>

      <label className={styles.label}>
        <span>Пароль</span>
        <input
          type="password"
          autoComplete="current-password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </label>

      {error && <div className={styles.error}>{error}</div>}

      <button type="submit" className={styles.primary} disabled={loading}>
        {loading ? 'Вход…' : 'Войти'}
      </button>

      <button
        type="button"
        className={styles.link}
        onClick={onSwitchToSignUp}
        disabled={loading}
      >
        Нет аккаунта? Зарегистрироваться
      </button>
    </form>
  )
}
