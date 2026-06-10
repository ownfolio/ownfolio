import { z } from 'zod'

export const classificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().trim().min(1).max(128),
  status: z.enum(['active', 'inactive', 'hidden']).default('active'),
  createdAt: z.string().datetime(),
})

export type Classification = z.infer<typeof classificationSchema>

export const classificationBucketSchema = z.object({
  id: z.string(),
  classificationId: z.string(),
  parentBucketId: z.string().nullable().default(null),
  name: z.string().trim().min(1).max(128),
  sortOrder: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
})

export type ClassificationBucket = z.infer<typeof classificationBucketSchema>

export type ClassificationBucketTree = ClassificationBucket & {
  children: ClassificationBucketTree[]
}

export const classificationBucketAssignmentSchema = z.object({
  bucketId: z.string(),
  classificationId: z.string(),
  entityType: z.enum(['asset', 'account']),
  entityId: z.string(),
  createdAt: z.string().datetime(),
})

export type ClassificationBucketAssignment = z.infer<typeof classificationBucketAssignmentSchema>

export function buildBucketTree(buckets: ClassificationBucket[]): ClassificationBucketTree[] {
  const nodeMap = new Map<string, ClassificationBucketTree>()
  const roots: ClassificationBucketTree[] = []

  for (const bucket of buckets) {
    nodeMap.set(bucket.id, { ...bucket, children: [] })
  }

  const sorted = [...buckets].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  for (const bucket of sorted) {
    const node = nodeMap.get(bucket.id)!
    if (bucket.parentBucketId) {
      const parent = nodeMap.get(bucket.parentBucketId)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  return roots
}
