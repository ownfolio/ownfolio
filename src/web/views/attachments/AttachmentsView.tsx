import { css } from '@linaria/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { filterNotFalse } from '../../../shared/utils/array'
import { fileDownload } from '../../../shared/utils/file'
import { formatSize } from '../../../shared/utils/string'
import { rpcClient } from '../../api'
import { CardTable, TableDefinitionColumn, TableDefinitionRow } from '../../components/CardTable'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { ViewContainer } from '../../components/ViewContainer'
import { AttachmentDialog } from './AttachmentDialog'

export const AttachmentsView: React.FC = () => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const attachments = useQuery(['attachments'], () => rpcClient.listAttachments({})).data!

  const columns = React.useMemo<TableDefinitionColumn[]>(
    () => [
      { id: 'name', title: 'Name', minWidth: 200, className: stylesNameColumn },
      { id: 'size', title: 'Size', width: 80, align: 'right', priority: 2 },
      { id: 'links', title: 'Links', width: 80, align: 'right', priority: 1 },
    ],
    []
  )

  const rows = React.useMemo<TableDefinitionRow[]>(
    () =>
      attachments.map(attachment => {
        return {
          id: attachment.id,
          columns: {
            name: attachment.fileName,
            size: formatSize(attachment.size),
            links: attachment.transactionCount.toString(),
          },
          menuItems: filterNotFalse([
            {
              label: 'View',
              onClick: async () => {
                await openDialog(AttachmentDialog, { attachmentId: attachment.id })
              },
            },
            {
              label: 'Download',
              onClick: async () => {
                const download = await rpcClient.downloadAttachment({ id: attachment.id })
                await fileDownload(download)
              },
            },
            null,
            {
              label: 'Delete',
              onClick: async () => {
                const result = await openDialog(ConfirmationDialog, {
                  question: `Sure that you want to delete the attachment ${attachment.fileName}? This cannot be undone.`,
                  yesText: `Yes, delete ${attachment.fileName}!`,
                })
                if (result) {
                  await rpcClient.deleteAttachment({ id: attachment.id })
                  await queryClient.invalidateQueries()
                }
              },
            },
          ]),
        }
      }),
    [attachments]
  )

  return (
    <ViewContainer>
      <CardTable columns={columns} rows={rows} />
    </ViewContainer>
  )
}

const stylesNameColumn = css`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`
