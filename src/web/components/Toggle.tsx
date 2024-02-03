import { Switch } from '@headlessui/react'
import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type Props = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  checked: boolean
  onChangeChecked: (value: boolean) => void
  readOnly?: boolean
}

export const Toggle = React.forwardRef<HTMLButtonElement, Props>(
  ({ type, className, checked, onChangeChecked, readOnly, name, ...other }, ref) => {
    return (
      <Switch checked={checked} onChange={onChangeChecked} name={name} as={React.Fragment}>
        {({ checked }) => (
          <button ref={ref} {...other} className={stylesRoot} disabled={readOnly}>
            <span className={clsx(stylesBall, checked ? stylesBallChecked : stylesBallUnchecked)} />
          </button>
        )}
      </Switch>
    )
  }
)

const stylesRoot = css`
  background-color: var(--color-neutral-lite);
  border: 1px solid var(--color-neutral-darker);
  height: 20px;
  width: 40px;
  border-radius: 10px;
  position: relative;
  cursor: pointer;

  &:hover,
  &:focus {
    outline: 2px solid var(--color-neutral-dark);
  }
`

const stylesBall = css`
  display: block;
  width: 14px;
  height: 14px;
  position: absolute;
  top: 2px;
  transition: left 0.25s ease;
  border-radius: 100%;
`

const stylesBallUnchecked = css`
  left: 2px;
  background-color: var(--color-neutral-dark);
`

const stylesBallChecked = css`
  left: 22px;
  background-color: var(--color-primary);
`
