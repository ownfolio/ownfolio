import { css } from '@linaria/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import React from 'react'
import { FaDeleteLeft, FaMagnifyingGlass } from 'react-icons/fa6'

import { Attachment } from '../../../shared/models/Attachment'
import {
  createEmptyTransaction,
  createEmptyTransactionData,
  generateTransactionReference,
  Transaction,
  TransactionType,
} from '../../../shared/models/Transaction'
import { sleep } from '../../../shared/utils/promise'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps, DialogOpts, useDialogs } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { IconLink } from '../../components/IconLink'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { Menu } from '../../components/Menu'
import { PdfPreview } from '../../components/PdfPreview'
import { SelectTransactionType } from '../../components/SelectTransactionType'
import { Textarea } from '../../components/Textarea'
import { useAttachmentUpload } from '../../hooks/useAttachmentUpload'
import { AttachmentSelectionDialog } from '../attachments/AttachmentSelectionDialog'
import { LoadingView } from '../loading/LoadingView'
import { TransactionDataFields } from './TransactionDataFields'

type Mode =
  | {
      type: 'create'
      transactionTemplate?: Partial<Omit<Transaction, 'id' | 'createdAt'>>
      pendingAttachments?: Attachment[]
    }
  | { type: 'edit'; transactionId: string }

interface Props extends DialogContentProps<Transaction> {
  mode: Mode
  bulk?: {
    current: number
    total: number
  }
  next?: boolean
}

export const TransactionDialog: React.FC<Props> & DialogOpts = ({
  mode,
  bulk,
  next: initialNext = false,
  dialogId,
  closeDialog,
}) => {
  const { openDialog } = useDialogs()
  const queryClient = useQueryClient()
  const [transaction, setTransaction] = React.useState<Transaction | undefined>(undefined)
  const attachments = useQuery(['transactions', transaction?.id, 'attachments'], () => {
    return transaction?.id ? rpcClient.listAttachments({ transactionId: transaction?.id }).then(r => r.data) : []
  }).data!
  const [next, setNext] = React.useState(initialNext)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)
  const [unlinkedAttachments, setUnlinkedAttachments] = React.useState<string[]>([])
  const [pendingAttachments, setPendingAttachments] = React.useState<Attachment[]>(
    mode.type === 'create' ? mode.pendingAttachments || [] : []
  )
  const [attachmentUploadElement, _busyWithAttachmentUpload, triggerAttachmentUpload] = useAttachmentUpload(
    attachments => {
      if (attachments.length > 0) {
        setPendingAttachments(as => [...attachments, ...as])
        setPreviewedAttachment(attachments[0])
      }
    },
    'application/pdf'
  )
  const [previewedAttachment, setPreviewedAttachment] = React.useState<Attachment | undefined>(
    mode.type === 'create' && mode.pendingAttachments && mode.pendingAttachments.length > 0
      ? mode.pendingAttachments[0]
      : undefined
  )
  React.useEffect(() => {
    const run = async () => {
      try {
        if (mode.type === 'create') {
          setTransaction({
            ...createEmptyTransaction(),
            data: {} as any,
            ...mode.transactionTemplate,
          })
        } else {
          const transaction = await rpcClient.retrieveTransaction({ id: mode.transactionId }).then(r => r.data)
          setTransaction(transaction)
        }
      } catch (err) {
        closeDialog(undefined)
        throw err
      }
    }
    run()
  }, [])
  if (!transaction) {
    return <LoadingView />
  }

  return (
    <Form
      className={clsx(stylesRoot, previewedAttachment && stylesRootWithAttachmentPreview)}
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          const tx =
            mode.type === 'create'
              ? await rpcClient.createTransaction(transaction).then(r => r.data)
              : await rpcClient.updateTransaction(transaction).then(r => r.data)
          await Promise.all(
            pendingAttachments
              .filter(a => !unlinkedAttachments.includes(a.id))
              .map(a => rpcClient.linkAttachmentToTransaction({ id: a.id, transactionId: tx.id }))
          )
          setPendingAttachments([])
          await Promise.all(
            unlinkedAttachments.map(aid => rpcClient.unlinkAttachmentFromTransaction({ id: aid, transactionId: tx.id }))
          )
          setUnlinkedAttachments([])
          await queryClient.invalidateQueries()
          closeDialog(undefined)
          if (next) {
            await sleep(250)
            await openDialog(TransactionDialog, {
              mode: {
                type: 'create',
                transactionTemplate: {
                  date: tx.date,
                  time: tx.time,
                  data: tx.data,
                  reference: tx.reference,
                  comment: tx.comment,
                },
              },
            })
          }
        } finally {
          setState(undefined)
        }
      }}
    >
      <div className={stylesRowSplit}>
        <Label text="Date/Time" htmlFor="dateTime">
          <Input
            id="dateTime"
            type="datetime-local"
            value={transaction.date + 'T' + transaction.time}
            onChange={event => {
              const [, date, time] = event.target.value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/)!
              setTransaction(transaction => ({ ...transaction!, date, time }))
            }}
            autoFocus
            required
          />
        </Label>
        <Label text="Type" htmlFor="type">
          <SelectTransactionType
            id="type"
            value={transaction.data.type}
            onChange={event => {
              setTransaction(transaction => ({
                ...transaction!,
                data: createEmptyTransactionData(event.target.value as TransactionType, transaction?.data),
              }))
            }}
            required
          />
        </Label>
      </div>
      <div className={stylesRow}>
        {!!transaction.data.type && (
          <TransactionDataFields
            transaction={transaction}
            data={transaction.data}
            setData={data => setTransaction({ ...transaction, data })}
          />
        )}
      </div>
      <div className={stylesRow}>
        <Label
          text="Reference"
          htmlFor="reference"
          addition={
            <a
              href="#"
              tabIndex={-1}
              onClick={event => {
                event.preventDefault()
                setTransaction(transaction => ({ ...transaction!, reference: generateTransactionReference() }))
              }}
            >
              (generate)
            </a>
          }
        >
          <Input
            id="reference"
            type="text"
            value={transaction.reference}
            onChange={event => setTransaction(transaction => ({ ...transaction!, reference: event.target.value }))}
          />
        </Label>
      </div>
      <div className={stylesRow}>
        <Label text="Comment" htmlFor="comment">
          <Textarea
            id="comment"
            value={transaction.comment}
            onChange={event => setTransaction(transaction => ({ ...transaction!, comment: event.target.value }))}
          />
        </Label>
      </div>
      <div className={clsx(stylesRow, stylesAttachmentsRow)}>
        {[...pendingAttachments, ...attachments]
          .filter(a => !unlinkedAttachments.includes(a.id))
          .map(attachment => (
            <div key={attachment.id} className={stylesAttachment}>
              <div className={stylesAttachmentName}>{attachment.fileName}</div>
              <IconLink
                icon={FaMagnifyingGlass}
                href="#"
                onClick={event => {
                  event.preventDefault()
                  setPreviewedAttachment(a => (a?.id != attachment.id ? attachment : undefined))
                }}
              />
              <IconLink
                icon={FaDeleteLeft}
                href="#"
                onClick={event => {
                  event.preventDefault()
                  setPreviewedAttachment(a => (a?.id != attachment.id ? a : undefined))
                  setUnlinkedAttachments(as => [...as, attachment.id])
                }}
              />
            </div>
          ))}
        {attachmentUploadElement}
        <Menu
          items={[
            {
              label: `Upload new`,
              onClick: async () => {
                await triggerAttachmentUpload()
              },
            },
            {
              label: `Link existing`,
              onClick: async () => {
                const attachment = await openDialog(AttachmentSelectionDialog, {}, dialogId)
                if (attachment) {
                  if (unlinkedAttachments.find(aid => aid === attachment.id)) {
                    setUnlinkedAttachments(aids => aids.filter(aid => aid !== attachment.id))
                  } else if (
                    !attachments.find(a => a.id === attachment.id) &&
                    !pendingAttachments.find(a => a.id === attachment.id)
                  ) {
                    setPendingAttachments(as => [attachment, ...as])
                    setPreviewedAttachment(attachment)
                  }
                }
              },
            },
          ]}
        >
          <a href="#">Add attachment...</a>
        </Menu>
      </div>
      {previewedAttachment && <PdfPreview attachmentId={previewedAttachment.id} className={stylesAttachmentPreview} />}
      <div className={stylesRow}>
        {!bulk && mode.type === 'create' && (
          <Label text="Create another transaction" htmlFor="next" position="right">
            <Input id="next" type="checkbox" checked={next} onChange={event => setNext(event.target.checked)} />
          </Label>
        )}
      </div>
      <div className={stylesRowSplit}>
        <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
          {bulk && bulk.total > 1 ? `Save ${bulk.current} / ${bulk.total}` : 'Save'}
        </Button>
        <Button type="reset" onClick={() => closeDialog(undefined)}>
          Cancel
        </Button>
      </div>
    </Form>
  )
}

