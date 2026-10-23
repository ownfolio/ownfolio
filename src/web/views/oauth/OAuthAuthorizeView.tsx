import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

import { OAuthAuthorizationRequest } from '../../../shared/api/oauth'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Message } from '../../components/Message'
import { ViewContainer } from '../../components/ViewContainer'
import { parseError } from '../../error'

export const OAuthAuthorizeView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const request: OAuthAuthorizationRequest = {
    clientId: searchParams.get('client_id') || '',
    redirectUri: searchParams.get('redirect_uri') || '',
    codeChallenge: searchParams.get('code_challenge') || '',
    state: searchParams.get('state') ?? undefined,
    scope: searchParams.get('scope') ?? undefined,
    resource: searchParams.get('resource') ?? undefined,
  }
  const { data: client } = useSuspenseQuery({
    queryKey: ['oauthClient', request.clientId, request.redirectUri],
    queryFn: () => rpcClient.retrieveOAuthClient(request).then(r => r.data),
  })
  const [message, setMessage] = React.useState('')

  const decide = async (approve: boolean) => {
    try {
      setMessage('')
      const { redirectUrl } = await rpcClient.decideOAuthAuthorization({ ...request, approve }).then(r => r.data)
      window.location.href = redirectUrl
    } catch (err) {
      setMessage(parseError(err).description || 'Unknown error')
    }
  }

  const clientName = client.clientName || request.clientId
  return (
    <ViewContainer className={stylesRoot}>
      <h1>ownfolio</h1>
      <Card className={stylesCard}>
        <h2>Authorize {clientName}</h2>
        {message && <Message kind="warning">{message}</Message>}
        <p>
          <strong>{clientName}</strong> wants to access your ownfolio account via MCP. It will be able to read and
          change all of your portfolios, accounts, assets, transactions and attachments.
        </p>
        {client.clientUri && <p>{client.clientUri}</p>}
        <p>After approving you will be redirected to {new URL(request.redirectUri).origin}.</p>
        <div className={stylesButtons}>
          <Button variant="secondary" onClick={() => decide(false)}>
            Deny
          </Button>
          <Button variant="primary" onClick={() => decide(true)}>
            Approve
          </Button>
        </div>
      </Card>
    </ViewContainer>
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
  max-width: 525px;
  width: 100%;
  margin: var(--spacing-large);
  padding: var(--spacing-large);
  box-sizing: border-box;
  display: grid;
  grid-gap: var(--spacing-medium);

  & > * {
    margin: 0;
  }
`

const stylesButtons = css`
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-medium);
`
