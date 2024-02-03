import { css } from '@linaria/core'
import React from 'react'

import { Attachment } from '../../../shared/models/Attachment'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps, DialogOpts } from '../../components/DialogsContext'
import { PdfPreview } from '../../components/PdfPreview'
import { SelectAttachment } from '../../components/SelectAttachment'

interface Props extends DialogContentProps<Attachment> {}

export const AttachmentSelectionDialog: React.FC<Props> & DialogOpts = ({ closeDialog }) => {
  const [attachmentId, setAttachmentId] = React.useState<string | undefined>(undefined)
  return (
    <div className={stylesRoot}>
      <SelectAttachment value={attachmentId} onChange={event => setAttachmentId(event.target.value)} />
      {attachmentId && <PdfPreview attachmentId={attachmentId} className={stylesPreview} />}
      <Button
        variant="primary"
        onClick={async () => {
          if (attachmentId) {
            const attachment = await rpcClient.retrieveAttachment({ id: attachmentId })
            closeDialog(attachment)
          }
        }}
        disabled={!attachmentId}
      >
        Select
      </Button>
      <Button onClick={() => closeDialog(undefined)}>Cancel</Button>
    </div>
  )
}

const stylesRoot = css`
  display: grid;
  grid-gap: var(--spacing-large);
`

const stylesPreview = css`
  min-width: 50vw;
  height: 50vh;
`
