import Calculator from './Calculator'
import type { State } from './Calculator'
import { useCalculatorSync } from './hooks/useCalculatorSync'
import authStyles from './auth/Auth.module.css'

export default function CalculatorPage() {
  const { initialState, loaded, save } = useCalculatorSync()

  if (!loaded) {
    return <div className={authStyles.loading}>Загрузка состояния…</div>
  }

  return (
    <Calculator
      initialState={initialState as State | null}
      onStateChange={(state) => {
        save({
          current: state.current,
          stored: state.stored,
          pendingOp: state.pendingOp,
          waitingForOperand: state.waitingForOperand,
          justEvaluated: state.justEvaluated,
        })
      }}
    />
  )
}
