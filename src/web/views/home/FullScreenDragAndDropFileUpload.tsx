import { css } from '@linaria/core'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { fileUpload } from '../../../shared/utils/file'
import { sleep } from '../../../shared/utils/promise'
import { useDialogs } from '../../components/DialogsContext'
import { TransactionDialog } from '../transactions/TransactionDialog'

export const FullScreenDragAndDropFileUpload: React.FC = () => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const [dragging, setDragging] = React.useState(false)
  React.useEffect(() => {
    let resetTimeoutId = 0
    const dragover = (event: DragEvent) => {
      event.preventDefault()
      if (!dragging) {
        setDragging(true)
      }
      window.clearTimeout(resetTimeoutId)
      resetTimeoutId = window.setTimeout(() => {
        setDragging(false)
      }, 250)
    }
    const drop = async (event: DragEvent) => {
      event.preventDefault()
      const files = Array.from(event.dataTransfer?.files || [])
      await files.reduce(async (acc, file, idx) => {
        await acc
        if (!file || file.type !== 'application/pdf') {
          return
        }
        const attachment = await fileUpload(file)
        await openDialog(TransactionDialog, {
          mode: {
            type: 'create',
            transactionTemplate: {
              data: {} as any,
            },
            pendingAttachments: [attachment],
          },
          bulk: {
            current: idx + 1,
            total: files.length,
          },
        })
        await sleep(250)
      }, Promise.resolve())
      await queryClient.invalidateQueries()
    }
    document.addEventListener('dragover', dragover)
    document.addEventListener('drop', drop)
    return () => {
      document.removeEventListener('dragover', dragover)
      document.removeEventListener('drop', drop)
      window.clearTimeout(resetTimeoutId)
    }
  }, [])
  if (!dragging) {
    return null
  }
  return (
    <div className={stylesBackground}>
      <div className={stylesArea}>Upload</div>
    </div>
  )
}

const stylesBackground = css`
  position: fixed;
  z-index: 1;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
`

const stylesArea = css`
  border: 4px white dashed;
  border-radius: 6px;
  margin: var(--spacing-large);
  color: white;
  font-weight: bold;
  display: grid;
  align-items: center;
  justify-items: center;
`
