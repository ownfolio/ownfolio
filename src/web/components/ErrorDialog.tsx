import { css } from '@linaria/core'
import React from 'react'

import { parseError } from '../error'
import { Button } from './Button'
import { DialogDescription, DialogTitle } from './Dialog'
import { DialogContentProps } from './DialogsContext'

interface Props extends DialogContentProps<void> {
  error: unknown
}

export const ErrorDialog: React.FC<Props> = ({ error, closeDialog }) => {
  const errorProps = parseError(error)
  return (
    <div className={stylesRoot}>
      <DialogTitle>{errorProps.title}</DialogTitle>
      {errorProps.description && <DialogDescription>{errorProps.description}</DialogDescription>}
      <Button variant="primary" onClick={() => closeDialog()}>
        Close
      </Button>
    </div>
  )
}

const stylesRoot = css`
  display: grid;
  grid-gap: var(--spacing-medium);
`
