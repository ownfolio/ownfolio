import BigNumber from 'bignumber.js'
import { expect, it } from 'vitest'

import { Transaction, TransactionData } from '../../shared/models/Transaction'
import {
  evaluateHistorical,
  evaluateHistoricalWithQuotes,
  evaluateNow,
  EvaluationResult,
  EvaluationStepFunction,
} from './evaluate'

const txs = [tx('tx1', '2000-01-01', {} as any), tx('tx2', '2000-01-02', {} as any), tx('tx3', '2000-01-03', {} as any)]
const fn: EvaluationStepFunction<number, { factor: number }> = (acc, _transaction, opts): EvaluationResult<number> => {
  return {
    value: acc.value + opts.params.factor,
    errors: acc.errors,
  }
}

it('evaluateFull', () => {
  expect(evaluateNow({ value: 0, errors: [] }, txs.slice(0, 0), fn, { params: { factor: 1 } })).toEqual({
    value: 0,
    errors: [],
  })
  expect(evaluateNow({ value: 0, errors: [] }, txs.slice(0, 1), fn, { params: { factor: 1 } })).toEqual({
    value: 1,
    errors: [],
  })
  expect(evaluateNow({ value: 0, errors: [] }, txs.slice(0, 2), fn, { params: { factor: 1 } })).toEqual({
    value: 2,
    errors: [],
  })
  expect(evaluateNow({ value: 0, errors: [] }, txs.slice(0, 3), fn, { params: { factor: 1 } })).toEqual({
    value: 3,
    errors: [],
  })
  expect(evaluateNow({ value: 0, errors: [] }, txs.slice(0, 0), fn, { params: { factor: 2 } })).toEqual({
    value: 0,
    errors: [],
  })
  expect(evaluateNow({ value: 0, errors: [] }, txs.slice(0, 1), fn, { params: { factor: 2 } })).toEqual({
    value: 2,
    errors: [],
  })
  expect(evaluateNow({ value: 0, errors: [] }, txs.slice(0, 2), fn, { params: { factor: 2 } })).toEqual({
    value: 4,
    errors: [],
  })
  expect(evaluateNow({ value: 0, errors: [] }, txs.slice(0, 3), fn, { params: { factor: 2 } })).toEqual({
    value: 6,
    errors: [],
  })
})

it('evaluateHistorical', () => {
  expect(
    evaluateHistorical({ value: 0, errors: [] }, ['1999-12-31', '2000-01-01', '2000-01-03'], txs, fn, {
      params: { factor: 1 },
    })
  ).toEqual([
    { date: '1999-12-31', value: 0, errors: [] },
    { date: '2000-01-01', value: 1, errors: [] },
    { date: '2000-01-03', value: 3, errors: [] },
  ])
  expect(
    evaluateHistorical({ value: 0, errors: [] }, ['2000-11-30', '2000-12-31'], txs, fn, { params: { factor: 1 } })
  ).toEqual([
    { date: '2000-11-30', value: 3, errors: [] },
    { date: '2000-12-31', value: 3, errors: [] },
  ])
})

it('evaluateHistoricalWithQuotes', () => {
  expect(
    evaluateHistoricalWithQuotes(
      [
        { date: '1999-12-31', value: BigNumber(0), errors: [] },
        { date: '2000-01-01', value: BigNumber(0), errors: [] },
        { date: '2000-01-02', value: BigNumber(0), errors: [] },
      ],
      {},
      (result, quotes) => {
        return {
          date: result.date,
          value: quotes.some || BigNumber(-1),
          errors: [],
        }
      }
    )
  ).toEqual([
    { date: '1999-12-31', value: BigNumber(-1), errors: [] },
    { date: '2000-01-01', value: BigNumber(-1), errors: [] },
    { date: '2000-01-02', value: BigNumber(-1), errors: [] },
  ])

  expect(
    evaluateHistoricalWithQuotes(
      [
        { date: '1999-12-31', value: BigNumber(0), errors: [] },
        { date: '2000-01-01', value: BigNumber(0), errors: [] },
        { date: '2000-01-02', value: BigNumber(0), errors: [] },
      ],
      { some: [{ date: '2000-01-01', close: BigNumber(10) }] },
      (result, quotes) => {
        return {
          date: result.date,
          value: quotes.some || result.value,
          errors: [],
        }
      }
    )
  ).toEqual([
    { date: '1999-12-31', value: BigNumber(0), errors: [] },
    { date: '2000-01-01', value: BigNumber(10), errors: [] },
    { date: '2000-01-02', value: BigNumber(10), errors: [] },
  ])

  expect(
    evaluateHistoricalWithQuotes(
      [
        { date: '1999-12-31', value: BigNumber(0), errors: [] },
        { date: '2000-01-01', value: BigNumber(0), errors: [] },
        { date: '2000-01-02', value: BigNumber(0), errors: [] },
        { date: '2000-01-04', value: BigNumber(0), errors: [] },
        { date: '2000-01-05', value: BigNumber(0), errors: [] },
        { date: '2000-01-07', value: BigNumber(0), errors: [] },
      ],
      {
        some: [
          { date: '2000-01-01', close: BigNumber(10) },
          { date: '2000-01-02', close: BigNumber(20) },
          { date: '2000-01-03', close: BigNumber(30) },
          { date: '2000-01-05', close: BigNumber(50) },
          { date: '2000-01-06', close: BigNumber(60) },
        ],
      },
      (result, quotes) => {
        return {
          date: result.date,
          value: quotes.some || result.value,
          errors: [],
        }
      }
    )
  ).toEqual([
    { date: '1999-12-31', value: BigNumber(0), errors: [] },
    { date: '2000-01-01', value: BigNumber(10), errors: [] },
    { date: '2000-01-02', value: BigNumber(20), errors: [] },
    { date: '2000-01-04', value: BigNumber(30), errors: [] },
    { date: '2000-01-05', value: BigNumber(50), errors: [] },
    { date: '2000-01-07', value: BigNumber(60), errors: [] },
  ])

  expect(
    evaluateHistoricalWithQuotes(
      [{ date: '2000-01-01', value: BigNumber(0), errors: [] }],
      {
        some: [
          { date: '1999-12-31', close: BigNumber(10) },
          { date: '2000-01-01', close: BigNumber(20) },
        ],
      },
      (result, quotes) => {
        return {
          date: result.date,
          value: quotes.some || result.value,
          errors: [],
        }
      }
    )
  ).toEqual([{ date: '2000-01-01', value: BigNumber(20), errors: [] }])
})

function tx(id: string, date: string, data: TransactionData): Transaction {
  return {
    id,
    userId: '',
    date,
    time: '00:00:00',
    data,
    reference: '',
    comment: '',
    createdAt: '',
  }
}
