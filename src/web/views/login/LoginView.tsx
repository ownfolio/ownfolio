import { css } from '@linaria/core'
import React from 'react'
import { Link } from 'react-router-dom'

import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { Message } from '../../components/Message'
import { ViewContainer } from '../../components/ViewContainer'
import { config } from '../../config'
import { parseError } from '../../error'
import { useMultiState } from '../../hooks/useMultiState'

interface Props {
  onLogin: () => void
}

export const LoginView: React.FC<Props> = ({ onLogin }) => {
  const [state, updateState] = useMultiState({
    busy: false,
    message: '',
  })
  const [form, updateForm] = useMultiState({
    email: '',
    password: '',
  })

  return (
    <ViewContainer className={stylesRoot}>
      <h1>ownfolio</h1>
      <Card className={stylesCard}>
        <Form
          onSubmit={async event => {
            event.preventDefault()
            try {
              updateState({ busy: true, message: '' })
              await rpcClient.login({
                email: form.email,
                password: form.password,
                rememberMe: true,
              })
              onLogin()
            } catch (err) {
              updateState({ busy: false, message: parseError(err).description || 'Unknown error' })
            }
          }}
        >
          <h2>Sign in to your account</h2>
          {state.message && <Message kind="warning">{state.message}</Message>}
          <Label text="Your email" htmlFor="email">
            <Input
              type="email"
              name="email"
              id="email"
              placeholder="name@company.com"
              required
              value={form.email}
              readOnly={state.busy}
              onChange={event => updateForm({ email: event.target.value })}
              autoFocus
            />
          </Label>
          <Label text="Password" htmlFor="password">
            <Input
              type="password"
              name="password"
              id="password"
              placeholder="••••••••"
              required
              readOnly={state.busy}
              value={form.password}
              onChange={event => updateForm({ password: event.target.value })}
            />
          </Label>
          <Button type="submit" busy={state.busy} variant="primary">
            Sign in
          </Button>
          {config?.userRegistrationEnabled && (
            <p>
              Don’t have an account yet? <Link to="/register">Sign up</Link>
            </p>
          )}
        </Form>
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
`
