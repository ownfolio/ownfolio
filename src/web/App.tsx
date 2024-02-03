import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'

import { DialogsContext } from './components/DialogsContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorView, errorViewProps } from './views/error/ErrorView'
import { LoadingView } from './views/loading/LoadingView'
import { MainView } from './views/main/MainView'

export const App: React.FC = () => {
  const queryClient = React.useRef(
    new QueryClient({
      defaultOptions: {
        queries: {
          suspense: true,
          refetchIntervalInBackground: false,
          refetchInterval: 60000,
          retry: 1,
          retryDelay: 1000,
          cacheTime: 120000,
          structuralSharing: true,
          keepPreviousData: true,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        },
      },
    })
  )

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient.current}>
        <ErrorBoundary renderError={err => <ErrorView {...errorViewProps(err)} />}>
          <React.Suspense fallback={<LoadingView />}>
            <DialogsContext>
              <MainView />
            </DialogsContext>
          </React.Suspense>
        </ErrorBoundary>
      </QueryClientProvider>
    </BrowserRouter>
  )
}
