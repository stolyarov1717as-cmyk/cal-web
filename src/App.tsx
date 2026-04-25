import CalculatorPage from './CalculatorPage'
import AppHeader from './auth/AppHeader'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'

function AuthedApp() {
  const { user } = useAuth()
  return (
    <>
      <AppHeader />
      {/* key={user.id} — при смене пользователя Calculator полностью пересоздаётся,
          сбрасывая остаточное состояние от предыдущей сессии. */}
      <CalculatorPage key={user?.id ?? 'anon'} />
    </>
  )
}

export default function App() {
  return (
    <ProtectedRoute>
      <AuthedApp />
    </ProtectedRoute>
  )
}
