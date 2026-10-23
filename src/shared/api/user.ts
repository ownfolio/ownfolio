import { createRpcCallDefinition } from '@ownfolio/rpc-core'
import { z } from 'zod'

import { userSchema } from '../models/User'
import { fileSchema } from '../utils/file'
import { responseSchema } from '../utils/schemas'

export const rpcV1UserDefinition = {
  register: createRpcCallDefinition(
    z.object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(8).max(128),
      rememberMe: z.boolean().default(false),
    }),
    responseSchema(userSchema)
  ),
  login: createRpcCallDefinition(
    z.object({
      email: z.string().toLowerCase().trim(),
      password: z.string(),
      rememberMe: z.boolean().default(false),
    }),
    responseSchema(userSchema)
  ),
  logout: createRpcCallDefinition(z.void(), responseSchema(z.void())),
  me: createRpcCallDefinition(z.void(), responseSchema(userSchema)),
  changeEmail: createRpcCallDefinition(
    z.object({ newEmail: z.string().trim().toLowerCase().email().describe('New email address to log in with') }),
    responseSchema(userSchema)
  ),
  changePassword: createRpcCallDefinition(
    z.object({
      oldPassword: z.string().describe('Current password, required for verification'),
      newPassword: z.string().min(8).max(128).describe('New password, 8 to 128 characters'),
    }),
    responseSchema(z.void())
  ),
  exportUserTransactionsAsCsv: createRpcCallDefinition(z.void(), responseSchema(fileSchema)),
  importUserTransactionsFromCsv: createRpcCallDefinition(fileSchema, responseSchema(z.void())),
}
