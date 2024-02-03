import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'
import { FaCheck } from 'react-icons/fa6'

import { Loading } from './Loading'

interface Props extends React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
  busy?: boolean
  check?: boolean
  variant?: 'primary' | 'secondary'
  block?: boolean
  onClick?: () => void | Promise<void>
}

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ busy, check, variant, block, onClick, className, disabled, children, ...other }, ref) => {
    const [busyWithOnClick, setBusyWithOnClick] = React.useState(false)
    const onClick2 = React.useMemo(() => {
      if (!onClick) {
        return undefined
      }
      return async () => {
        try {
          const result = onClick()
          if (result instanceof Promise) {
            setBusyWithOnClick(true)
            await result
          }
        } finally {
          setBusyWithOnClick(false)
        }
      }
    }, [onClick])
    const busy2 = busy || busyWithOnClick
    return (
      <button
        ref={ref}
        {...other}
        onClick={onClick2}
        disabled={disabled || busy2}
        className={clsx(
          stylesRoot,
          variant === 'primary' && stylesRootPrimary,
          variant === 'secondary' && stylesRootSecondary,
          block && stylesRootBlock,
          className
        )}
      >
        <span className={stylesContent} aria-hidden>
          {busy2 && <Loading className={stylesLoading} />}
          {!busy2 && check && <FaCheck className={stylesCheck} />}
        </span>
        <span className={stylesContent}>{children}</span>
        <span className={stylesContent} aria-hidden></span>
      </button>
    )
  }
)

const stylesRoot = css`
  border: 0;
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
  outline: 0;
  border-radius: var(--border-radius-small);
  cursor: pointer;
  display: inline-grid;
  grid-template-columns: 16px 1fr 16px;
  grid-gap: var(--spacing-small);
  align-items: center;
  justify-items: center;
  &:disabled {
    outline: 0;
    opacity: 0.75;
  }

  color: var(--color-text-on-neutral);
  background-color: var(--color-neutral);
  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    outline: 2px solid var(--color-neutral-dark);
  }
`

const stylesRootBlock = css`
  width: 100%;
`

const stylesRootPrimary = css`
  color: var(--color-text-on-primary);
  background-color: var(--color-primary);
  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    outline: 2px solid var(--color-primary-dark);
  }
`

const stylesRootSecondary = css`
  color: var(--color-text-on-secondary);
  background-color: var(--color-secondary);
  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    outline: 2px solid var(--color-secondary-lite);
  }
`

const stylesContent = css`
  display: inline-block;
  min-height: 16px;
`

const stylesLoading = css`
  width: 16px;
  height: 16px;
  display: block;
`

const stylesCheck = css`
  width: 16px;
  height: 16px;
  display: block;
`
