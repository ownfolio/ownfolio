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
import { parseError } from '../../error'
import { useMultiState } from '../../hooks/useMultiState'

interface Props {
  onRegister: () => void
}

export const RegisterView: React.FC<Props> = ({ onRegister }) => {
  const [showPassword, setShowPassword] = React.useState(false)
  const [state, updateState] = useMultiState({
    busy: false,
    message: '',
  })
  const [form, updateForm] = useMultiState({
    email: '',
    password: '',
  })

  return (
    <div className={stylesRoot}>
      <h1>ownfolio</h1>
      <Card className={stylesCard}>
        <Form
          onSubmit={async event => {
            event.preventDefault()
            try {
              updateState({ busy: true, message: '' })
              await rpcClient.register({
                email: form.email,
                password: form.password,
                rememberMe: true,
              })
              onRegister()
            } catch (err) {
              updateState({ busy: false, message: parseError(err).description || 'Unknown error' })
            }
          }}
        >
          <h2>Sign up for a new account</h2>
          {state.message && <Message kind="warning">{state.message}</Message>}
          <Label text="Your email" htmlFor="email">
            <Input
              type="email"
              name="email"
              id="email"
              placeholder="name@company.com"
              required
              readOnly={state.busy}
              value={form.email}
              onChange={event => updateForm({ email: event.target.value })}
              autoFocus
            />
          </Label>
          <Label
            text="Password"
            htmlFor="password"
            addition={
              form.password ? (
                <a
                  href="#"
                  tabIndex={-1}
                  onClick={event => {
                    event.preventDefault()
                    setShowPassword(showPassword => !showPassword)
                  }}
                >
                  {!showPassword ? 'Show' : 'Hide'}
                </a>
              ) : undefined
            }
          >
            <Input
              type={!showPassword ? 'password' : 'text'}
              name="password"
              id="password"
              placeholder="••••••••"
              minLength={8}
              required
              readOnly={state.busy}
              value={form.password}
              onChange={event => updateForm({ password: event.target.value })}
            />
          </Label>
          <Label
            text="I accept that this is an alpha version and that I use this application at my own risk."
            htmlFor="accept"
            position="right"
          >
            <Input id="accept" type="checkbox" readOnly={state.busy} required />
          </Label>
          <Button type="submit" variant="primary" disabled={state.busy}>
            Sign up
          </Button>
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </Form>
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
  max-width: 525px;
  width: 100%;
  margin: var(--spacing-large);
  padding: var(--spacing-large);
  box-sizing: border-box;
`
