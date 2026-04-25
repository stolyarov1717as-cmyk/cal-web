import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  loadCalculatorState,
  saveCalculatorState,
  type PersistableState,
} from '../lib/calculatorSync'

const SAVE_DEBOUNCE_MS = 500

export interface UseCalculatorSyncResult {
  initialState: PersistableState | null
  loaded: boolean
  save: (state: PersistableState) => void
}

export function useCalculatorSync(): UseCalculatorSyncResult {
  const { user } = useAuth()
  const [initialState, setInitialState] = useState<PersistableState | null>(null)
  const [loaded, setLoaded] = useState(false)

  const saveTimerRef = useRef<number | null>(null)
  const pendingStateRef = useRef<PersistableState | null>(null)
  const userIdRef = useRef<string | null>(null)
  userIdRef.current = user?.id ?? null

  // Загрузка стартового состояния при логине.
  useEffect(() => {
    if (!user) {
      setInitialState(null)
      setLoaded(true)
      return
    }
    let cancelled = false
    setLoaded(false)
    loadCalculatorState(user.id).then((state) => {
      if (cancelled) return
      setInitialState(state)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  // При размонтировании — сбрасываем висящий таймер сохранения.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [])

  const save = useCallback((state: PersistableState) => {
    const userId = userIdRef.current
    if (!userId) return

    pendingStateRef.current = state
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      const pending = pendingStateRef.current
      const currentUserId = userIdRef.current
      pendingStateRef.current = null
      if (pending && currentUserId) void saveCalculatorState(currentUserId, pending)
    }, SAVE_DEBOUNCE_MS)
  }, [])

  return { initialState, loaded, save }
}
