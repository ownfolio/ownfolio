import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

import { Loading } from '../../components/Loading'

export const LoadingView: React.FC = () => {
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => setVisible(true), 250)
    return () => clearTimeout(timeoutId)
  }, [])
  return (
    <div className={stylesRoot}>
      <Loading className={clsx(stylesLoading, visible && stylesLoadingVisible)} />
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

const stylesLoading = css`
  width: 48px;
  height: 48px;
  opacity: 0;
  transition: opacity 0.25s ease;
`

const stylesLoadingVisible = css`
  opacity: 1;
`
