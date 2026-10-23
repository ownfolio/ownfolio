import { z } from 'zod'

const dataUrlRegex = /^data:([^;]+);base64,(.*)$/

export const fileSchema = z
  .object({
    fileName: z.string().describe('File name including extension, e.g. "statement.pdf"'),
    dataUrl: z.string().describe('File content as base64 data URL, e.g. "data:application/pdf;base64,JVBERi0x..."'),
  })
  .describe('A file transferred inline as data URL')

export function renderDataUrl(mimeType: string, bytesBase64: string): string {
  return `data:${mimeType};base64,${bytesBase64}`
}

export function parseDataUrl(url: string): [string, string] {
  const dataUrlMatch = url.match(dataUrlRegex)
  if (!dataUrlMatch) {
    throw new Error('Invalid data URL')
  }
  const mimeType = dataUrlMatch[1]
  const bytesBase64 = dataUrlMatch[2]
  return [mimeType, bytesBase64]
}
