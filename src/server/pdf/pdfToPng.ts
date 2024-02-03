import { execAsync } from './utils'

export async function pdfToPng(pdf: Buffer): Promise<Buffer[]> {
  const pngs = await execAsync('convert', ['-density', '144', '-', '-quality', '100', '-alpha', 'remove', 'png:-'], pdf)
  return splitConcatenatedPngs(pngs)
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const IEND = 'IEND'

function splitConcatenatedPngs(pngs: Buffer): Buffer[] {
  const result: Buffer[] = []
  let startAt = 0
  while (startAt < pngs.length) {
    const endAt = findEndOfNextPng(pngs, startAt)
    result.push(pngs.subarray(startAt, endAt))
    startAt = endAt
  }
  return result
}

function findEndOfNextPng(pngs: Buffer, startAt: number): number {
  let i = startAt
  const signature = pngs.subarray(i, i + 8)
  if (!signature.equals(SIGNATURE)) {
    throw new Error('invalid signature')
  }
  i = i + 8
  while (i < pngs.length) {
    // read chunk header
    const length = pngs.readUInt32BE(i)
    i = i + 4
    const type = pngs.subarray(i, i + 4).toString('ascii')
    i = i + 4
    i = i + length
    i = i + 4
    if (type === IEND) {
      return i
    }
  }
  throw new Error('unexpected end of file')
}
