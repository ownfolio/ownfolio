import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>

export const Form = React.forwardRef<HTMLFormElement, Props>(({ className, ...other }, ref) => {
  return <form ref={ref} {...other} className={clsx(stylesRoot, className)} />
})

const stylesRoot = css`
  display: grid;
  grid-gap: var(--spacing-medium);
`
