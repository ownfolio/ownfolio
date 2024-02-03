import { execAsync } from './utils'

export async function pdfToText(pdf: Buffer): Promise<string> {
  const stdout = await execAsync('pdftotext', ['-eol', 'unix', '-raw', '-', '-'], pdf)
  return stdout.toString('utf-8').replace(/[^\x01-\xFE]/g, '') // eslint-disable-line no-control-regex
}
