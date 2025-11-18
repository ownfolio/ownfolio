import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

import { Card } from './Card'
import { Loading } from './Loading'

interface Props {
  className?: string
  children: React.ReactNode
}

export const LoadingCardSuspense: React.FC<Props> = ({ className, children }) => {
  return (
    <React.Suspense
      fallback={
        <Card className={clsx(styles, className)}>
          <Loading />
        </Card>
      }
    >
      {children}
    </React.Suspense>
  )
}

const styles = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
  padding: var(--spacing-medium);
  align-items: center;
  justify-content: center;
`
