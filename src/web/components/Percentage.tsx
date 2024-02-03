import { css } from '@linaria/core'
import BigNumber from 'bignumber.js'
import clsx from 'clsx'
import React from 'react'

import { bigNumberSignCases } from '../../shared/utils/bignumber'

interface Props {
  percentage: BigNumber.Value
  decimals?: number
  signColor?: boolean
  signChar?: boolean
  signIcon?: boolean
}

export const Percentage: React.FC<Props> = ({ percentage, decimals, signColor, signChar, signIcon }) => {
  const signIconStr = signIcon ? bigNumberSignCases(percentage, '▲', '', '▼') + ' ' : ''
  const signCharStr = signChar ? bigNumberSignCases(percentage, '+', '', '-') : ''
  const percentageStr = signChar
    ? BigNumber(percentage)
        .abs()
        .toFixed(decimals || 0)
    : BigNumber(percentage).toFixed(decimals || 0)
  const percentSignStr = '%'
  return (
    <span
      className={clsx(
        stylesRoot,
        signColor && bigNumberSignCases(percentage, stylesPositive, undefined, stylesNegative)
      )}
    >
      {signIconStr + signCharStr + percentageStr + percentSignStr}
    </span>
  )
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
