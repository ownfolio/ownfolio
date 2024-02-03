import { css } from '@linaria/core'
import React from 'react'

import { Card } from '../../components/Card'
import { ViewContainer } from '../../components/ViewContainer'
import { parseError } from '../../error'

interface Props {
  title: string
  description?: string
}

export const ErrorView: React.FC<Props> = ({ title, description }) => {
  return (
    <ViewContainer className={stylesRoot}>
      <Card className={stylesCard}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        <p>
          <a href="/">Return home</a>
        </p>
      </Card>
    </ViewContainer>
  )
}

export function errorViewProps(err: unknown): Props {
  return parseError(err)
}

const stylesRoot = css`
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
