import crypto from 'crypto'

export function randomToken(prefix: string): string {
  return prefix + '_' + crypto.randomBytes(32).toString('hex')
}

// only hashes of tokens are stored, so a database leak does not leak usable tokens
export function hashToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}
