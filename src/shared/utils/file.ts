import { z } from 'zod'

import { rpcClient } from '../../web/api'
import { Attachment } from '../models/Attachment'

const dataUrlRegex = /^data:([^;]+);base64,(.*)$/

export const fileSchema = z.object({
  fileName: z.string(),
  dataUrl: z.string(),
})

export function fileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = err => reject(err)
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

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

export async function fileUpload(file: File): Promise<Attachment> {
  const attachment = await rpcClient
    .uploadAttachment({
      fileName: file.name,
      dataUrl: await fileAsDataUrl(file),
    })
    .then(r => r.data)
  return attachment
}

export async function fileDownload(download: z.infer<typeof fileSchema>): Promise<void> {
  const blob = await fetch(download.dataUrl).then(res => res.blob())
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = download.fileName
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    URL.revokeObjectURL(url)
  }
}
