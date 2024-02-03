import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type LabelPosition = 'above' | 'right'

type Props = React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement> & {
  text: string
  addition?: React.ReactNode
  position?: LabelPosition
  htmlFor: string
}

export const Label = React.forwardRef<HTMLLabelElement, Props>(
  ({ text, position = 'above', addition, className, children, ...other }, ref) => {
    return (
      <div className={clsx(stylesRoot, position === 'right' && stylesRootPositionRight, className)}>
        <label className={clsx(stylesLabel, position === 'right' && stylesLabelPositionRight)} ref={ref} {...other}>
          {text}
        </label>
        {addition && (
          <div className={clsx(stylesAddition, position === 'right' && stylesAdditionRight)}>{addition}</div>
        )}
        <div className={clsx(stylesChildren, position === 'right' && stylesChildrenRight)}>{children}</div>
      </div>
    )
  }
)

const stylesRoot = css`
  display: grid;
  gap: var(--spacing-small);
  grid-template-columns: auto 1fr auto;
`

const stylesRootPositionRight = css`
  grid-template-columns: auto 1fr;
  align-items: center;
`

const stylesLabel = css`
  grid-row: 1;
  grid-column: 1 / span 2;
`

const stylesLabelPositionRight = css`
  grid-column: 2;
`

const stylesAddition = css`
  grid-row: 1;
  grid-column: 3;
`

const stylesAdditionRight = css`
  grid-row: 2;
  grid-column: 2;
`

const stylesChildren = css`
  grid-row: 2;
  grid-column: 1 / span 3;
`

const stylesChildrenRight = css`
  grid-row: 1;
  grid-column: 1;
`
