import React from 'react'

import { Attachment } from '../../shared/models/Attachment'
import { fileUpload } from '../../shared/utils/file'

export function useAttachmentUpload(
  onAttachmentUploaded: (attachments: Attachment[]) => void,
  accept?: string
): [React.JSX.Element, boolean, () => void] {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const trigger = React.useCallback(() => {
    if (!inputRef.current) {
      throw new Error('input element is missing')
    }
    inputRef.current.click()
  }, [])
  const element = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple
      hidden
      onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
          setBusy(true)
          const files = Array.from(event.target.files || [])
          if (files.length > 0) {
            const attachments = await files.reduce<Promise<Attachment[]>>(async (accP, file) => {
              const acc = await accP
              if (file) {
                const attachment = await fileUpload(file)
                return [...acc, attachment]
              } else {
                return acc
              }
            }, Promise.resolve([]))
            onAttachmentUploaded(attachments)
          }
        } finally {
          if (inputRef.current) {
            inputRef.current.value = ''
          }
          setBusy(false)
        }
      }}
    />
  )

  return [element, busy, trigger]
}
