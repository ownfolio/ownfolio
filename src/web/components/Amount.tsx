import { css } from '@linaria/core'
import BigNumber from 'bignumber.js'
import clsx from 'clsx'
import React from 'react'

import { bigNumberFormat, bigNumberFormatAbbreviated, bigNumberSignCases } from '../../shared/utils/bignumber'
import { usePrivacy } from '../privacy'

interface Props {
  amount: BigNumber.Value
  denomination: number
  symbol?: string
  abbreviate?: boolean
  nonPrivate?: boolean
  signColor?: boolean
  signChar?: boolean
  signIcon?: boolean
  className?: string
}

export const Amount: React.FC<Props> = ({
  amount,
  denomination,
  symbol,
  nonPrivate,
  signColor,
  signChar,
  signIcon,
  className,
}) => {
  const { privacy } = usePrivacy()
  const signIconStr = signIcon ? bigNumberSignCases(amount, '▲', '', '▼') + ' ' : ''
  const amountStr = format(BigNumber(amount), denomination, signChar || false, false)
  const amountStr2 = !(privacy && !nonPrivate) ? amountStr : '••••••••'
  const symbolStr = symbol ? ' ' + symbol : ''
  return (
    <span
      className={clsx(
        stylesRoot,
        signColor && bigNumberSignCases(amount, stylesPositive, undefined, stylesNegative),
        className
      )}
    >
      {signIconStr + amountStr2 + symbolStr}
    </span>
  )
}

function format(amount: BigNumber.Value, denomination: number, signChar: boolean, abbreviated: boolean): string {
  return abbreviated
    ? bigNumberFormatAbbreviated(amount, denomination, signChar)
    : bigNumberFormat(amount, denomination, signChar)
}

const stylesRoot = css`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  white-space: pre;
`

const stylesPositive = css`
  color: var(--color-positive);
`

const stylesNegative = css`
  color: var(--color-negative);
`
