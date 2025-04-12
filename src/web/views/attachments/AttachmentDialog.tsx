import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'
import { FaDeleteLeft, FaMagnifyingGlass } from 'react-icons/fa6'

import { Attachment } from '../../../shared/models/Attachment'
import { renderTransactionAsString } from '../../../shared/models/Transaction'
import { fileDownload } from '../../../shared/utils/file'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps, useDialogs } from '../../components/DialogsContext'
import { IconLink } from '../../components/IconLink'
import { PdfPreview } from '../../components/PdfPreview'
import { LoadingView } from '../loading/LoadingView'
import { TransactionDialog } from '../transactions/TransactionDialog'
import { TransactionSelectionDialog } from '../transactions/TransactionSelectionDialog'

interface Props extends DialogContentProps<void> {
  attachmentId: string
}

export const AttachmentDialog: React.FC<Props> = ({ attachmentId, dialogId, closeDialog }) => {
  const { openDialog } = useDialogs()
  const queryClient = useQueryClient()
  const [attachment, setAttachment] = React.useState<Attachment | undefined>(undefined)
  const { data: accounts } = useSuspenseQuery({
    queryKey: ['accounts'],
    queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
  })
  const { data: assets } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: () => rpcClient.listAssets({}).then(r => r.data),
  })
  const { data: transactions } = useSuspenseQuery({
    queryKey: ['attachments', attachmentId, 'transactions'],
    queryFn: () => {
      return rpcClient.listTransactions({ attachmentId }).then(r => r.data)
    },
  })
  React.useEffect(() => {
    rpcClient
      .retrieveAttachment({ id: attachmentId })
      .then(r => r.data)
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
      <div className={stylesTransactionsRow}>
        {transactions.map(transaction => (
          <div key={transaction.id} className={stylesTransaction}>
            <div
              className={stylesTransactionName}
            >{`${renderTransactionAsString(transaction, accounts, assets, true)}`}</div>
            <IconLink
              icon={FaMagnifyingGlass}
              href="#"
              onClick={event => {
                event.preventDefault()
                openDialog(TransactionDialog, { mode: { type: 'edit', transactionId: transaction.id } }, dialogId)
              }}
            />
            <IconLink
              icon={FaDeleteLeft}
              href="#"
              onClick={async event => {
                event.preventDefault()
                await rpcClient.unlinkAttachmentFromTransaction({ id: attachmentId, transactionId: transaction.id })
                await queryClient.invalidateQueries()
              }}
            />
          </div>
        ))}
        <a
          href="#"
          onClick={async event => {
            event.preventDefault()
            const transaction = await openDialog(TransactionSelectionDialog, {}, dialogId)
            if (transaction) {
              await rpcClient.linkAttachmentToTransaction({ id: attachmentId, transactionId: transaction.id })
              await queryClient.invalidateQueries()
            }
          }}
        >
          Add transaction...
        </a>
      </div>
      <Button
        variant="primary"
        onClick={async () => {
          const download = await rpcClient.downloadAttachment({ id: attachment.id }).then(r => r.data)
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

const stylesTransactionsRow = css`
  display: grid;
  grid-gap: var(--spacing-small);
`

const stylesTransaction = css`
  display: flex;
  gap: var(--spacing-small);
  align-items: center;
  overflow: hidden;
`

const stylesTransactionName = css`
  text-wrap: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
