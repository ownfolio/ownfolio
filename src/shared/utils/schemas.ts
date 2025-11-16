import BigNumber from 'bignumber.js'
import { z } from 'zod'

export const byIdSchema = z.object({ id: z.string() })

export const pagingParamsSchema = z.object({
  skip: z.number().int().min(0).optional(),
  top: z.number().int().min(1).optional(),
})

export function responseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  })
}

export function listResponseSchema<T extends z.ZodTypeAny>(elementSchema: T) {
  return responseSchema(z.array(elementSchema))
}

export function responseSchemaWithIncluded<T extends z.ZodTypeAny, I extends z.ZodTypeAny>(
  dataSchema: T,
  includedSchema: I
) {
  return z.object({
    data: dataSchema,
    included: includedSchema,
  })
}

export const dateStringSchema = z.string().regex(/^(\d{4}-\d{2}-\d{2})$/)

export const timeStringSchema = z.string().regex(/^(\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?)$/)

export const bigNumberSchema = z.codec(
  z.coerce.string(),
  z.custom<BigNumber>(raw => BigNumber.isBigNumber(raw)),
  {
    decode: str => BigNumber(str),
    encode: bn => bn.toString(),
  }
)
