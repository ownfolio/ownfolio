import { z } from 'zod'

export const quoteSchema = z.object({
  assetId: z.string(),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})$/),
  open: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .nullable()
    .default(null),
  high: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .nullable()
    .default(null),
  low: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .nullable()
    .default(null),
  close: z.string().regex(/^\d+(?:\.\d+)?$/),
})

export type Quote = z.infer<typeof quoteSchema>
