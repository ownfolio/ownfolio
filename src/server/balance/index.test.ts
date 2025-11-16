import BigNumber from 'bignumber.js'
import { describe, expect, it } from 'vitest'

import { Balance, createEmptyBalance } from '../../shared/models/Balance'
import { Transaction, TransactionData } from '../../shared/models/Transaction'
import { evaluateBalances, updateBalanceByTransaction } from './index'

describe('evaluateBalances', () => {
  it('empty', () => {
    expect(evaluateBalances([], [])).toEqual([])
  })

  it('dates', () => {
    expect(evaluateBalances(['2020-01-01'], [])).toEqual([
      {
        ...createEmptyBalance(),
        date: '2020-01-01',
      } satisfies Balance,
    ])
    expect(evaluateBalances(['2020-01-01', '2021-01-01', '2022-01-01'], [])).toEqual([
      {
        ...createEmptyBalance(),
        date: '2020-01-01',
      } satisfies Balance,
      {
        ...createEmptyBalance(),
        date: '2021-01-01',
      } satisfies Balance,
      {
        ...createEmptyBalance(),
        date: '2022-01-01',
      } satisfies Balance,
    ])
  })

  it('transactions', () => {
    expect(
      evaluateBalances(
        ['2021-01-01', '2023-01-01', '2025-01-01'],
        [
          tx('tx1', '2020-01-01', { type: 'cashDeposit', cashAccountId: 'cashAccount', cashAmount: BigNumber('10') }),
          tx('tx2', '2022-01-01', { type: 'cashDeposit', cashAccountId: 'cashAccount', cashAmount: BigNumber('20') }),
          tx('tx3', '2024-01-01', { type: 'cashDeposit', cashAccountId: 'cashAccount', cashAmount: BigNumber('30') }),
          tx('tx4', '2026-01-01', { type: 'cashDeposit', cashAccountId: 'cashAccount', cashAmount: BigNumber('40') }),
        ]
      )
    ).toEqual([
      {
        ...createEmptyBalance(),
        date: '2021-01-01',
        cashPositions: {
          open: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('10'),
              openDate: '2020-01-01',
              openPrice: BigNumber('10'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'open',
              type: 'cash',
            },
          ],
          closed: [],
        },
      } satisfies Balance,
      {
        ...createEmptyBalance(),
        date: '2023-01-01',
        cashPositions: {
          open: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('10'),
              openDate: '2020-01-01',
              openPrice: BigNumber('10'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'open',
              type: 'cash',
            },
            {
              accountId: 'cashAccount',
              amount: BigNumber('20'),
              openDate: '2022-01-01',
              openPrice: BigNumber('20'),
              openTime: '00:00:00',
              openTransactionId: 'tx2',
              state: 'open',
              type: 'cash',
            },
          ],
          closed: [],
        },
      } satisfies Balance,
      {
        ...createEmptyBalance(),
        date: '2025-01-01',
        cashPositions: {
          open: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('10'),
              openDate: '2020-01-01',
              openPrice: BigNumber('10'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'open',
              type: 'cash',
            },
            {
              accountId: 'cashAccount',
              amount: BigNumber('20'),
              openDate: '2022-01-01',
              openPrice: BigNumber('20'),
              openTime: '00:00:00',
              openTransactionId: 'tx2',
              state: 'open',
              type: 'cash',
            },
            {
              accountId: 'cashAccount',
              amount: BigNumber('30'),
              openDate: '2024-01-01',
              openPrice: BigNumber('30'),
              openTime: '00:00:00',
              openTransactionId: 'tx3',
              state: 'open',
              type: 'cash',
            },
          ],
          closed: [],
        },
      } satisfies Balance,
    ])
  })

  it('quotes', () => {
    expect(
      evaluateBalances(
        ['2021-01-01', '2022-01-01', '2023-01-01', '2024-01-01'],
        [
          tx('tx1', '2020-01-01', { type: 'cashDeposit', cashAccountId: 'cashAccount', cashAmount: BigNumber('1000') }),
          tx('tx2', '2021-01-01', {
            type: 'assetBuy',
            assetAccountId: 'assetAccount',
            assetId: 'asset',
            assetAmount: BigNumber('5'),
            cashAccountId: 'cashAccount',
            cashAmount: BigNumber('50'),
            feeCashAmount: BigNumber('0'),
          }),
        ],
        {
          quotes: [
            { date: '2022-01-01', assetId: 'asset', open: null, high: null, low: null, close: BigNumber('15') },
            { date: '2022-07-01', assetId: 'otherAsset', open: null, high: null, low: null, close: BigNumber('150') },
            { date: '2023-01-01', assetId: 'asset', open: null, high: null, low: null, close: BigNumber('20') },
            { date: '2023-07-01', assetId: 'otherAsset', open: null, high: null, low: null, close: BigNumber('200') },
          ],
        }
      )
    ).toEqual([
      {
        ...createEmptyBalance(),
        date: '2021-01-01',
        cashPositions: {
          open: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('950'),
              openDate: '2020-01-01',
              openPrice: BigNumber('950'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'open',
              type: 'cash',
            },
          ],
          closed: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('50'),
              closeDate: '2021-01-01',
              closePrice: BigNumber('50'),
              closeTime: '00:00:00',
              closeTransactionId: 'tx2',
              openDate: '2020-01-01',
              openPrice: BigNumber('50'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'closed',
              type: 'cash',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              accountId: 'assetAccount',
              amount: BigNumber('5'),
              assetId: 'asset',
              openDate: '2021-01-01',
              openPrice: BigNumber('50'),
              openTime: '00:00:00',
              openTransactionId: 'tx2',
              state: 'open',
              type: 'asset',
            },
          ],
          closed: [],
        },
      } satisfies Balance,
      {
        ...createEmptyBalance(),
        date: '2022-01-01',
        cashPositions: {
          open: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('950'),
              openDate: '2020-01-01',
              openPrice: BigNumber('950'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'open',
              type: 'cash',
            },
          ],
          closed: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('50'),
              closeDate: '2021-01-01',
              closePrice: BigNumber('50'),
              closeTime: '00:00:00',
              closeTransactionId: 'tx2',
              openDate: '2020-01-01',
              openPrice: BigNumber('50'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'closed',
              type: 'cash',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              accountId: 'assetAccount',
              amount: BigNumber('5'),
              assetId: 'asset',
              openDate: '2021-01-01',
              openPrice: BigNumber('50'),
              openTime: '00:00:00',
              openTransactionId: 'tx2',
              state: 'open',
              type: 'asset',
            },
          ],
          closed: [],
        },
        quotes: {
          asset: BigNumber(15),
        },
      } satisfies Balance,
      {
        ...createEmptyBalance(),
        date: '2023-01-01',
        cashPositions: {
          open: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('950'),
              openDate: '2020-01-01',
              openPrice: BigNumber('950'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'open',
              type: 'cash',
            },
          ],
          closed: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('50'),
              closeDate: '2021-01-01',
              closePrice: BigNumber('50'),
              closeTime: '00:00:00',
              closeTransactionId: 'tx2',
              openDate: '2020-01-01',
              openPrice: BigNumber('50'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'closed',
              type: 'cash',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              accountId: 'assetAccount',
              amount: BigNumber('5'),
              assetId: 'asset',
              openDate: '2021-01-01',
              openPrice: BigNumber('50'),
              openTime: '00:00:00',
              openTransactionId: 'tx2',
              state: 'open',
              type: 'asset',
            },
          ],
          closed: [],
        },
        quotes: {
          asset: BigNumber(20),
          otherAsset: BigNumber(150),
        },
      } satisfies Balance,
      {
        ...createEmptyBalance(),
        date: '2024-01-01',
        cashPositions: {
          open: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('950'),
              openDate: '2020-01-01',
              openPrice: BigNumber('950'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'open',
              type: 'cash',
            },
          ],
          closed: [
            {
              accountId: 'cashAccount',
              amount: BigNumber('50'),
              closeDate: '2021-01-01',
              closePrice: BigNumber('50'),
              closeTime: '00:00:00',
              closeTransactionId: 'tx2',
              openDate: '2020-01-01',
              openPrice: BigNumber('50'),
              openTime: '00:00:00',
              openTransactionId: 'tx1',
              state: 'closed',
              type: 'cash',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              accountId: 'assetAccount',
              amount: BigNumber('5'),
              assetId: 'asset',
              openDate: '2021-01-01',
              openPrice: BigNumber('50'),
              openTime: '00:00:00',
              openTransactionId: 'tx2',
              state: 'open',
              type: 'asset',
            },
          ],
          closed: [],
        },
        quotes: {
          asset: BigNumber(20),
          otherAsset: BigNumber(200),
        },
      } satisfies Balance,
    ])
  })
})

