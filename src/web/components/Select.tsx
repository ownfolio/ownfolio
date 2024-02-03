import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

type Props = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement> & {
  optionGroups: {
    id: string
    label: string
    options: {
      value: string
      label: string
    }[]
  }[]
  hiddenGroups?: string[]
  showEmptyGroups?: boolean
  emptyLabel?: string
  clearable?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, Props>(
  (
    {
      optionGroups,
      hiddenGroups = [],
      showEmptyGroups = false,
      emptyLabel = '',
      clearable = false,
      value,
      className,
      ...other
    },
    ref
  ) => {
    const initialValue = React.useMemo(() => value, [])
    const isInvalid = !!value && !optionGroups.find(og => og.options.find(o => o.value === value))
    return (
      <select ref={ref} {...other} value={value} className={clsx(stylesRoot, className)}>
        {(clearable || !value) && (
          <option value="" id="1">
            {emptyLabel}
          </option>
        )}
        {isInvalid && (
          <option value={value} id="2">
            {value}
          </option>
        )}
        {optionGroups.map(optionGroup => {
          const containsValue = optionGroup.options.find(o => o.value === value || o.value === initialValue)
          const isHidden = hiddenGroups?.includes(optionGroup.id)
          if ((!isHidden || containsValue) && (showEmptyGroups || optionGroup.options.length > 0)) {
            return (
              <optgroup key={optionGroup.id} label={optionGroup.label}>
                {optionGroup.options
                  .filter(o => !isHidden || o.value === value || o.value === initialValue)
                  .map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            )
          }
          return null
        })}
      </select>
    )
  }
)

const stylesRoot = css`
  background-color: var(--color-neutral-lite);
  border: 1px solid var(--color-neutral-darker);
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
  outline: 0;
  border-radius: var(--border-radius-small);
  color: var(--color-text);
  box-sizing: border-box;
  width: 100%;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    outline: 2px solid var(--color-neutral-dark);
  }
`
