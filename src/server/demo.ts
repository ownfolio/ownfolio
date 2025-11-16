import BigNumber from 'bignumber.js'

import { Account } from '../shared/models/Account'
import { Asset } from '../shared/models/Asset'
import { currencies, CurrencySymbol } from '../shared/models/Currency'
import { Portfolio } from '../shared/models/Portfolio'
import { findClosest } from '../shared/utils/array'
import { dateEndOf, dateFormat, dateList, dateParse, DateUnit } from '../shared/utils/date'
import { evaluateBalances } from './balance'
import { Database } from './database'
import { updateAssetQuotes } from './quotes'

export async function generateDemoPortfolio(database: Database, userId: string): Promise<Portfolio> {
  const portfolio = await database.portfolios.create({
    userId,
    name: 'Demo',
    status: 'active',
  })
  const accountSavings = await database.accounts.create({
    currency: currencies.EUR.symbol,
    portfolioId: portfolio.id,
    name: 'Savings',
    number: '',
    status: 'active',
  })
  const accountStocks = await database.accounts.create({
    currency: currencies.EUR.symbol,
    portfolioId: portfolio.id,
    name: 'Stocks',
    number: '',
    status: 'active',
  })
  const accountCryptoEUR = await database.accounts.create({
    currency: currencies.EUR.symbol,
    portfolioId: portfolio.id,
    name: 'Crypto (EUR)',
    number: '',
    status: 'active',
  })
  const accountCrypto = await database.accounts.create({
    currency: currencies.EUR.symbol,
    portfolioId: portfolio.id,
    name: 'Crypto',
    number: '',
    status: 'active',
  })

  const cashAccumulationPlans: {
    startYear: number
    endYear?: number
    cashAccount: Account
    interval: DateUnit
    intervalCount: number
    cashAmount: BigNumber
  }[] = [
    {
      startYear: 2000,
      endYear: 2003,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(250),
    },
    {
      startYear: 2011,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(300),
    },
    {
      startYear: 2016,
      endYear: 2019,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(70),
    },
    {
      startYear: 2020,
      endYear: 2020,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(400),
    },
  ]

  const assetAccumulationPlans: {
    startYear: number
    endYear?: number
    sell?: boolean
    assetTemplate: Pick<Asset, 'name' | 'number' | 'symbol' | 'denomination' | 'quoteProvider' | 'currency'>
    assetAccount: Account
    cashAccount: Account
    interval: DateUnit
    intervalCount: number
    cashAmount: BigNumber
  }[] = [
    {
      startYear: 2000,
      endYear: 2003,
      sell: true,
      assetTemplate: {
        name: 'Volkswagen AG',
        number: '',
        symbol: 'VOW',
        denomination: 0,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'VOW.DE',
          pauseUntil: null,
        },
        currency: currencies.EUR.symbol,
      },
      assetAccount: accountStocks,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(250),
    },
    {
      startYear: 2011,
      assetTemplate: {
        name: 'iShares MSCI World',
        number: '',
        symbol: 'EUNL',
        denomination: 0,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'EUNL.DE',
          pauseUntil: null,
        },
        currency: currencies.EUR.symbol,
      },
      assetAccount: accountStocks,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(300),
    },
    {
      startYear: 2016,
      endYear: 2019,
      assetTemplate: {
        name: 'Apple Inc.',
        number: '',
        symbol: 'APC.DE',
        denomination: 0,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'AAPL',
          pauseUntil: null,
        },
        currency: currencies.EUR.symbol,
      },
      assetAccount: accountStocks,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(70),
    },
    {
      startYear: 2020,
      endYear: 2020,
      sell: true,
      assetTemplate: {
        name: 'Tesla Inc.',
        number: '',
        symbol: 'TL0.DE',
        denomination: 0,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'TSLA',
          pauseUntil: null,
        },
        currency: currencies.EUR.symbol,
      },
      assetAccount: accountStocks,
      cashAccount: accountSavings,
      interval: 'month',
      intervalCount: 1,
      cashAmount: BigNumber(400),
    },
    {
      startYear: 2018,
      assetTemplate: {
        name: 'Bitcoin',
        number: '',
        symbol: 'BTC',
        denomination: 8,
        quoteProvider: {
          type: 'yahooFinance',
          symbol: 'BTC-EUR',
          pauseUntil: null,
        },
        currency: currencies.EUR.symbol,
      },
      assetAccount: accountCrypto,
      cashAccount: accountCryptoEUR,
      interval: 'week',
      intervalCount: 1,
      cashAmount: BigNumber(10),
    },
  ]

  for (let i = 0; i < cashAccumulationPlans.length; i++) {
    const cashAccumulationPlan = cashAccumulationPlans[i]
    const cashAccount = cashAccumulationPlan.cashAccount
    const cashAccountCurrency = currencies[cashAccount.currency as CurrencySymbol]
    const now = new Date()
    const dates = dateList(
      dateParse(`${cashAccumulationPlan.startYear}-01-01`),
      cashAccumulationPlan.endYear ? dateEndOf(dateParse(`${cashAccumulationPlan.endYear}-01-01`), 'year') : now,
      cashAccumulationPlan.interval,
      cashAccumulationPlan.intervalCount
    )
    for (let j = 0; j < dates.length; j++) {
      const date = dates[j]
      await database.transactions.create({
        userId: portfolio.userId,
        date: dateFormat(date, 'yyyy-MM-dd'),
        time: '00:00:00',
        data: {
          type: 'cashDeposit',
          cashAccountId: cashAccumulationPlan.cashAccount.id,
          cashAmount: cashAccumulationPlan.cashAmount.decimalPlaces(cashAccountCurrency.denomination),
        },
        reference: '',
        comment: '',
      })
    }
  }
  for (let i = 0; i < assetAccumulationPlans.length; i++) {
    const assetAccumulationPlan = assetAccumulationPlans[i]
    const assetCurrency = currencies[assetAccumulationPlan.assetTemplate.currency as CurrencySymbol]
    const asset = await database.assets.create({
      ...assetAccumulationPlan.assetTemplate,
      userId: portfolio.userId,
      status: 'active',
    })
    await updateAssetQuotes(database, asset)
    const assetQuotes = await database.quotes.listByAssetId(asset.id)
    const now = new Date()
    const dates = dateList(
      dateParse(`${assetAccumulationPlan.startYear}-01-01`),
      assetAccumulationPlan.endYear ? dateEndOf(dateParse(`${assetAccumulationPlan.endYear}-01-01`), 'year') : now,
      assetAccumulationPlan.interval,
      assetAccumulationPlan.intervalCount
    )
    for (let j = 0; j < dates.length; j++) {
      const date = dates[j]
      const closestQuote = findClosest(assetQuotes, quote => Math.abs(dateParse(quote.date).valueOf() - date.valueOf()))
      if (closestQuote) {
        if (j < dates.length - 1 || !assetAccumulationPlan.sell) {
          const affordableAssetAmount = BigNumber(assetAccumulationPlan.cashAmount)
            .dividedBy(closestQuote.close)
            .decimalPlaces(asset.denomination, 1)
          if (affordableAssetAmount.gt(0)) {
            const cashAmount = affordableAssetAmount
              .multipliedBy(closestQuote.close)
              .decimalPlaces(assetCurrency.denomination)
            await database.transactions.create({
              userId: portfolio.userId,
              date: dateFormat(date, 'yyyy-MM-dd'),
              time: '00:00:00',
              data: {
                type: 'cashDeposit',
                cashAccountId: assetAccumulationPlan.cashAccount.id,
                cashAmount: cashAmount,
              },
              reference: '',
              comment: '',
            })
            await database.transactions.create({
              userId: portfolio.userId,
              date: dateFormat(date, 'yyyy-MM-dd'),
              time: '09:00:00',
              data: {
                type: 'assetBuy',
                assetAccountId: assetAccumulationPlan.assetAccount.id,
                assetId: asset.id,
                assetAmount: affordableAssetAmount,
                cashAccountId: assetAccumulationPlan.cashAccount.id,
                cashAmount: cashAmount,
                feeCashAmount: BigNumber('0'),
              },
              reference: '',
              comment: '',
            })
          }
        } else {
          const availableAssetAmount = await evaluateBalances(
            [dateFormat(date, 'yyyy-MM-dd')],
            await database.transactions.listByUserId(portfolio.userId, {}, 'asc')
          )[0]
            .assetPositions.open.filter(
              p => p.accountId === assetAccumulationPlan.assetAccount.id && p.assetId === asset.id
            )
            .reduce((sum, p) => sum.plus(p.amount), BigNumber(0))
          const cashAmount = availableAssetAmount
            .multipliedBy(closestQuote.close)
            .decimalPlaces(assetCurrency.denomination)
          await database.transactions.create({
            userId: portfolio.userId,
            date: dateFormat(date, 'yyyy-MM-dd'),
            time: '18:00:00',
            data: {
              type: 'assetSell',
              assetAccountId: assetAccumulationPlan.assetAccount.id,
              assetId: asset.id,
              assetAmount: availableAssetAmount,
              cashAccountId: assetAccumulationPlan.cashAccount.id,
              cashAmount: cashAmount,
              feeCashAmount: BigNumber('0'),
              taxCashAmount: BigNumber('0'),
            },
            reference: '',
            comment: '',
          })
        }
      }
    }
  }
  return portfolio
}
