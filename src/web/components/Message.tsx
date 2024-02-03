import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

interface Props {
  kind: 'info' | 'warning' | 'error'
  children: React.ReactNode
}

export const Message: React.FC<Props> = ({ kind, children }) => {
  return (
    <div
      className={clsx(
        stylesRoot,
        kind === 'info' && stylesInfo,
        kind === 'warning' && stylesWarning,
        kind === 'error' && stylesError
      )}
    >
      {children}
    </div>
  )
}

const stylesRoot = css`
  border: 1px solid var(--color-neutral-dark);
  background-color: var(--color-neutral);
  border-radius: var(--border-radius-small);
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
  text-align: center;
`

const stylesInfo = css`
  border-color: var(--color-info);
  background-color: var(--color-info-lite);
`

const stylesWarning = css`
  border-color: var(--color-warning);
  background-color: var(--color-warning-lite);
`

const stylesError = css`
  border-color: var(--color-error);
  background-color: var(--color-error-lite);
`
