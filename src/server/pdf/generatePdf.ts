import { execAsync } from './utils'

export async function generatePdf(document: any): Promise<Buffer> {
  const stdout = await execAsync('pdfmake-cli', [], Buffer.from(JSON.stringify(document), 'utf-8'))
  return stdout
}
