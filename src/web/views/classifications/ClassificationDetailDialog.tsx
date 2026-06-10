import { css } from '@linaria/core'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { buildBucketTree, ClassificationBucket, ClassificationBucketTree } from '../../../shared/models/Classification'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { DialogContentProps, useDialogs } from '../../components/DialogsContext'
import { ClassificationBucketDialog } from './ClassificationBucketDialog'
import { ClassificationDialog } from './ClassificationDialog'

interface Props extends DialogContentProps<void> {
  classificationId: string
}

export const ClassificationDetailDialog: React.FC<Props> = ({ classificationId, dialogId, closeDialog }) => {
  const queryClient = useQueryClient()
  const { openDialog } = useDialogs()
  const [selectedBucketId, setSelectedBucketId] = React.useState<string | null>(null)

  const { data: classifications } = useSuspenseQuery({
    queryKey: ['classifications'],
    queryFn: () => rpcClient.listClassifications().then(r => r.data),
  })
  const { data: buckets } = useSuspenseQuery({
    queryKey: ['classificationBuckets', classificationId],
    queryFn: () => rpcClient.listClassificationBuckets({ classificationId }).then(r => r.data),
  })
  const { data: assignments } = useSuspenseQuery({
    queryKey: ['classificationAssignments', classificationId],
    queryFn: () => rpcClient.listClassificationAssignments({ classificationId }).then(r => r.data),
  })
  const { data: assets } = useSuspenseQuery({
    queryKey: ['assets'],
    queryFn: () => rpcClient.listAssets({}).then(r => r.data),
  })
  const { data: accounts } = useSuspenseQuery({
    queryKey: ['accounts'],
    queryFn: () => rpcClient.listAccounts({}).then(r => r.data),
  })

  const classification = classifications.find(c => c.id === classificationId)

  // Auto-close if classification was deleted from within the edit sub-dialog
  React.useEffect(() => {
    if (!classification) closeDialog(undefined)
  }, [classification])

  if (!classification) return null

  const tree = buildBucketTree(buckets)
  const selectedBucket = buckets.find(b => b.id === selectedBucketId) ?? null

  const bucketAssignments = selectedBucketId ? assignments.filter(a => a.bucketId === selectedBucketId) : []
  const assignedAssetIds = bucketAssignments.filter(a => a.entityType === 'asset').map(a => a.entityId)
  const assignedAccountIds = bucketAssignments.filter(a => a.entityType === 'account').map(a => a.entityId)

  const allAssignedAssetIds = assignments.filter(a => a.entityType === 'asset').map(a => a.entityId)
  const allAssignedAccountIds = assignments.filter(a => a.entityType === 'account').map(a => a.entityId)

  const unassignedAssets = assets.filter(a => a.status !== 'hidden' && !allAssignedAssetIds.includes(a.id))
  const unassignedAccounts = accounts.filter(a => a.status !== 'hidden' && !allAssignedAccountIds.includes(a.id))

  const handleDeleteBucket = async (bucket: ClassificationBucket) => {
    const childCount = buckets.filter(b => b.parentBucketId === bucket.id).length
    const assignmentCount = assignments.filter(a => a.bucketId === bucket.id).length
    const question =
      childCount > 0
        ? `Sure you want to delete "${bucket.name}"? It has ${childCount} child bucket(s) and all assignments will be removed.`
        : assignmentCount > 0
          ? `Sure you want to delete "${bucket.name}"? It has ${assignmentCount} assignment(s) that will be removed.`
          : `Sure you want to delete "${bucket.name}"?`
    const confirmed = await openDialog(
      ConfirmationDialog,
      { question, yesText: `Yes, delete "${bucket.name}"!` },
      dialogId
    )
    if (confirmed) {
      if (selectedBucketId === bucket.id) setSelectedBucketId(null)
      await rpcClient.deleteClassificationBucket({ id: bucket.id })
      await queryClient.invalidateQueries()
    }
  }

  const handleAssign = async (entityType: 'asset' | 'account', entityId: string) => {
    if (!selectedBucketId) return
    await rpcClient.setClassificationBucketAssignment({
      classificationId,
      entityType,
      entityId,
      bucketId: selectedBucketId,
    })
    await queryClient.invalidateQueries({ queryKey: ['classificationAssignments', classificationId] })
    await queryClient.invalidateQueries({ queryKey: ['allClassificationAssignments'] })
  }

  const handleUnassign = async (entityType: 'asset' | 'account', entityId: string) => {
    await rpcClient.setClassificationBucketAssignment({ classificationId, entityType, entityId, bucketId: null })
    await queryClient.invalidateQueries({ queryKey: ['classificationAssignments', classificationId] })
    await queryClient.invalidateQueries({ queryKey: ['allClassificationAssignments'] })
  }

  return (
    <div className={stylesRoot}>
      <div className={stylesHeader}>
        <h2 className={stylesTitle}>{classification.name}</h2>
        <div className={stylesHeaderActions}>
          <Button
            onClick={async () => {
              await openDialog(ClassificationDialog, { mode: { type: 'edit', classification } }, dialogId)
              await queryClient.invalidateQueries()
            }}
          >
            Edit
          </Button>
          <Button onClick={() => closeDialog(undefined)}>Close</Button>
        </div>
      </div>

      <div className={stylesContent}>
        <div className={stylesBucketPanel}>
          <div className={stylesPanelHeader}>
            <span className={stylesPanelTitle}>Buckets</span>
            <Button
              variant="primary"
              onClick={async () => {
                await openDialog(
                  ClassificationBucketDialog,
                  { mode: { type: 'create', classificationId, parentBucketId: null } },
                  dialogId
                )
              }}
            >
              Add bucket
            </Button>
          </div>
          {tree.length === 0 && <p className={stylesEmpty}>No buckets yet. Add one to get started.</p>}
          <div className={stylesBucketTree}>
            {tree.map(node => (
              <BucketTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedBucketId={selectedBucketId}
                classificationId={classificationId}
                dialogId={dialogId}
                onSelect={setSelectedBucketId}
                onDelete={handleDeleteBucket}
              />
            ))}
          </div>
        </div>

        <div className={stylesAssignmentPanel}>
          {selectedBucket ? (
            <>
              <div className={stylesPanelHeader}>
                <span className={stylesPanelTitle}>Assignments — {selectedBucket.name}</span>
              </div>

              <div className={stylesAssignmentSection}>
                <div className={stylesAssignmentSectionTitle}>Assets</div>
                {assignedAssetIds.length === 0 && <p className={stylesEmpty}>No assets assigned.</p>}
                {assignedAssetIds.map(assetId => {
                  const asset = assets.find(a => a.id === assetId)
                  return (
                    <div key={assetId} className={stylesAssignmentItem}>
                      <span>{asset?.name ?? assetId}</span>
                      <Button onClick={() => handleUnassign('asset', assetId)}>Remove</Button>
                    </div>
                  )
                })}
                {unassignedAssets.length > 0 && (
                  <select
                    className={stylesAssignSelect}
                    value=""
                    onChange={async event => {
                      if (event.target.value) await handleAssign('asset', event.target.value)
                    }}
                  >
                    <option value="">Assign asset…</option>
                    {unassignedAssets.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className={stylesAssignmentSection}>
                <div className={stylesAssignmentSectionTitle}>Accounts</div>
                {assignedAccountIds.length === 0 && <p className={stylesEmpty}>No accounts assigned.</p>}
                {assignedAccountIds.map(accountId => {
                  const account = accounts.find(a => a.id === accountId)
                  return (
                    <div key={accountId} className={stylesAssignmentItem}>
                      <span>{account?.name ?? accountId}</span>
                      <Button onClick={() => handleUnassign('account', accountId)}>Remove</Button>
                    </div>
                  )
                })}
                {unassignedAccounts.length > 0 && (
                  <select
                    className={stylesAssignSelect}
                    value=""
                    onChange={async event => {
                      if (event.target.value) await handleAssign('account', event.target.value)
                    }}
                  >
                    <option value="">Assign account…</option>
                    {unassignedAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          ) : (
            <p className={stylesEmpty}>Select a bucket to manage its assignments.</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface BucketTreeNodeProps {
  node: ClassificationBucketTree
  depth: number
  selectedBucketId: string | null
  classificationId: string
  dialogId: number
  onSelect: (id: string) => void
  onDelete: (bucket: ClassificationBucket) => void
}

const BucketTreeNode: React.FC<BucketTreeNodeProps> = ({
  node,
  depth,
  selectedBucketId,
  classificationId,
  dialogId,
  onSelect,
  onDelete,
}) => {
  const { openDialog } = useDialogs()
  const isSelected = node.id === selectedBucketId

  return (
    <div className={stylesBucketNodeWrapper}>
      <div
        className={`${stylesBucketNode} ${isSelected ? stylesBucketNodeSelected : ''}`}
        style={{ paddingLeft: `calc(var(--spacing-medium) + ${depth * 24}px)` }}
        onClick={() => onSelect(node.id)}
      >
        <span className={stylesBucketNodeName}>{node.name}</span>
        <div className={stylesBucketNodeActions} onClick={e => e.stopPropagation()}>
          <Button
            onClick={async () => {
              await openDialog(
                ClassificationBucketDialog,
                { mode: { type: 'create', classificationId, parentBucketId: node.id } },
                dialogId
              )
            }}
          >
            + Child
          </Button>
          <Button
            onClick={async () => {
              await openDialog(ClassificationBucketDialog, { mode: { type: 'edit', bucket: node } }, dialogId)
            }}
          >
            Rename
          </Button>
          <Button onClick={() => onDelete(node)}>Delete</Button>
        </div>
      </div>
      {node.children.map(child => (
        <BucketTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedBucketId={selectedBucketId}
          classificationId={classificationId}
          dialogId={dialogId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

const stylesRoot = css`
  min-width: min(700px, calc(100vw - 4 * var(--spacing-large)));
`

const stylesHeader = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-medium);
  margin-bottom: var(--spacing-large);
`

const stylesTitle = css`
  margin: 0;
  font-size: 1.25rem;
  font-weight: bold;
`

const stylesHeaderActions = css`
  display: flex;
  gap: var(--spacing-small);
`

const stylesContent = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-large);

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const stylesBucketPanel = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-medium);
`

const stylesAssignmentPanel = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-medium);
`

const stylesPanelHeader = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-medium);
`

const stylesPanelTitle = css`
  font-weight: bold;
`

const stylesBucketTree = css`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const stylesBucketNodeWrapper = css`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const stylesBucketNode = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-small) var(--spacing-medium);
  border-radius: var(--border-radius-small);
  cursor: pointer;
  gap: var(--spacing-medium);

  &:hover {
    background-color: var(--color-neutral);
  }
`

const stylesBucketNodeSelected = css`
  background-color: var(--color-primary) !important;
  color: var(--color-text-on-primary);
`

const stylesBucketNodeName = css`
  flex: 1;
  font-size: 0.9rem;
`

const stylesBucketNodeActions = css`
  display: flex;
  gap: var(--spacing-small);
  flex-shrink: 0;
`

const stylesAssignmentSection = css`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-small);
`

const stylesAssignmentSectionTitle = css`
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--color-text-lite);
`

const stylesAssignmentItem = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-small);
  padding: var(--spacing-small) 0;
  border-bottom: 1px solid var(--color-neutral);
`

const stylesAssignSelect = css`
  background-color: var(--color-neutral-lite);
  border: 1px solid var(--color-neutral-darker);
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
  outline: 0;
  border-radius: var(--border-radius-small);
  color: var(--color-text);
  width: 100%;

  &:hover,
  &:focus {
    outline: 2px solid var(--color-neutral-dark);
  }
`

const stylesEmpty = css`
  color: var(--color-text-lite);
  font-size: 0.875rem;
  margin: 0;
`
