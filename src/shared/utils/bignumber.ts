import BigNumber from 'bignumber.js'

const roundingMode = BigNumber.ROUND_HALF_UP
const format: BigNumber.Format = {
  decimalSeparator: '.',
  groupSeparator: ',',
  groupSize: 3,
}

export type BigNumbersAsString<T> = {
  [P in keyof T]: T[P] extends BigNumber ? string : BigNumbersAsString<T[P]>
}

export function bigNumberAsStrings<T>(value: T): BigNumbersAsString<T> {
  // TODO actually convert
  return value as any
}

export function bigNumberFormat(n: BigNumber.Value, decimals: number = 0, forceSign: boolean = false): string {
  const bn = BigNumber(n)
  const bna = bn.abs()
  const bns = !forceSign ? bigNumberSignCases(bn, '', '', '-') : bigNumberSignCases(bn, '+', '', '-')
  return bns + bna.toFormat(decimals, roundingMode, format)
}

export function bigNumberFormatAbbreviated(
  n: BigNumber.Value,
  decimals: number = 0,
  forceSign: boolean = false
): string {
  const bn = BigNumber(n)
  const bna = bn.abs()
  const bns = !forceSign ? bigNumberSignCases(bn, '', '', '-') : bigNumberSignCases(bn, '+', '', '-')
  if (bna.lt(1e3)) {
    return bns + bna.toFormat(Math.min(decimals, bna.decimalPlaces() || 0), roundingMode, format)
  }
  if (bn.lt(1e6)) {
    return bn.multipliedBy(1e-3).toFormat(1) + 'k'
  }
  if (bn.lt(1e9)) {
    return bn.multipliedBy(1e-6).toFormat(1) + 'M'
  }
  if (bn.lt(1e12)) {
    return bn.multipliedBy(1e-9).toFormat(1) + 'B'
  }
  return bn.multipliedBy(1e-12).toFormat(1) + 'T'
}

export function bigNumberSignCases<T>(n: BigNumber.Value, positive: T, zero: T, negative: T): T {
  const bn = BigNumber(n)
  if (bn.gt(0)) {
    return positive
  } else if (bn.lt(0)) {
    return negative
  } else {
    return zero
  }
}
