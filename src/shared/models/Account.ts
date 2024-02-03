import { z } from 'zod'

export const accountSchema = z.object({
  id: z.string(),
  portfolioId: z.string(),
  name: z.string().trim().min(1).max(128),
  number: z
    .string()
    .trim()
    .max(128)
    .regex(/^[0-9a-zA-Z\s]*$/)
    .transform(s => s.replace(/\s/g, ''))
    .default(''),
  currency: z
    .string()
    .trim()
    .min(1)
    .max(4)
    .toUpperCase()
    .refine(currency => currency === 'EUR', 'Only EUR is supported currently'),
  status: z.enum(['active', 'inactive', 'hidden']).default('active'),
  createdAt: z.string().datetime(),
})

export type Account = z.infer<typeof accountSchema>

export function createEmptyAccount(): Account {
  return {
    id: '',
    portfolioId: '',
    name: '',
    number: '',
    currency: '',
    status: 'active',
    createdAt: '',
  }
}
