import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type Props = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

export const ViewContainer = React.forwardRef<HTMLDivElement, Props>(({ className, ...other }, ref) => (
  <div ref={ref} {...other} className={clsx(stylesRoot, className)}></div>
))

const stylesRoot = css`
  padding: var(--spacing-large);
  padding-bottom: max(var(--spacing-large), var(--safe-area-inset-bottom));
  padding-left: max(var(--spacing-large), var(--safe-area-inset-left));
  padding-right: max(var(--spacing-large), var(--safe-area-inset-right));
  display: flex;
  flex-direction: column;
  gap: var(--spacing-large);
  overflow-x: hidden;
  overflow-y: auto;
`
