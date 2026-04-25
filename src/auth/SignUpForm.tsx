import { useState } from 'react'
import type { FormEvent } from 'react'
import { signUp } from '../lib/auth'
import styles from './Auth.module.css'

interface Props {
  onSwitchToSignIn: () => void
}

const isEmailValid = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export default function SignUpForm({ onSwitchToSignIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!isEmailValid(email)) {
      setError('Введите корректный email')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    try {
      const { session } = await signUp(email.trim(), password)
      if (!session) {
        setInfo('На ваш email отправлено письмо для подтверждения регистрации')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Регистрация</h1>

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
          autoComplete="new-password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          minLength={6}
          required
        />
      </label>

      <label className={styles.label}>
        <span>Повторите пароль</span>
        <input
          type="password"
          autoComplete="new-password"
          className={styles.input}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          minLength={6}
          required
        />
      </label>

      {error && <div className={styles.error}>{error}</div>}
      {info && <div className={styles.info}>{info}</div>}

      <button type="submit" className={styles.primary} disabled={loading}>
        {loading ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
      </button>

      <button
        type="button"
        className={styles.link}
        onClick={onSwitchToSignIn}
        disabled={loading}
      >
        Уже есть аккаунт? Войти
      </button>
    </form>
  )
}
