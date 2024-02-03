import { RpcBrowserClientError } from '@choffmeister/rpc-browser'
import { css } from '@linaria/core'
import React from 'react'

import { rpcClient } from '../../api'
import { Card } from '../../components/Card'

interface Props {
  onLogout: () => void
}

export const LogoutView: React.FC<Props> = ({ onLogout }) => {
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        await rpcClient.logout()
        onLogout()
      } catch (err) {
        if (err instanceof RpcBrowserClientError && err.status === 401) {
          onLogout()
        } else {
          console.error(err)
          onLogout()
        }
      }
    }, 1000)
    return () => clearTimeout(timeoutId)
  })
  return (
    <div className={stylesRoot}>
      <h1>myfolio</h1>
      <Card className={stylesCard}>
        <h2>Goodbye</h2>
        <div>You are being logged out in a second...</div>
      </Card>
    </div>
  )
}

const stylesRoot = css`
  padding: var(--spacing-large);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const stylesCard = css`
  max-width: 400px;
  width: 100%;
  margin: var(--spacing-large);
  padding: var(--spacing-large);
  box-sizing: border-box;
`
