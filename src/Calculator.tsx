import { useCallback, useEffect, useReducer } from 'react'
import styles from './Calculator.module.css'

export type Operator = '+' | '-' | '*' | '/'

export interface State {
  current: string
  stored: number | null
  pendingOp: Operator | null
  waitingForOperand: boolean
  justEvaluated: boolean
}

type Action =
  | { type: 'digit'; digit: string }
  | { type: 'dot' }
  | { type: 'op'; op: Operator }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'sign' }
  | { type: 'percent' }

const MAX_LEN = 12

const initialState: State = {
  current: '0',
  stored: null,
  pendingOp: null,
  waitingForOperand: false,
  justEvaluated: false,
}

const formatNumber = (num: number): string => {
  if (!isFinite(num)) return 'Ошибка'
  let str = Number(num.toPrecision(12)).toString()
  if (str.length > MAX_LEN) {
    str = Number(num).toExponential(6)
  }
  return str.replace('.', ',')
}

const parseDisplay = (s: string): number => Number(s.replace(',', '.'))

const compute = (a: number, b: number, op: Operator): number => {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '*':
      return a * b
    case '/':
      return b === 0 ? NaN : a / b
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'digit': {
      const d = action.digit
      if (state.waitingForOperand) {
        return { ...state, current: d, waitingForOperand: false, justEvaluated: false }
      }
      if (state.justEvaluated) {
        return { ...state, current: d, justEvaluated: false, stored: null, pendingOp: null }
      }
      if (state.current === '0') {
        return { ...state, current: d }
      }
      if (state.current.replace(/[-,]/g, '').length >= MAX_LEN) {
        return state
      }
      return { ...state, current: state.current + d }
    }

    case 'dot': {
      if (state.waitingForOperand) {
        return { ...state, current: '0,', waitingForOperand: false, justEvaluated: false }
      }
      if (state.justEvaluated) {
        return { ...state, current: '0,', justEvaluated: false, stored: null, pendingOp: null }
      }
      if (state.current.includes(',')) return state
      return { ...state, current: state.current + ',' }
    }

    case 'op': {
      const inputValue = parseDisplay(state.current)

      if (state.pendingOp && state.waitingForOperand) {
        return { ...state, pendingOp: action.op }
      }

      if (state.stored === null) {
        return {
          ...state,
          stored: inputValue,
          pendingOp: action.op,
          waitingForOperand: true,
          justEvaluated: false,
        }
      }

      if (state.pendingOp) {
        const result = compute(state.stored, inputValue, state.pendingOp)
        return {
          ...state,
          stored: result,
          current: formatNumber(result),
          pendingOp: action.op,
          waitingForOperand: true,
          justEvaluated: false,
        }
      }

      return {
        ...state,
        pendingOp: action.op,
        waitingForOperand: true,
        justEvaluated: false,
      }
    }

    case 'equals': {
      if (state.pendingOp === null || state.stored === null) return state
      if (state.waitingForOperand) return state
      const inputValue = parseDisplay(state.current)
      const result = compute(state.stored, inputValue, state.pendingOp)
      return {
        ...state,
        current: formatNumber(result),
        stored: null,
        pendingOp: null,
        waitingForOperand: false,
        justEvaluated: true,
      }
    }

    case 'clear':
      return initialState

    case 'sign': {
      if (state.current === '0') return state
      const next = state.current.startsWith('-')
        ? state.current.slice(1)
        : '-' + state.current
      return { ...state, current: next }
    }

    case 'percent': {
      const value = parseDisplay(state.current)
      const result =
        state.stored !== null && state.pendingOp ? (state.stored * value) / 100 : value / 100
      return { ...state, current: formatNumber(result), justEvaluated: true }
    }
  }
}

interface Props {
  initialState?: State | null
  onStateChange?: (state: State) => void
}

export default function Calculator({ initialState: externalInitial, onStateChange }: Props = {}) {
  const [state, dispatch] = useReducer(reducer, externalInitial ?? initialState)

  // Передаём актуальное состояние наружу — родитель решит, сохранять или нет.
  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  const isOpActive = useCallback(
    (op: Operator) => state.pendingOp === op && state.waitingForOperand,
    [state.pendingOp, state.waitingForOperand],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key
      if (/^[0-9]$/.test(k)) dispatch({ type: 'digit', digit: k })
      else if (k === '.' || k === ',') dispatch({ type: 'dot' })
      else if (k === '+' || k === '-' || k === '*' || k === '/')
        dispatch({ type: 'op', op: k })
      else if (k === 'Enter' || k === '=') {
        e.preventDefault()
        dispatch({ type: 'equals' })
      } else if (k === 'Escape' || k === 'c' || k === 'C') dispatch({ type: 'clear' })
      else if (k === '%') dispatch({ type: 'percent' })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const opClass = (op: Operator) =>
    `${styles.key} ${styles.op}${isOpActive(op) ? ' ' + styles.active : ''}`

  return (
    <div className={styles.calculator}>
      <div className={styles.display}>{state.current}</div>
      <div className={styles.keys}>
        <button className={`${styles.key} ${styles.func}`} onClick={() => dispatch({ type: 'clear' })}>
          AC
        </button>
        <button className={`${styles.key} ${styles.func}`} onClick={() => dispatch({ type: 'sign' })}>
          +/−
        </button>
        <button className={`${styles.key} ${styles.func}`} onClick={() => dispatch({ type: 'percent' })}>
          %
        </button>
        <button className={opClass('/')} onClick={() => dispatch({ type: 'op', op: '/' })}>
          ÷
        </button>

        {[7, 8, 9].map((n) => (
          <button
            key={n}
            className={`${styles.key} ${styles.digit}`}
            onClick={() => dispatch({ type: 'digit', digit: String(n) })}
          >
            {n}
          </button>
        ))}
        <button className={opClass('*')} onClick={() => dispatch({ type: 'op', op: '*' })}>
          ×
        </button>

        {[4, 5, 6].map((n) => (
          <button
            key={n}
            className={`${styles.key} ${styles.digit}`}
            onClick={() => dispatch({ type: 'digit', digit: String(n) })}
          >
            {n}
          </button>
        ))}
        <button className={opClass('-')} onClick={() => dispatch({ type: 'op', op: '-' })}>
          −
        </button>

        {[1, 2, 3].map((n) => (
          <button
            key={n}
            className={`${styles.key} ${styles.digit}`}
            onClick={() => dispatch({ type: 'digit', digit: String(n) })}
          >
            {n}
          </button>
        ))}
        <button className={opClass('+')} onClick={() => dispatch({ type: 'op', op: '+' })}>
          +
        </button>

        <button
          className={`${styles.key} ${styles.digit} ${styles.zero}`}
          onClick={() => dispatch({ type: 'digit', digit: '0' })}
        >
          0
        </button>
        <button className={`${styles.key} ${styles.digit}`} onClick={() => dispatch({ type: 'dot' })}>
          ,
        </button>
        <button
          className={`${styles.key} ${styles.op}`}
          onClick={() => dispatch({ type: 'equals' })}
        >
          =
        </button>
      </div>
    </div>
  )
}
