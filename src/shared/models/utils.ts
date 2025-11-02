import BigNumber from 'bignumber.js'
import { z } from 'zod'

export const dateStringSchema = z.string().regex(/^(\d{4}-\d{2}-\d{2})$/)

export const timeStringSchema = z.string().regex(/^(\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?)$/)

export const bigNumberSchema = z.string().transform(str => BigNumber(str))
