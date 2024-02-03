import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type Props = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

export const BottomBar = React.forwardRef<HTMLDivElement, Props>(({ className, ...other }, ref) => (
  <div ref={ref} {...other} className={clsx(stylesRoot, className)}></div>
))

const stylesRoot = css`
  background-color: var(--color-neutral-lite);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.125);
  border-top: 1px solid var(--color-neutral-dark);
  padding: var(--spacing-medium);
  padding-bottom: max(var(--spacing-medium), var(--safe-area-inset-bottom));
  padding-left: max(var(--spacing-medium), var(--safe-area-inset-left));
  padding-right: max(var(--spacing-medium), var(--safe-area-inset-right));
`
