import { expect, it } from 'vitest'

import { categoryPath, flattenCategoryTree } from './Category'

const category = (id: string, parentCategoryId: string | null) => ({
  id,
  categorizationId: 'region',
  parentCategoryId,
  name: id,
  createdAt: '2020-01-01T00:00:00.000Z',
})

const categories = [
  category('us', null),
  category('germany', 'eu'),
  category('eu', null),
  category('berlin', 'germany'),
  category('france', 'eu'),
]

it('flattenCategoryTree', () => {
  const tree = flattenCategoryTree(categories)
  expect(tree.map(n => [n.category.id, n.depth])).toEqual([
    ['eu', 0],
    ['france', 1],
    ['germany', 1],
    ['berlin', 2],
    ['us', 0],
  ])
})

it('categoryPath', () => {
  expect(categoryPath(categories, 'berlin').map(c => c.id)).toEqual(['eu', 'germany', 'berlin'])
  expect(categoryPath(categories, 'us').map(c => c.id)).toEqual(['us'])
  expect(categoryPath(categories, 'unknown')).toEqual([])
})