TransactionDialog.requireExplicitClose = true

const stylesRoot = css`
  display: grid;
  width: calc(
    100vw -
      (
        var(--spacing-large) * 2 + max(var(--spacing-large), var(--safe-area-inset-left)) +
          max(var(--spacing-large), var(--safe-area-inset-right))
      )
  );
  max-width: 500px;
  grid-template-columns: 1fr;
`

const stylesRootWithAttachmentPreview = css`
  max-width: 1600px;
  grid-template-columns: 1fr 800px;
  @media (max-width: 1500px) {
    grid-template-columns: 1fr 700px;
  }
  @media (max-width: 1300px) {
    grid-template-columns: 1fr 600px;
  }
  @media (max-width: 1200px) {
    grid-template-columns: 1fr 500px;
  }
  @media (max-width: 1100px) {
    grid-template-columns: 1fr 400px;
  }
  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`

const stylesRow = css`
  grid-column: 1;
  display: grid;
  grid-gap: var(--spacing-medium);
`

const stylesRowSplit = css`
  grid-column: 1;
  display: grid;
  grid-gap: var(--spacing-medium);
  grid-template-columns: 1fr 1fr;
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`

const stylesAttachmentsRow = css`
  display: grid;
  grid-gap: var(--spacing-small);
`

const stylesAttachment = css`
  display: flex;
  gap: var(--spacing-small);
  align-items: center;
  overflow: hidden;
`

const stylesAttachmentName = css`
  text-wrap: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const stylesAttachmentPreview = css`
  grid-column: 2;
  grid-row: 1 / span 7;
  min-height: 300px;

  @media (max-width: 1000px) {
    grid-column: 1;
    grid-row: auto;
  }
`
