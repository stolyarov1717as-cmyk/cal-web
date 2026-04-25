import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void

export interface AuthResult {
  user: User | null
  session: Session | null
}

const translateAuthError = (message: string): string => {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль'
  if (m.includes('email not confirmed')) return 'Email не подтверждён. Проверьте почту'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Этот email уже зарегистрирован'
  if (m.includes('password should be at least'))
    return 'Пароль слишком короткий (минимум 6 символов)'
  if (m.includes('unable to validate email address') || m.includes('invalid email'))
    return 'Некорректный email'
  if (m.includes('rate limit')) return 'Слишком много попыток, попробуйте позже'
  if (m.includes('network')) return 'Проблема с сетью, проверьте соединение'
  return message || 'Неизвестная ошибка'
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(translateAuthError(error.message))
  return { user: data.user, session: data.session }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(translateAuthError(error.message))
  return { user: data.user, session: data.session }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(translateAuthError(error.message))
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(translateAuthError(error.message))
  return data.session
}

export function onAuthStateChange(callback: AuthCallback): Subscription {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return data.subscription
}
