import { css } from '@linaria/core'
import React from 'react'

import { Button } from './Button'
import { DialogDescription } from './Dialog'
import { DialogContentProps } from './DialogsContext'

interface Props extends DialogContentProps<boolean> {
  question: string
  yesText?: string
  noText?: string
}

export const ConfirmationDialog: React.FC<Props> = ({ question, yesText = 'OK', noText = 'Cancel', closeDialog }) => {
  return (
    <div className={stylesRoot}>
      <DialogDescription>{question}</DialogDescription>
      <Button variant="primary" onClick={() => closeDialog(true)}>
        {yesText}
      </Button>
      <Button onClick={() => closeDialog(false)}>{noText}</Button>
    </div>
  )
}

const stylesRoot = css`
  display: grid;
  grid-gap: var(--spacing-medium);
`
