import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import { useDialogs } from '../../components/DialogsContext'
import { ErrorDialog } from '../../components/ErrorDialog'
import { config } from '../../config'
import { PrivacyContextProvider } from '../../privacy'
import { HomeView } from '../home/HomeView'
import { LoginView } from '../login/LoginView'
import { LogoutView } from '../logout/LogoutView'
import { RegisterView } from '../register/RegisterView'
import { LoginGate } from './LoginGate'

export const MainView: React.FC = () => {
  const { openDialog } = useDialogs()
  const location = useLocation()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      event.preventDefault()
      console.error('Unhandled error', event.error)
      openDialog(ErrorDialog, { error: event.error })
    }
    const unhandledrejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault()
      console.error('Unhandled rejection', event.reason)
      openDialog(ErrorDialog, { error: event.reason })
    }
    window.addEventListener('unhandledrejection', unhandledrejectionHandler)
    window.addEventListener('error', errorHandler)
    return () => {
      window.removeEventListener('unhandledrejection', unhandledrejectionHandler)
      window.removeEventListener('error', errorHandler)
    }
  }, [])

  React.useEffect(() => {
    queryClient
      .getQueryCache()
      .getAll()
      .filter(q => !!q.state.error)
      .forEach(q => queryClient.getQueryCache().remove(q))
  }, [location.pathname])

  return (
    <Routes>
      <Route path="login" element={<LoginView onLogin={() => goto('/')} />} />
      <Route path="logout" element={<LogoutView onLogout={() => goto('/')} />} />
      {config?.userRegistrationEnabled && (
        <Route path="register" element={<RegisterView onRegister={() => goto('/')} />} />
      )}
      <Route
        path="*"
        element={
          <LoginGate onLoginRequired={() => goto('/login')}>
            <PrivacyContextProvider>
              <HomeView />
            </PrivacyContextProvider>
          </LoginGate>
        }
      />
    </Routes>
  )
}

function goto(url: string): void {
  window.location.href = url
}
