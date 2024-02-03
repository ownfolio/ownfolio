import { Ulid } from 'id128'

export function randomId(prefix: string): string {
  return prefix + '_' + Ulid.generate().toCanonical().toLowerCase()
}
