import { css } from '@linaria/core'
import React from 'react'

import { Attachment } from '../../../shared/models/Attachment'
import { fileDownload } from '../../../shared/utils/file'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps, DialogOpts } from '../../components/DialogsContext'
import { PdfPreview } from '../../components/PdfPreview'
import { LoadingView } from '../loading/LoadingView'

interface Props extends DialogContentProps<void> {
  attachmentId: string
}

export const AttachmentDialog: React.FC<Props> & DialogOpts = ({ attachmentId, closeDialog }) => {
  const [attachment, setAttachment] = React.useState<Attachment | undefined>(undefined)

  React.useEffect(() => {
    rpcClient
      .retrieveAttachment({ id: attachmentId })
      .then(setAttachment)
      .catch(err => {
        closeDialog(undefined)
        Promise.reject(err)
      })
  }, [])
  if (!attachment) {
    return <LoadingView />
  }

  return (
    <div className={stylesRoot}>
      <PdfPreview attachmentId={attachmentId} />
      <Button
        variant="primary"
        onClick={async () => {
          const download = await rpcClient.downloadAttachment({ id: attachment.id })
          await fileDownload(download)
        }}
      >
        Download
      </Button>
      <Button onClick={() => closeDialog(undefined)}>Close</Button>
    </div>
  )
}

const stylesRoot = css`
  width: min(
    1600px,
    calc(
      100vw - max(calc(var(--spacing-large) * 2), calc(var(--safe-area-inset-left) + var(--safe-area-inset-right))) * 2
    )
  );
  height: min(
    1000px,
    calc(
      100vh - max(calc(var(--spacing-large) * 2), calc(var(--safe-area-inset-top) + var(--safe-area-inset-bottom))) * 2
    )
  );
  display: grid;
  grid-gap: var(--spacing-large);
  grid-template-rows: 1fr auto;
`
