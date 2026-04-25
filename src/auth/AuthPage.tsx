import { useState } from 'react'
import SignInForm from './SignInForm'
import SignUpForm from './SignUpForm'
import styles from './Auth.module.css'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {mode === 'signin' ? (
          <SignInForm onSwitchToSignUp={() => setMode('signup')} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setMode('signin')} />
        )}
      </div>
    </div>
  )
}
