import BigNumber from 'bignumber.js'
import { expect, it } from 'vitest'

import { CategoryAssignment, resolveCategoryFractions } from './CategoryAssignment'

function assignment(
  categoryId: string,
  accountId: string | null,
  assetId: string | null,
  fraction: string,
  categorizationId: string = 'region'
): CategoryAssignment {
  return {
    id: `${categoryId}-${accountId}-${assetId}`,
    categorizationId,
    categoryId,
    accountId,
    assetId,
    fraction: BigNumber(fraction),
    createdAt: '2020-01-01T00:00:00.000Z',
  }
}

function plain(resolved: ReturnType<typeof resolveCategoryFractions>) {
  return {
    fractions: resolved.fractions.map(f => [f.categoryId, f.fraction.toString()]),
    unassignedFraction: resolved.unassignedFraction.toString(),
  }
}

it('resolveCategoryFractions', () => {
  const assignments = [
    assignment('eu', 'savings', null, '1'),
    assignment('liquid', 'savings', null, '1', 'liquidity'),
    assignment('us', null, 'etf', '0.7'),
    assignment('eu', null, 'etf', '0.2'),
    assignment('other', 'depot2', 'etf', '1'),
  ]

  // cash on an account
  expect(plain(resolveCategoryFractions(assignments, 'region', 'savings', null))).toEqual({
    fractions: [['eu', '1']],
    unassignedFraction: '0',
  })
  expect(plain(resolveCategoryFractions(assignments, 'liquidity', 'savings', null))).toEqual({
    fractions: [['liquid', '1']],
    unassignedFraction: '0',
  })
  // the asset assignment does not apply to the cash on an account
  expect(plain(resolveCategoryFractions(assignments, 'region', 'depot1', null))).toEqual({
    fractions: [],
    unassignedFraction: '1',
  })
  // asset in general, the rest is unassigned
  expect(plain(resolveCategoryFractions(assignments, 'region', 'depot1', 'etf'))).toEqual({
    fractions: [
      ['us', '0.7'],
      ['eu', '0.2'],
    ],
    unassignedFraction: '0.1',
  })
  // asset in a specific account takes precedence
  expect(plain(resolveCategoryFractions(assignments, 'region', 'depot2', 'etf'))).toEqual({
    fractions: [['other', '1']],
    unassignedFraction: '0',
  })
  // other categorizations are not affected
  expect(plain(resolveCategoryFractions(assignments, 'liquidity', 'depot1', 'etf'))).toEqual({
    fractions: [],
    unassignedFraction: '1',
  })
})
