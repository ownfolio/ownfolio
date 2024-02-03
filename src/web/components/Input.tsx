import { css } from '@linaria/core'
import BigNumber from 'bignumber.js'
import clsx from 'clsx'
import jsep from 'jsep'
import React from 'react'

type Props = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, Props>(({ type, className, ...other }, ref) => {
  return (
    <input
      ref={ref}
      {...other}
      type={type}
      className={clsx(
        stylesRoot,
        type !== 'checkbox' && stylesRootNotCheckbox,
        type === 'checkbox' && stylesRootCheckbox,
        className
      )}
    />
  )
})

export function calculatorInputProps(
  value: string,
  setValue: (value: string) => void
): Pick<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'value' | 'onChange' | 'onKeyDown' | 'onBlur'
> {
  return {
    value,
    onChange: event => {
      setValue(event.target.value)
    },
    onKeyDown: event => {
      if (event.key === 'Enter') {
        const evaluatedValue = calculatorRecursion(value)
        if (evaluatedValue && !evaluatedValue.eq(value)) {
          event.preventDefault()
          event.stopPropagation()
          setValue(evaluatedValue.toString())
        }
      }
    },
    onBlur: () => {
      const evaluatedValue = calculatorRecursion(value)
      if (evaluatedValue && !evaluatedValue.eq(value)) {
        setValue(evaluatedValue.toString())
      }
    },
  }
}

function calculatorRecursion(str: string): BigNumber | undefined {
  try {
    const recursion = (exp: jsep.Expression): BigNumber => {
      switch (exp.type) {
        case 'Literal': {
          const typedExp = exp as jsep.Literal
          const num = BigNumber(typedExp.raw)
          if (!num.isFinite()) {
            throw new Error(`Invalid literal ${JSON.stringify(exp)}`)
          }
          return num
        }
        case 'UnaryExpression': {
          const typedExp = exp as jsep.UnaryExpression
          switch (typedExp.operator) {
            case '-':
              return recursion(typedExp.argument).negated()
            default:
              throw new Error(`Invalid unary operator ${JSON.stringify(exp)}`)
          }
        }
        case 'BinaryExpression': {
          const typedExp = exp as jsep.BinaryExpression
          switch (typedExp.operator) {
            case '+':
              return recursion(typedExp.left).plus(recursion(typedExp.right))
            case '-':
              return recursion(typedExp.left).minus(recursion(typedExp.right))
            case '*':
              return recursion(typedExp.left).multipliedBy(recursion(typedExp.right))
            case '/':
              return recursion(typedExp.left).dividedBy(recursion(typedExp.right))
            default:
              throw new Error(`Invalid binary expression ${JSON.stringify(exp)}`)
          }
        }
        default: {
          throw new Error(`Invalid expression ${JSON.stringify(exp)}`)
        }
      }
    }
    return recursion(jsep(str))
  } catch (err) {
    return undefined
  }
}

const stylesRoot = css`
  background-color: var(--color-neutral-lite);
  border: 1px solid var(--color-neutral-darker);
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
  outline: 0;
  border-radius: var(--border-radius-small);
  color: var(--color-text);
  box-sizing: border-box;
  display: block;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    outline: 2px solid var(--color-neutral-dark);
  }

  &[type='date'],
  &[type='datetime-local'] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    min-height: calc(1.2em + var(--spacing-small) * 2);
  }
`

const stylesRootNotCheckbox = css`
  width: 100%;
`

const stylesRootCheckbox = css`
  padding: 0;
  margin: 0;
  accent-color: var(--color-primary);
  width: 20px;
  height: 20px;
  flex-shrink: 0;
`
