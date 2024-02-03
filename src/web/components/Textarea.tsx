import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type Props = React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(({ className, ...other }, ref) => {
  return <textarea ref={ref} {...other} className={clsx(stylesRoot, className)} />
})

const stylesRoot = css`
  display: block;
  background-color: var(--color-neutral-lite);
  border: 1px solid var(--color-neutral-darker);
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
  outline: 0;
  border-radius: var(--border-radius-small);
  color: var(--color-text);
  box-sizing: border-box;
  width: 100%;
  resize: vertical;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    outline: 2px solid var(--color-neutral-dark);
  }
`
