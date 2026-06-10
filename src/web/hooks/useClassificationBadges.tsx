import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { rpcClient } from '../api'

export function useClassificationBadges() {
  const navigate = useNavigate()

  const { data: classifications } = useSuspenseQuery({
    queryKey: ['classifications'],
    queryFn: () => rpcClient.listClassifications().then(r => r.data),
  })
  const { data: allBuckets } = useSuspenseQuery({
    queryKey: ['allClassificationBuckets', classifications.map(c => c.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        classifications.map(c => rpcClient.listClassificationBuckets({ classificationId: c.id }).then(r => r.data))
      )
      return results.flat()
    },
  })
  const { data: allAssignments } = useSuspenseQuery({
    queryKey: ['allClassificationAssignments'],
    queryFn: () => rpcClient.listAllClassificationAssignments().then(r => r.data),
  })

  const getBadges = React.useCallback(
    (entityType: 'asset' | 'account', entityId: string): React.ReactNode => {
      const entityAssignments = allAssignments.filter(a => a.entityType === entityType && a.entityId === entityId)
      if (entityAssignments.length === 0) return null
      return (
        <div className={stylesBadgeContainer}>
          {entityAssignments.map(assignment => {
            const bucket = allBuckets?.find(b => b.id === assignment.bucketId)
            const classification = classifications.find(c => c.id === assignment.classificationId)
            if (!bucket || !classification) return null
            return (
              <span
                key={assignment.bucketId}
                className={stylesBadge}
                title={`${classification.name}: ${bucket.name}`}
                onClick={event => {
                  event.preventDefault()
                  navigate(`/classifications/${classification.id}`)
                }}
              >
                {bucket.name}
              </span>
            )
          })}
        </div>
      )
    },
    [allAssignments, allBuckets, classifications, navigate]
  )

  return { getBadges }
}

const stylesBadgeContainer = css`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const stylesBadge = css`
  display: inline-block;
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  border-radius: var(--border-radius-small);
  padding: 1px 6px;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    opacity: 0.85;
  }
`
