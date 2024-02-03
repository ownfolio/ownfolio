import { Asset } from '../../shared/models/Asset'
import { Quote } from '../../shared/models/Quote'
import { Database } from '../database'
import { fetchYahooFinanceQuotes } from './yahooFinance'

export async function updateAssetQuotes(database: Database, asset: Asset): Promise<boolean> {
  if (asset.quoteProvider) {
    switch (asset.quoteProvider.type) {
      case 'yahooFinance': {
        if (
          !asset.quoteProvider.pauseUntil ||
          new Date(asset.quoteProvider.pauseUntil).valueOf() <= new Date().valueOf()
        ) {
          const rawQuotes = await fetchYahooFinanceQuotes(asset.quoteProvider.symbol)
          const quotes = Object.keys(rawQuotes).map<Quote>(date => {
            const rawQuote = rawQuotes[date]!
            return {
              assetId: asset.id,
              date,
              open: rawQuote.open ? rawQuote.open.toString() : null,
              high: rawQuote.high ? rawQuote.high.toString() : null,
              low: rawQuote.low ? rawQuote.low.toString() : null,
              close: rawQuote.close.toString(),
            }
          })
          await database.quotes.createOrUpdate(...quotes)
          await database.assets.updateQuoteProvider(asset.id, {
            ...asset.quoteProvider,
            pauseUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          })
          return true
        }
      }
    }
  }
  return false
}
