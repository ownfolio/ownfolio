import BigNumber from 'bignumber.js'
import { expect, it } from 'vitest'
import { z } from 'zod'

import { bigNumberSchema, isVoidResponseSchema, responseSchema } from './schemas'

it('responseSchema', () => {
  // void responses are sent as {} since JSON drops undefined values
  const voidSchema = responseSchema(z.void())
  expect(voidSchema.parse({})).toEqual({})
  expect(voidSchema.decode(JSON.parse(JSON.stringify({ data: undefined })))).toEqual({})
  expect(isVoidResponseSchema(voidSchema)).toBe(true)

  const stringSchema = responseSchema(z.string())
  expect(() => stringSchema.decode({} as any)).toThrow()
  expect(isVoidResponseSchema(stringSchema)).toBe(false)
})

it('bigNumberSchema', () => {
  const schema = z.object({ foo: bigNumberSchema })
  expect(schema.parse({ foo: '123' })).toEqual({ foo: BigNumber(123) })
  expect(schema.parse({ foo: 123 })).toEqual({ foo: BigNumber(123) })
  expect(schema.parse({ foo: BigNumber(123) })).toEqual({ foo: BigNumber(123) })
  expect(schema.decode({ foo: '123' })).toEqual({ foo: BigNumber(123) })
  expect(schema.encode({ foo: BigNumber(123) })).toEqual({ foo: '123' })
  expect(schema.parse({ foo: '' })).toEqual({ foo: BigNumber(Number.NaN) })
  expect(schema.parse({ foo: 'xxx' })).toEqual({ foo: BigNumber(Number.NaN) })
})
