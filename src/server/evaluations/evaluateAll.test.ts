import BigNumber from 'bignumber.js'
import { describe, expect, it } from 'vitest'

import { Transaction, TransactionData } from '../../shared/models/Transaction'
import { evaluateAll, EvaluateAllValue } from './evaluateAll'

describe('evaluateAll', () => {
  it('empty', () => {
    expect(evaluateAll([]).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {},
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })
  })

  it('cashDeposit / cashWithdrawal / cashTransfer', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txCashDeposit1', '2000-01-01', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount1',
        cashAmount: '10000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(10000),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txCashDeposit2', '2000-01-02', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount1',
        cashAmount: '20000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(30000),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txCashDeposit3', '2000-01-03', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount2',
        cashAmount: '40000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(30000),
        cashAccount2: BigNumber(40000),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txCashWithdrawl1', '2000-01-04', {
        type: 'cashWithdrawal',
        cashAccountId: 'cashAccount1',
        cashAmount: '10000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(20000),
        cashAccount2: BigNumber(40000),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txCashWithdrawal2', '2000-01-05', {
        type: 'cashWithdrawal',
        cashAccountId: 'cashAccount1',
        cashAmount: '10000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(10000),
        cashAccount2: BigNumber(40000),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txCashWithdrawal2', '2000-01-06', {
        type: 'cashWithdrawal',
        cashAccountId: 'cashAccount2',
        cashAmount: '10000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(10000),
        cashAccount2: BigNumber(30000),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txCashTransfer1', '2000-01-07', {
        type: 'cashTransfer',
        fromCashAccountId: 'cashAccount2',
        toCashAccountId: 'cashAccount1',
        cashAmount: '10000',
        feeCashAmount: '1000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(20000),
        cashAccount2: BigNumber(19000),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount2: BigNumber(1000),
      },
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })
  })

  it('cashTransfer to same account', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txCashDeposit1', '2000-01-01', {
        type: 'cashDeposit',
        cashAccountId: 'cashAccount1',
        cashAmount: '10000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(10000),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txTransfer1', '2000-01-01', {
        type: 'cashTransfer',
        fromCashAccountId: 'cashAccount1',
        toCashAccountId: 'cashAccount1',
        cashAmount: '1000',
        feeCashAmount: '100',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(9900),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })
  })

  it('assetBuy / assetSell', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txAssetBuy1', '2001-01-01', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '10',
        cashAccountId: 'cashAccount1',
        cashAmount: '1000',
        feeCashAmount: '100',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txAssetBuy2', '2001-01-02', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount2',
        assetId: 'asset1',
        assetAmount: '20',
        cashAccountId: 'cashAccount2',
        cashAmount: '2000',
        feeCashAmount: '200',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
        cashAccount2: BigNumber(-2200),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(100),
        cashAccount2: BigNumber(200),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
        assetAccount2: {
          asset1: BigNumber(20),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
        assetAccount2: {
          asset1: BigNumber(2000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
        {
          type: 'open',
          accountId: 'assetAccount2',
          assetId: 'asset1',
          amount: BigNumber(20),
          openTransactionId: 'txAssetBuy2',
          openDate: '2001-01-02',
          openTime: '00:00:00',
          openPrice: BigNumber(2000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txAssetBuy3', '2001-01-03', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset2',
        assetAmount: '40',
        cashAccountId: 'cashAccount1',
        cashAmount: '4000',
        feeCashAmount: '400',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-5500),
        cashAccount2: BigNumber(-2200),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(500),
        cashAccount2: BigNumber(200),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
          asset2: BigNumber(40),
        },
        assetAccount2: {
          asset1: BigNumber(20),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
          asset2: BigNumber(4000),
        },
        assetAccount2: {
          asset1: BigNumber(2000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
        {
          type: 'open',
          accountId: 'assetAccount2',
          assetId: 'asset1',
          amount: BigNumber(20),
          openTransactionId: 'txAssetBuy2',
          openDate: '2001-01-02',
          openTime: '00:00:00',
          openPrice: BigNumber(2000),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset2',
          amount: BigNumber(40),
          openTransactionId: 'txAssetBuy3',
          openDate: '2001-01-03',
          openTime: '00:00:00',
          openPrice: BigNumber(4000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txAssetBuy4', '2001-01-04', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '80',
        cashAccountId: 'cashAccount1',
        cashAmount: '8000',
        feeCashAmount: '800',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-14300),
        cashAccount2: BigNumber(-2200),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(1300),
        cashAccount2: BigNumber(200),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(90),
          asset2: BigNumber(40),
        },
        assetAccount2: {
          asset1: BigNumber(20),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(9000),
          asset2: BigNumber(4000),
        },
        assetAccount2: {
          asset1: BigNumber(2000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
        {
          type: 'open',
          accountId: 'assetAccount2',
          assetId: 'asset1',
          amount: BigNumber(20),
          openTransactionId: 'txAssetBuy2',
          openDate: '2001-01-02',
          openTime: '00:00:00',
          openPrice: BigNumber(2000),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset2',
          amount: BigNumber(40),
          openTransactionId: 'txAssetBuy3',
          openDate: '2001-01-03',
          openTime: '00:00:00',
          openPrice: BigNumber(4000),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(80),
          openTransactionId: 'txAssetBuy4',
          openDate: '2001-01-04',
          openTime: '00:00:00',
          openPrice: BigNumber(8000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txAssetSell1', '2001-01-05', {
        type: 'assetSell',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '2',
        cashAccountId: 'cashAccount1',
        cashAmount: '2000',
        feeCashAmount: '200',
        taxCashAmount: '20',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-12520),
        cashAccount2: BigNumber(-2200),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(1500),
        cashAccount2: BigNumber(200),
      },
      accountCashTax: {
        cashAccount1: BigNumber(20),
      },
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(88),
          asset2: BigNumber(40),
        },
        assetAccount2: {
          asset1: BigNumber(20),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(8800),
          asset2: BigNumber(4000),
        },
        assetAccount2: {
          asset1: BigNumber(2000),
        },
      },
      accountAssetRealizedProfits: {
        assetAccount1: {
          asset1: BigNumber(1800),
        },
      },
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(8),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(800),
        },
        {
          type: 'open',
          accountId: 'assetAccount2',
          assetId: 'asset1',
          amount: BigNumber(20),
          openTransactionId: 'txAssetBuy2',
          openDate: '2001-01-02',
          openTime: '00:00:00',
          openPrice: BigNumber(2000),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset2',
          amount: BigNumber(40),
          openTransactionId: 'txAssetBuy3',
          openDate: '2001-01-03',
          openTime: '00:00:00',
          openPrice: BigNumber(4000),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(80),
          openTransactionId: 'txAssetBuy4',
          openDate: '2001-01-04',
          openTime: '00:00:00',
          openPrice: BigNumber(8000),
        },
      ],
      closedAssetPositions: [
        {
          type: 'closed',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(2),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(200),
          closeTransactionId: 'txAssetSell1',
          closeDate: '2001-01-05',
          closeTime: '00:00:00',
          closePrice: BigNumber(2000),
        },
      ],
    })

    txs.push(
      tx('txAssetSell2', '2001-01-06', {
        type: 'assetSell',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '20',
        cashAccountId: 'cashAccount1',
        cashAmount: '4000',
        feeCashAmount: '400',
        taxCashAmount: '40',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-8960),
        cashAccount2: BigNumber(-2200),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(1900),
        cashAccount2: BigNumber(200),
      },
      accountCashTax: {
        cashAccount1: BigNumber(60),
      },
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(68),
          asset2: BigNumber(40),
        },
        assetAccount2: {
          asset1: BigNumber(20),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(6800),
          asset2: BigNumber(4000),
        },
        assetAccount2: {
          asset1: BigNumber(2000),
        },
      },
      accountAssetRealizedProfits: {
        assetAccount1: {
          asset1: BigNumber(3800),
        },
      },
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount2',
          assetId: 'asset1',
          amount: BigNumber(20),
          openTransactionId: 'txAssetBuy2',
          openDate: '2001-01-02',
          openTime: '00:00:00',
          openPrice: BigNumber(2000),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset2',
          amount: BigNumber(40),
          openTransactionId: 'txAssetBuy3',
          openDate: '2001-01-03',
          openTime: '00:00:00',
          openPrice: BigNumber(4000),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(68),
          openTransactionId: 'txAssetBuy4',
          openDate: '2001-01-04',
          openTime: '00:00:00',
          openPrice: BigNumber(6800),
        },
      ],
      closedAssetPositions: [
        {
          type: 'closed',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(2),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(200),
          closeTransactionId: 'txAssetSell1',
          closeDate: '2001-01-05',
          closeTime: '00:00:00',
          closePrice: BigNumber(2000),
        },
        {
          type: 'closed',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(8),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(800),
          closeTransactionId: 'txAssetSell2',
          closeDate: '2001-01-06',
          closeTime: '00:00:00',
          closePrice: BigNumber(1600),
        },
        {
          type: 'closed',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(12),
          openTransactionId: 'txAssetBuy4',
          openDate: '2001-01-04',
          openTime: '00:00:00',
          openPrice: BigNumber(1200),
          closeTransactionId: 'txAssetSell2',
          closeDate: '2001-01-06',
          closeTime: '00:00:00',
          closePrice: BigNumber(2400),
        },
      ],
    })
  })

  it('assetTransfer', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txAssetBuy1', '2001-01-01', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '10',
        cashAccountId: 'cashAccount1',
        cashAmount: '1000',
        feeCashAmount: '100',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txTransfer1', '2001-01-02', {
        type: 'assetTransfer',
        fromAssetAccountId: 'assetAccount1',
        toAssetAccountId: 'assetAccount2',
        assetId: 'asset1',
        assetAmount: '2',
        feeAssetAmount: '2',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        assetAccount1: BigNumber(200),
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(6),
        },
        assetAccount2: {
          asset1: BigNumber(2),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(600),
        },
        assetAccount2: {
          asset1: BigNumber(200),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(6),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(600),
        },
        {
          type: 'open',
          accountId: 'assetAccount2',
          assetId: 'asset1',
          amount: BigNumber(2),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(200),
        },
      ],
      closedAssetPositions: [],
    })
  })

  it('assetTransfer to same account', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txAssetBuy1', '2001-01-01', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '10',
        cashAccountId: 'cashAccount1',
        cashAmount: '1000',
        feeCashAmount: '100',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txTransfer1', '2001-01-02', {
        type: 'assetTransfer',
        fromAssetAccountId: 'assetAccount1',
        toAssetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '2',
        feeAssetAmount: '2',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        assetAccount1: BigNumber(200),
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(8),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(800),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(8),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(800),
        },
      ],
      closedAssetPositions: [],
    })
  })

  it('assetDeposit / assetWithdrawal', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txAssetDeposit1', '2001-01-01', {
        type: 'assetDeposit',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '10',
        cashAmount: '1000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {},
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetDeposit1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txAssetDeposit2', '2001-01-02', {
        type: 'assetDeposit',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '20',
        cashAmount: '4000',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {},
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(30),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(5000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetDeposit1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(20),
          openTransactionId: 'txAssetDeposit2',
          openDate: '2001-01-02',
          openTime: '00:00:00',
          openPrice: BigNumber(4000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txAssetWithdrawal1', '2001-01-03', {
        type: 'assetWithdrawal',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '2',
        cashAmount: '60',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {},
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(28),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(4800),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(8),
          openTransactionId: 'txAssetDeposit1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(800),
        },
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(20),
          openTransactionId: 'txAssetDeposit2',
          openDate: '2001-01-02',
          openTime: '00:00:00',
          openPrice: BigNumber(4000),
        },
      ],
      closedAssetPositions: [],
    })

    txs.push(
      tx('txAssetWithdrawal2', '2001-01-04', {
        type: 'assetWithdrawal',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '12',
        cashAmount: '50',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {},
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(16),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(3200),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(16),
          openTransactionId: 'txAssetDeposit2',
          openDate: '2001-01-02',
          openTime: '00:00:00',
          openPrice: BigNumber(3200),
        },
      ],
      closedAssetPositions: [],
    })
  })

  it('interest', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txInterest1', '2001-01-01', {
        type: 'interest',
        cashAccountId: 'cashAccount1',
        cashAmount: '10',
        taxCashAmount: '1',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(9),
      },
      accountCashInterest: {
        cashAccount1: BigNumber(10),
      },
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {
        cashAccount1: BigNumber(1),
      },
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })
  })

  it('dividend', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txAssetBuy1', '2001-01-01', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '10',
        cashAccountId: 'cashAccount1',
        cashAmount: '1000',
        feeCashAmount: '100',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
      ],
      closedAssetPositions: [],
    })
    txs.push(
      tx('txDividend1', '2001-01-01', {
        type: 'dividend',
        cashAccountId: 'cashAccount1',
        cashAmount: '10',
        taxCashAmount: '1',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '10',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1091),
      },
      accountCashInterest: {},
      accountCashDividend: {
        cashAccount1: BigNumber(10),
      },
      accountCashFee: {
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {
        cashAccount1: BigNumber(1),
      },
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
      ],
      closedAssetPositions: [],
    })
  })

  it('fee', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txFee1', '2001-01-01', {
        type: 'fee',
        cashAccountId: 'cashAccount1',
        feeCashAmount: '1',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(1),
      },
      accountCashTax: {},
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })
  })

  it('tax', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txTax1', '2001-01-01', {
        type: 'tax',
        cashAccountId: 'cashAccount1',
        taxCashAmount: '1',
      })
    )
    expect(evaluateAll(txs).value).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {},
      accountCashTax: {
        cashAccount1: BigNumber(1),
      },
      accountAssetHoldings: {},
      accountAssetOpenPrices: {},
      accountAssetRealizedProfits: {},
      openAssetPositions: [],
      closedAssetPositions: [],
    })
  })

  it('quotes', () => {
    const txs: Transaction[] = []

    txs.push(
      tx('txAssetBuy1', '2001-01-01', {
        type: 'assetBuy',
        assetAccountId: 'assetAccount1',
        assetId: 'asset1',
        assetAmount: '10',
        cashAccountId: 'cashAccount1',
        cashAmount: '1000',
        feeCashAmount: '100',
      })
    )
    expect(
      evaluateAll(txs, {
        quotes: {
          asset1: undefined,
          asset2: BigNumber(10),
        },
      }).value
    ).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
      ],
      closedAssetPositions: [],
    })
    expect(
      evaluateAll(txs, {
        quotes: {
          asset1: BigNumber(10),
          asset2: undefined,
        },
      }).value
    ).toEqual<EvaluateAllValue>({
      accountCashHoldings: {
        cashAccount1: BigNumber(-1100),
      },
      accountCashInterest: {},
      accountCashDividend: {},
      accountCashFee: {
        cashAccount1: BigNumber(100),
      },
      accountCashTax: {},
      accountAssetHoldings: {
        assetAccount1: {
          asset1: BigNumber(10),
        },
      },
      accountAssetOpenPrices: {
        assetAccount1: {
          asset1: BigNumber(1000),
        },
      },
      accountAssetRealizedProfits: {},
      openAssetPositions: [
        {
          type: 'open',
          accountId: 'assetAccount1',
          assetId: 'asset1',
          amount: BigNumber(10),
          openTransactionId: 'txAssetBuy1',
          openDate: '2001-01-01',
          openTime: '00:00:00',
          openPrice: BigNumber(1000),
        },
      ],
      closedAssetPositions: [],
    })
  })
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
