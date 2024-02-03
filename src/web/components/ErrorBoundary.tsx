import React from 'react'
import { useLocation } from 'react-router-dom'

import { ErrorView, errorViewProps } from '../views/error/ErrorView'

export interface ErrorBoundaryProps {
  renderError: (error: any, reset: () => void) => React.ReactNode
  resetKey?: string
  children: React.ReactElement
}

export interface ErrorBoundaryState {
  error?: any
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    error: undefined,
  }

  public componentDidCatch(error: any, _info: any) {
    this.setState({ error })
  }

  public componentDidUpdate(
    prevProps: Readonly<ErrorBoundaryProps>,
    _prevState: Readonly<ErrorBoundaryState>,
    _snapshot?: any
  ): void {
    if (prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: undefined })
    }
  }

  public render() {
    const { renderError, children } = this.props
    const { error } = this.state
    if (!error) {
      return children
    } else {
      return renderError(error, () => {
        this.setState({ error: undefined })
      })
    }
  }
}

export const DefaultErrorBoundary: React.FC<Pick<ErrorBoundaryProps, 'children'>> = ({ children }) => {
  const location = useLocation()

  return (
    <ErrorBoundary renderError={err => <ErrorView {...errorViewProps(err)} />} resetKey={location.pathname}>
      {children}
    </ErrorBoundary>
  )
}
