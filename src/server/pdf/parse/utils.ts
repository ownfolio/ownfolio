import BigNumber from 'bignumber.js'

import { formatInt } from '../../../shared/utils/string'

export function parseGermanBigNumber(str: string): BigNumber {
  const n = BigNumber(str.replace(/\./g, '').replace(/,/g, '.'))
  if (!n.isFinite()) {
    throw new Error(`Unable to parse ${str} to number`)
  }
  return n
}

export function parseGermanDate(str: string): string {
  const segments = str.split(/\./)
  if (segments.length !== 3) {
    throw new Error(`Unable to parse ${str} to date`)
  }
  return [
    formatInt(Number.parseInt(segments[2], 10), 4),
    formatInt(Number.parseInt(segments[1], 10), 2),
    formatInt(Number.parseInt(segments[0], 10), 2),
  ].join('-')
}
