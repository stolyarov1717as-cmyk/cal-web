import Calculator from './Calculator'
import AppHeader from './auth/AppHeader'
import ProtectedRoute from './auth/ProtectedRoute'

export default function App() {
  return (
    <ProtectedRoute>
      <AppHeader />
      <Calculator />
    </ProtectedRoute>
  )
}
