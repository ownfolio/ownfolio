import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { fileAsDataUrl, fileDownload } from '../../../shared/utils/file'
import { sleep } from '../../../shared/utils/promise'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { Message } from '../../components/Message'
import { parseError } from '../../error'
import { useMultiState } from '../../hooks/useMultiState'

export const UserDialog: React.FC<DialogContentProps<void>> = ({ closeDialog }) => {
  const { data: me } = useSuspenseQuery({
    queryKey: ['me'],
    queryFn: () => rpcClient.me().then(r => r.data),
  })
  return (
    <div className={stylesRoot}>
      <EmailForm email={me.email} />
      <PasswordForm />
      <ImportExportSection />
      <ReportSection closeDialog={closeDialog} />
    </div>
  )
}

const EmailForm: React.FC<{ email: string }> = ({ email }) => {
  const queryClient = useQueryClient()
  const [state, updateState] = useMultiState({
    busy: false,
    message: undefined as { text: string; kind: React.ComponentProps<typeof Message>['kind'] } | undefined,
  })
  const [form, updateForm] = useMultiState({
    email,
  })
  const pristine = form.email === email

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        updateState({ busy: true })
        try {
          await rpcClient.changeEmail({ newEmail: form.email })
          await queryClient.invalidateQueries()
          updateState({ message: { text: 'Email has been changed', kind: 'info' } })
        } catch (err) {
          updateState({ message: { text: parseError(err).title, kind: 'warning' } })
        } finally {
          updateState({ busy: false })
        }
      }}
    >
      {state.message && <Message kind={state.message.kind}>{state.message.text}</Message>}
      <Label text="Email" htmlFor="email">
        <Input
          type="email"
          name="email"
          id="email"
          placeholder="name@company.com"
          required
          value={form.email}
          onChange={event => {
            updateForm({ email: event.target.value })
            updateState({ message: undefined })
          }}
          autoFocus
        />
      </Label>
      <Button type="submit" variant={!pristine ? 'primary' : undefined} disabled={pristine || state.busy}>
        Change email
      </Button>
    </Form>
  )
}

const PasswordForm: React.FC = () => {
  const queryClient = useQueryClient()
  const [state, updateState] = useMultiState({
    busy: false,
    message: undefined as { text: string; kind: React.ComponentProps<typeof Message>['kind'] } | undefined,
  })
  const [form, updateForm] = useMultiState({
    oldPassword: '',
    newPassword: '',
  })
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const pristine = !form.oldPassword && !form.newPassword

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        updateState({ busy: true })
        try {
          await rpcClient.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
          updateForm({ oldPassword: '', newPassword: '' })
          await queryClient.invalidateQueries()
          updateState({ message: { text: 'Password has been changed', kind: 'info' } })
        } catch (err) {
          updateState({ message: { text: parseError(err).title, kind: 'warning' } })
        } finally {
          updateState({ busy: false })
        }
      }}
    >
      {state.message && <Message kind={state.message.kind}>{state.message.text}</Message>}
      <Label text="Old password" htmlFor="oldPassword">
        <Input
          type="password"
          name="oldPassword"
          id="oldPassword"
          placeholder="••••••••"
          minLength={8}
          required
          value={form.oldPassword}
          onChange={event => {
            updateForm({ oldPassword: event.target.value })
            updateState({ message: undefined })
          }}
        />
      </Label>
      <Label
        text="New password"
        htmlFor="newPassword"
        addition={
          form.newPassword ? (
            <a
              href="#"
              tabIndex={-1}
              onClick={event => {
                event.preventDefault()
                setShowNewPassword(showOldPassword => !showOldPassword)
              }}
            >
              {!showNewPassword ? 'Show' : 'Hide'}
            </a>
          ) : undefined
        }
      >
        <Input
          type={!showNewPassword ? 'password' : 'text'}
          name="newPassword"
          id="newPassword"
          placeholder="••••••••"
          minLength={8}
          required
          value={form.newPassword}
          onChange={event => {
            updateForm({ newPassword: event.target.value })
            updateState({ message: undefined })
          }}
        />
      </Label>
      <Button type="submit" variant={!pristine ? 'primary' : undefined} disabled={pristine || state.busy}>
        Change password
      </Button>
    </Form>
  )
}

const ImportExportSection: React.FC = () => {
  const queryClient = useQueryClient()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  return (
    <div className={stylesSection}>
      <Button
        type="button"
        onClick={async () => {
          const download = await rpcClient.exportUserTransactionsAsCsv().then(r => r.data)
          await fileDownload(download)
        }}
      >
        Export all transactions as CSV
      </Button>

      <Button type="button" busy={state === 'busy'} check={state === 'done'} onClick={() => inputRef.current?.click()}>
        Import transactions from CSV
        <input
          ref={inputRef}
          type="file"
          accept="text/csv"
          hidden
          onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
            try {
              setState('busy')
              const file = event.target.files?.[0]
              if (file) {
                await rpcClient.importUserTransactionsFromCsv({
                  fileName: 'transactions.csv',
                  dataUrl: await fileAsDataUrl(file),
                })
              }
              await queryClient.invalidateQueries()
              setState('done')
              await sleep(1000)
            } finally {
              if (inputRef.current) {
                inputRef.current.value = ''
              }
              setState(undefined)
            }
          }}
        />
      </Button>
    </div>
  )
}

const ReportSection: React.FC<{ closeDialog: () => void }> = () => {
  return (
    <div className={stylesSection}>
      <Button
        type="button"
        onClick={async () => {
          const download = await rpcClient.generateReport({ type: 'yearly' }).then(r => r.data)
          await fileDownload(download)
        }}
      >
        Generate yearly report
      </Button>
    </div>
  )
}

const stylesRoot = css`
  display: grid;
  grid-gap: calc(var(--spacing-large) * 2);
`

const stylesSection = css`
  display: grid;
  grid-gap: var(--spacing-small);
`
