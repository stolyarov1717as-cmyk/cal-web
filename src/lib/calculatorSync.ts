import { supabase } from './supabaseClient'

export type Operator = '+' | '-' | '*' | '/'

export interface PersistableState {
  current: string
  stored: number | null
  pendingOp: Operator | null
  waitingForOperand: boolean
  justEvaluated: boolean
}

interface CalculatorStateRow {
  display: string
  accumulator: string | null
  operator: string | null
  waiting_for_operand: boolean
  has_user_input: boolean
}

const isOperator = (s: string | null): s is Operator =>
  s === '+' || s === '-' || s === '*' || s === '/'

const rowToState = (row: CalculatorStateRow): PersistableState => ({
  current: row.display,
  stored:
    row.accumulator !== null && row.accumulator !== '' && Number.isFinite(Number(row.accumulator))
      ? Number(row.accumulator)
      : null,
  pendingOp: isOperator(row.operator) ? row.operator : null,
  waitingForOperand: row.waiting_for_operand,
  // has_user_input — это инвертированный justEvaluated:
  // после '=' пользовательского ввода нет, has_user_input=false → justEvaluated=true
  justEvaluated: !row.has_user_input,
})

export async function loadCalculatorState(userId: string): Promise<PersistableState | null> {
  const { data, error } = await supabase
    .from('calculator_state')
    .select('display, accumulator, operator, waiting_for_operand, has_user_input')
    .eq('user_id', userId)
    .maybeSingle<CalculatorStateRow>()

  if (error) {
    console.error('Failed to load calculator state:', error.message)
    return null
  }
  return data ? rowToState(data) : null
}

export async function saveCalculatorState(
  userId: string,
  state: PersistableState,
): Promise<void> {
  const accumulator =
    state.stored !== null && Number.isFinite(state.stored) ? String(state.stored) : null

  const { error } = await supabase.from('calculator_state').upsert(
    {
      user_id: userId,
      display: state.current,
      accumulator,
      operator: state.pendingOp,
      waiting_for_operand: state.waitingForOperand,
      has_user_input: !state.justEvaluated,
    },
    { onConflict: 'user_id' },
  )

  if (error) console.error('Failed to save calculator state:', error.message)
}
