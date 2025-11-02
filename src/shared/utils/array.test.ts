import { expect, it } from 'vitest'

import { findIndexLeftUntil, mergeSortedBy } from './array'

it('findIndexLeftUntil', () => {
  expect(findIndexLeftUntil([1, 2, 3], i => i > 0, 0)).toBe(-1)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 1, 0)).toBe(0)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 2, 0)).toBe(1)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 3, 0)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 4, 0)).toBe(2)

  expect(findIndexLeftUntil([1, 2, 3], i => i > 0, 1)).toBe(0)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 1, 1)).toBe(0)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 2, 1)).toBe(1)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 3, 1)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 4, 1)).toBe(2)

  expect(findIndexLeftUntil([1, 2, 3], i => i > 0, 2)).toBe(1)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 1, 2)).toBe(1)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 2, 2)).toBe(1)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 3, 2)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 4, 2)).toBe(2)

  expect(findIndexLeftUntil([1, 2, 3], i => i > 0, 3)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 1, 3)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 2, 3)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 3, 3)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 4, 3)).toBe(2)

  expect(findIndexLeftUntil([1, 2, 3], i => i > 0, 4)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 1, 4)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 2, 4)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 3, 4)).toBe(2)
  expect(findIndexLeftUntil([1, 2, 3], i => i > 4, 4)).toBe(2)
})

it('mergeSortedBy', () => {
  expect(mergeSortedBy([], [], () => 0)).toEqual([])
  expect(mergeSortedBy([{ n: 1, str: '11' }], [{ n: 2, str: '22' }], (a, b) => a.n - b.n)).toEqual([
    { n: 1, str: '11' },
    { n: 2, str: '22' },
  ])
  expect(
    mergeSortedBy(
      [
        { n: 1, str: '11' },
        { n: 3, str: '13' },
      ],
      [
        { n: 2, str: '22' },
        { n: 4, str: '24' },
      ],
      (a, b) => a.n - b.n
    )
  ).toEqual([
    { n: 1, str: '11' },
    { n: 2, str: '22' },
    { n: 3, str: '13' },
    { n: 4, str: '24' },
  ])
  expect(
    mergeSortedBy(
      [
        { n: 1, str: '11' },
        { n: 2, str: '12' },
      ],
      [
        { n: 2, str: '22' },
        { n: 3, str: '23' },
      ],
      (a, b) => a.n - b.n
    )
  ).toEqual([
    { n: 1, str: '11' },
    { n: 2, str: '12' },
    { n: 2, str: '22' },
    { n: 3, str: '23' },
  ])
})
