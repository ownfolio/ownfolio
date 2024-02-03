import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type Props = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

export const Card = React.forwardRef<HTMLDivElement, Props>(({ className, children, ...other }, ref) => {
  return (
    <div ref={ref} {...other} className={clsx(stylesRoot, className)}>
      {children}
    </div>
  )
})

const stylesRoot = css`
  background-color: var(--color-neutral-lite);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.125);
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--color-neutral-dark);
`