describe('updateBalanceByTransaction', () => {
  it('cashDeposit / cashWithdrawal', () => {
    let b = createEmptyBalance()
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashDeposit11', '2020-01-02', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount1',
        cashAmount: BigNumber('10000'),
      }),
      expectedBalance: {
        date: '2020-01-02',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
            },
          ],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashDeposit2', '2020-01-03', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount2',
        cashAmount: BigNumber('5000'),
      }),
      expectedBalance: {
        date: '2020-01-03',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount2',
              amount: BigNumber('5000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit2',
            },
          ],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashDeposit12', '2020-01-04', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount1',
        cashAmount: BigNumber('20000'),
      }),
      expectedBalance: {
        date: '2020-01-04',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount2',
              amount: BigNumber('5000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit2',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('20000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('20000'),
              openTransactionId: 'txCashDeposit12',
            },
          ],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashWithdrawal11', '2020-01-05', {
        type: 'cashWithdrawal',
        cashAccountId: 'cashAccount1',
        cashAmount: BigNumber('15000'),
      }),
      expectedBalance: {
        date: '2020-01-05',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount2',
              amount: BigNumber('5000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit2',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('15000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('15000'),
              openTransactionId: 'txCashDeposit12',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('10000'),
              closeTransactionId: 'txCashWithdrawal11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('5000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit12',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('5000'),
              closeTransactionId: 'txCashWithdrawal11',
            },
          ],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashWithdrawal12', '2020-01-06', {
        type: 'cashWithdrawal',
        cashAccountId: 'cashAccount1',
        cashAmount: BigNumber('25000'),
      }),
      expectedBalance: {
        date: '2020-01-06',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount2',
              amount: BigNumber('5000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit2',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('-10000'),
              openDate: '2020-01-06',
              openTime: '00:00:00',
              openPrice: BigNumber('-10000'),
              openTransactionId: 'txCashWithdrawal12',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('10000'),
              closeTransactionId: 'txCashWithdrawal11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('5000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit12',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('5000'),
              closeTransactionId: 'txCashWithdrawal11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('15000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('15000'),
              openTransactionId: 'txCashDeposit12',
              closeDate: '2020-01-06',
              closeTime: '00:00:00',
              closePrice: BigNumber('15000'),
              closeTransactionId: 'txCashWithdrawal12',
            },
          ],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashWithdrawal13', '2020-01-07', {
        type: 'cashWithdrawal',
        cashAccountId: 'cashAccount1',
        cashAmount: BigNumber('5000'),
      }),
      expectedBalance: {
        date: '2020-01-07',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount2',
              amount: BigNumber('5000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit2',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('-10000'),
              openDate: '2020-01-06',
              openTime: '00:00:00',
              openPrice: BigNumber('-10000'),
              openTransactionId: 'txCashWithdrawal12',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('-5000'),
              openDate: '2020-01-07',
              openTime: '00:00:00',
              openPrice: BigNumber('-5000'),
              openTransactionId: 'txCashWithdrawal13',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('10000'),
              closeTransactionId: 'txCashWithdrawal11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('5000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit12',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('5000'),
              closeTransactionId: 'txCashWithdrawal11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('15000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('15000'),
              openTransactionId: 'txCashDeposit12',
              closeDate: '2020-01-06',
              closeTime: '00:00:00',
              closePrice: BigNumber('15000'),
              closeTransactionId: 'txCashWithdrawal12',
            },
          ],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashDeposit13', '2020-01-08', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount1',
        cashAmount: BigNumber('30000'),
      }),
      expectedBalance: {
        date: '2020-01-08',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount2',
              amount: BigNumber('5000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit2',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('15000'),
              openDate: '2020-01-08',
              openTime: '00:00:00',
              openPrice: BigNumber('15000'),
              openTransactionId: 'txCashDeposit13',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('10000'),
              closeTransactionId: 'txCashWithdrawal11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('5000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit12',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('5000'),
              closeTransactionId: 'txCashWithdrawal11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('15000'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('15000'),
              openTransactionId: 'txCashDeposit12',
              closeDate: '2020-01-06',
              closeTime: '00:00:00',
              closePrice: BigNumber('15000'),
              closeTransactionId: 'txCashWithdrawal12',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('-10000'),
              openDate: '2020-01-06',
              openTime: '00:00:00',
              openPrice: BigNumber('-10000'),
              openTransactionId: 'txCashWithdrawal12',
              closeDate: '2020-01-08',
              closeTime: '00:00:00',
              closePrice: BigNumber('-10000'),
              closeTransactionId: 'txCashDeposit13',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount1',
              amount: BigNumber('-5000'),
              openDate: '2020-01-07',
              openTime: '00:00:00',
              openPrice: BigNumber('-5000'),
              openTransactionId: 'txCashWithdrawal13',
              closeDate: '2020-01-08',
              closeTime: '00:00:00',
              closePrice: BigNumber('-5000'),
              closeTransactionId: 'txCashDeposit13',
            },
          ],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
  })

  it('cashTransfer', () => {
    let b = createEmptyBalance()
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashDeposit11', '2020-01-02', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount1',
        cashAmount: BigNumber('10000'),
      }),
      expectedBalance: {
        date: '2020-01-02',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
            },
          ],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashDeposit12', '2020-01-03', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount1',
        cashAmount: BigNumber('5000'),
      }),
      expectedBalance: {
        date: '2020-01-03',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('5000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit12',
            },
          ],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashTransfer', '2020-01-04', {
        type: 'cashTransfer',
        fromCashAccountId: 'cashAccount1',
        toCashAccountId: 'cashAccount2',
        cashAmount: BigNumber('11000'),
        feeCashAmount: BigNumber('0'),
      }),
      expectedBalance: {
        date: '2020-01-04',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount2',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit11',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount2',
              amount: BigNumber('1000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txCashDeposit12',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount1',
              amount: BigNumber('4000'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('4000'),
              openTransactionId: 'txCashDeposit12',
            },
          ],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
  })

  it('assetDeposit / assetWithdrawal', () => {
    let b = createEmptyBalance()
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetDeposit1', '2020-01-02', {
        type: 'assetDeposit',
        cashAmount: BigNumber('1000'),
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: BigNumber('10'),
      }),
      expectedBalance: {
        date: '2020-01-02',
        time: '00:00:00',
        cashPositions: {
          open: [],
          closed: [],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('10'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txAssetDeposit1',
            },
          ],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetDeposit2', '2020-01-03', {
        type: 'assetDeposit',
        cashAmount: BigNumber('2000'),
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: BigNumber('30'),
      }),
      expectedBalance: {
        date: '2020-01-03',
        time: '00:00:00',
        cashPositions: {
          open: [],
          closed: [],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('10'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txAssetDeposit1',
            },
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('30'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txAssetDeposit2',
            },
          ],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetWithdrawal', '2020-01-04', {
        type: 'assetWithdrawal',
        cashAmount: BigNumber('6000'),
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: BigNumber('80'),
      }),
      expectedBalance: {
        date: '2020-01-04',
        time: '00:00:00',
        cashPositions: {
          open: [],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [
            {
              type: 'asset',
              state: 'closed',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('10'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txAssetDeposit1',
              closeDate: '2020-01-04',
              closeTime: '00:00:00',
              closePrice: BigNumber('750'),
              closeTransactionId: 'txAssetWithdrawal',
            },
            {
              type: 'asset',
              state: 'closed',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('30'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txAssetDeposit2',
              closeDate: '2020-01-04',
              closeTime: '00:00:00',
              closePrice: BigNumber('2250'),
              closeTransactionId: 'txAssetWithdrawal',
            },
          ],
        },
        quotes: {},
        issues: [
          {
            type: 'negativeAssetAmounts',
            transactionId: 'txAssetWithdrawal',
            accountId: 'assetAccount1',
            assetId: 'asset1',
            exceededAssetAmount: BigNumber(40),
          },
        ],
      },
    })
  })

  it('assetBuy / assetSell', () => {
    let b = createEmptyBalance()
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashDeposit', '2020-01-02', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount',
        cashAmount: BigNumber('10000'),
      }),
      expectedBalance: {
        date: '2020-01-02',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit',
            },
          ],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetBuy11', '2020-01-03', {
        type: 'assetBuy',
        cashAccountId: 'cashAccount',
        cashAmount: BigNumber('1000'),
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: BigNumber('10'),
        feeCashAmount: BigNumber('0'),
      }),
      expectedBalance: {
        date: '2020-01-03',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount',
              amount: BigNumber('9000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('9000'),
              openTransactionId: 'txCashDeposit',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('1000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-03',
              closeTime: '00:00:00',
              closePrice: BigNumber('1000'),
              closeTransactionId: 'txAssetBuy11',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('10'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txAssetBuy11',
            },
          ],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetBuy21', '2020-01-04', {
        type: 'assetBuy',
        cashAccountId: 'cashAccount',
        cashAmount: BigNumber('2000'),
        assetAccountId: 'assetAccount1',
        assetId: 'asset2',
        assetAmount: BigNumber('100'),
        feeCashAmount: BigNumber('0'),
      }),
      expectedBalance: {
        date: '2020-01-04',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount',
              amount: BigNumber('7000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('7000'),
              openTransactionId: 'txCashDeposit',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('1000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-03',
              closeTime: '00:00:00',
              closePrice: BigNumber('1000'),
              closeTransactionId: 'txAssetBuy11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('2000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-04',
              closeTime: '00:00:00',
              closePrice: BigNumber('2000'),
              closeTransactionId: 'txAssetBuy21',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('10'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txAssetBuy11',
            },
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset2',
              amount: BigNumber('100'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txAssetBuy21',
            },
          ],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetBuy12', '2020-01-05', {
        type: 'assetBuy',
        cashAccountId: 'cashAccount',
        cashAmount: BigNumber('5000'),
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: BigNumber('20'),
        feeCashAmount: BigNumber('0'),
      }),
      expectedBalance: {
        date: '2020-01-05',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount',
              amount: BigNumber('2000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txCashDeposit',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('1000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-03',
              closeTime: '00:00:00',
              closePrice: BigNumber('1000'),
              closeTransactionId: 'txAssetBuy11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('2000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-04',
              closeTime: '00:00:00',
              closePrice: BigNumber('2000'),
              closeTransactionId: 'txAssetBuy21',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('5000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('5000'),
              closeTransactionId: 'txAssetBuy12',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('10'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txAssetBuy11',
            },
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset2',
              amount: BigNumber('100'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txAssetBuy21',
            },
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('20'),
              openDate: '2020-01-05',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txAssetBuy12',
            },
          ],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetSell', '2020-01-06', {
        type: 'assetSell',
        cashAccountId: 'cashAccount',
        cashAmount: BigNumber('6000'),
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: BigNumber('15'),
        feeCashAmount: BigNumber('0'),
        taxCashAmount: BigNumber('0'),
      }),
      expectedBalance: {
        date: '2020-01-06',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount',
              amount: BigNumber('2000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txCashDeposit',
            },
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount',
              amount: BigNumber('6000'),
              openDate: '2020-01-06',
              openTime: '00:00:00',
              openPrice: BigNumber('6000'),
              openTransactionId: 'txAssetSell',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('1000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('1000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-03',
              closeTime: '00:00:00',
              closePrice: BigNumber('1000'),
              closeTransactionId: 'txAssetBuy11',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('2000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-04',
              closeTime: '00:00:00',
              closePrice: BigNumber('2000'),
              closeTransactionId: 'txAssetBuy21',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('5000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('5000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-05',
              closeTime: '00:00:00',
              closePrice: BigNumber('5000'),
              closeTransactionId: 'txAssetBuy12',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset2',
              amount: BigNumber('100'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('2000'),
              openTransactionId: 'txAssetBuy21',
            },
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset1',
              amount: BigNumber('15'),
              openDate: '2020-01-05',
              openTime: '00:00:00',
              openPrice: BigNumber('3750'),
              openTransactionId: 'txAssetBuy12',
            },
          ],
          closed: [
            {
              accountId: 'assetAccount1',
              amount: BigNumber('10'),
              assetId: 'asset1',
              closeDate: '2020-01-06',
              closePrice: BigNumber('4000'),
              closeTime: '00:00:00',
              closeTransactionId: 'txAssetSell',
              openDate: '2020-01-03',
              openPrice: BigNumber('1000'),
              openTime: '00:00:00',
              openTransactionId: 'txAssetBuy11',
              state: 'closed',
              type: 'asset',
            },
            {
              accountId: 'assetAccount1',
              amount: BigNumber('5'),
              assetId: 'asset1',
              closeDate: '2020-01-06',
              closePrice: BigNumber('2000'),
              closeTime: '00:00:00',
              closeTransactionId: 'txAssetSell',
              openDate: '2020-01-05',
              openPrice: BigNumber('1250'),
              openTime: '00:00:00',
              openTransactionId: 'txAssetBuy12',
              state: 'closed',
              type: 'asset',
            },
          ],
        },
        quotes: {},
        issues: [],
      },
    })
  })

  it('assetTransfer', () => {
    let b = createEmptyBalance()
    b = testStep({
      initialBalance: b,
      transaction: tx('txCashDeposit', '2020-01-02', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount',
        cashAmount: BigNumber('10000'),
      }),
      expectedBalance: {
        date: '2020-01-02',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount',
              amount: BigNumber('10000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('10000'),
              openTransactionId: 'txCashDeposit',
            },
          ],
          closed: [],
        },
        assetPositions: {
          open: [],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetBuy1', '2020-01-03', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset',
        assetAmount: BigNumber('100'),
        cashAccountId: 'cashAccount',
        cashAmount: BigNumber('3000'),
        feeCashAmount: BigNumber('0'),
      }),
      expectedBalance: {
        date: '2020-01-03',
        time: '00:00:00',
        cashPositions: {
          open: [
            {
              type: 'cash',
              state: 'open',
              accountId: 'cashAccount',
              amount: BigNumber('7000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('7000'),
              openTransactionId: 'txCashDeposit',
            },
          ],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('3000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('3000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-03',
              closeTime: '00:00:00',
              closePrice: BigNumber('3000'),
              closeTransactionId: 'txAssetBuy1',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset',
              amount: BigNumber('100'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('3000'),
              openTransactionId: 'txAssetBuy1',
            },
          ],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetBuy2', '2020-01-04', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset',
        assetAmount: BigNumber('200'),
        cashAccountId: 'cashAccount',
        cashAmount: BigNumber('7000'),
        feeCashAmount: BigNumber('0'),
      }),
      expectedBalance: {
        date: '2020-01-04',
        time: '00:00:00',
        cashPositions: {
          open: [],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('3000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('3000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-03',
              closeTime: '00:00:00',
              closePrice: BigNumber('3000'),
              closeTransactionId: 'txAssetBuy1',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('7000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('7000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-04',
              closeTime: '00:00:00',
              closePrice: BigNumber('7000'),
              closeTransactionId: 'txAssetBuy2',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset',
              amount: BigNumber('100'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('3000'),
              openTransactionId: 'txAssetBuy1',
            },
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset',
              amount: BigNumber('200'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('7000'),
              openTransactionId: 'txAssetBuy2',
            },
          ],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
    b = testStep({
      initialBalance: b,
      transaction: tx('txAssetTransfer', '2020-01-05', {
        type: 'assetTransfer',
        fromAssetAccountId: 'assetAccount1',
        toAssetAccountId: 'assetAccount2',
        assetId: 'asset',
        assetAmount: BigNumber('150'),
        feeAssetAmount: BigNumber('0'),
      }),
      expectedBalance: {
        date: '2020-01-05',
        time: '00:00:00',
        cashPositions: {
          open: [],
          closed: [
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('3000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('3000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-03',
              closeTime: '00:00:00',
              closePrice: BigNumber('3000'),
              closeTransactionId: 'txAssetBuy1',
            },
            {
              type: 'cash',
              state: 'closed',
              accountId: 'cashAccount',
              amount: BigNumber('7000'),
              openDate: '2020-01-02',
              openTime: '00:00:00',
              openPrice: BigNumber('7000'),
              openTransactionId: 'txCashDeposit',
              closeDate: '2020-01-04',
              closeTime: '00:00:00',
              closePrice: BigNumber('7000'),
              closeTransactionId: 'txAssetBuy2',
            },
          ],
        },
        assetPositions: {
          open: [
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount2',
              assetId: 'asset',
              amount: BigNumber('100'),
              openDate: '2020-01-03',
              openTime: '00:00:00',
              openPrice: BigNumber('3000'),
              openTransactionId: 'txAssetBuy1',
            },
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount2',
              assetId: 'asset',
              amount: BigNumber('50'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('1750'),
              openTransactionId: 'txAssetBuy2',
            },
            {
              type: 'asset',
              state: 'open',
              accountId: 'assetAccount1',
              assetId: 'asset',
              amount: BigNumber('150'),
              openDate: '2020-01-04',
              openTime: '00:00:00',
              openPrice: BigNumber('5250'),
              openTransactionId: 'txAssetBuy2',
            },
          ],
          closed: [],
        },
        quotes: {},
        issues: [],
      },
    })
  })
})

interface TestStep {
  initialBalance: Balance
  transaction: Transaction
  expectedBalance: Balance
}

function testStep({ initialBalance, transaction, expectedBalance }: TestStep): Balance {
  const balance2 = updateBalanceByTransaction(initialBalance, transaction)
  expect(balance2).toEqual(expectedBalance)
  return balance2
}

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
