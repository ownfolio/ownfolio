import { css } from '@linaria/core'
import React from 'react'

import { Card } from './Card'
import { Loading } from './Loading'

interface Props {
  children: React.ReactNode
}

export const LoadingCardSuspense: React.FC<Props> = ({ children }) => {
  return (
    <React.Suspense
      fallback={
        <Card className={styles}>
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
