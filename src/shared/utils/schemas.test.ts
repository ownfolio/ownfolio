import BigNumber from 'bignumber.js'
import { expect, it } from 'vitest'
import { z } from 'zod'

import { bigNumberSchema } from './schemas'

it('bigNumberSchema', () => {
  const schema = z.object({ foo: bigNumberSchema })

  expect(schema.parse({ foo: '123' })).toEqual({ foo: BigNumber(123) })
  expect(schema.parse({ foo: 123 })).toEqual({ foo: BigNumber(123) })
  expect(schema.parse({ foo: BigNumber('123') })).toEqual({ foo: BigNumber(123) })

  expect(() => schema.parse({ foo: '' })).toThrow('Not a BigNumber')
  expect(() => schema.parse({ foo: 'xxx' })).toThrow('Not a BigNumber')
})
