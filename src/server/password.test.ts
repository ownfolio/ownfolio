import { expect, it } from 'vitest'

import { hashPassword, verifyPassword } from './password'

it('hashPassword/verifyPassword', async () => {
  async function testPassword(password: string) {
    const hash = await hashPassword(password)
    await expect(verifyPassword(hash, password)).resolves.toBe(true)
    await expect(verifyPassword(hash, password + '-wrong')).resolves.toBe(false)
  }

  await testPassword('')
  await testPassword('a')
  await testPassword('ab')
  await testPassword('abc')

  await expect(verifyPassword('other', '')).rejects.toThrowError('Unsupported hash format')
  await expect(verifyPassword('pbkdf2', '')).rejects.toThrowError('Unsupported hash format')
  await expect(verifyPassword('pbkdf2:sha512', '')).rejects.toThrowError('Unsupported hash format')
  await expect(verifyPassword('pbkdf2:sha512:1', '')).rejects.toThrowError('Unsupported hash format')
  await expect(verifyPassword('pbkdf2:sha512:1:a', '')).rejects.toThrowError('Unsupported hash format')
  await expect(verifyPassword('pbkdf2:sha512:a:2', '')).rejects.toThrowError('Unsupported hash format')
  await expect(verifyPassword('pbkdf2:sha512:1:2::', '')).resolves.toBe(false)
})
