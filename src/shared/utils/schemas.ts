import BigNumber from 'bignumber.js'
import { z } from 'zod'

export const dateStringSchema = z.string().regex(/^(\d{4}-\d{2}-\d{2})$/)

export const timeStringSchema = z.string().regex(/^(\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?)$/)

export const bigNumberSchema = z.any().transform((raw, ctx) => {
  const bigNumber = BigNumber(raw)
  if (!bigNumber.isFinite()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Not a BigNumber',
    })
    return z.NEVER
  }
  return bigNumber
})
