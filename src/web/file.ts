import { z } from 'zod'

import { Attachment } from '../shared/models/Attachment'
import { fileSchema } from '../shared/utils/file'
import { rpcClient } from './api'

export function fileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = err => reject(err)
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
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
