import axios from 'axios'
import BigNumber from 'bignumber.js'
import { XMLParser } from 'fast-xml-parser'

type EuroExchangeXmlFormat = {
  'gesmes:Envelope': {
    Cube: {
      Cube: {
        '@_time': string
        Cube: {
          '@_currency': string
          '@_rate': string
        }[]
      }[]
    }
  }
}

export type EuroExchangeDateResult = { [currency: string]: BigNumber | undefined }
export type EuroExchangeResult = { [date: string]: EuroExchangeDateResult | undefined }

export const euroExchangeRatesAxios = axios.create()

export async function fetchEuroExchangeRates(): Promise<EuroExchangeResult> {
  const baseURL = 'https://www.ecb.europa.eu'
  const resHtml = await euroExchangeRatesAxios.get(
    '/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
    {
      baseURL,
    }
  )
  const match = resHtml.data.match(/href="(\/stats\/eurofxref\/eurofxref-hist\.xml\?[0-9a-f]+)"/)

  if (!match) {
    throw new Error(`Response did not contain a valid XML href`)
  }

  const resXml = await euroExchangeRatesAxios.get(match[1], {
    baseURL,
  })
  const resXmlParser = new XMLParser({ ignoreAttributes: false })
  const resXmlResult = resXmlParser.parse(resXml.data) as EuroExchangeXmlFormat

  const result: EuroExchangeResult = {}
  resXmlResult['gesmes:Envelope'].Cube.Cube.forEach(elem => {
    const dateResult: EuroExchangeDateResult = {}
    elem.Cube.forEach(elem2 => {
      dateResult[elem2['@_currency']] = BigNumber(elem2['@_rate'])
    })
    result[elem['@_time']] = dateResult
  })
  return result
}
