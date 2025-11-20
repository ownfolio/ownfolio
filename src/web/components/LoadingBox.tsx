import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type Props = React.HTMLProps<HTMLDivElement>

export const LoadingBox: React.FC<Props> = ({ className, ...other }) => {
  return <div {...other} className={clsx(stylesRoot, className)} />
}

const stylesRoot = css`
  min-height: 100px;
  border-radius: var(--border-radius-small);

  background-color: var(--color-neutral-dark);
  animation: changeColor 0.5s infinite alternate;
  animation-timing-function: ease-in-out;
  animation-delay: 1s;

  @keyframes changeColor {
    from {
      background-color: var(--color-neutral-dark);
    }
    to {
      background-color: var(--color-neutral-darker);
    }
  }
`
