import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import fs from 'fs/promises'

export interface AxiosMock {
  data: AxiosResponse[]
  save: () => Promise<void>
}

export async function applyAxiosMock(instance: AxiosInstance, dataFile: string): Promise<AxiosMock> {
  const update = process.env.TEST_UPDATE_MOCK_DATA === '1'
  const data: AxiosMock['data'] = !update ? await fs.readFile(dataFile, 'utf-8').then(JSON.parse) : []

  if (update) {
    instance.interceptors.response.use(async res => {
      data.push({
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        config: res.config,
        data: res.data,
      })
      return res
    })
  } else {
    instance.interceptors.response.use(
      res => res,
      async err => {
        if (err instanceof AxiosMockError) {
          const mock = data.find(
            res =>
              res.config.method === err.config.method &&
              res.config.baseURL === err.config.baseURL &&
              res.config.url === err.config.url
          )
          if (mock) {
            return mock
          }
          throw new AxiosMockError(`No mocked data for`, err.config)
        }
        throw err
      }
    )
    instance.interceptors.request.use(async config => {
      throw new AxiosMockError('Hand over to response interceptor', config)
    })
  }

  return {
    data,
    save: async () => {
      if (update) {
        await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8')
      }
    },
  }
}

export class AxiosMockError extends Error {
  readonly config: AxiosRequestConfig

  constructor(message: string, config: AxiosRequestConfig) {
    super(message)
    this.config = config
  }
}

// async function updateMockData(): Promise<void> {
//   const symbols = ['VOW.DE', 'EUNL.DE', 'APC.DE', 'TL0.DE', 'BTC-EUR']
//   const mockData = await symbols.reduce<Promise<{ [symbol: string]: string }>>(async (accP, symbol) => {
//     console.log(`Fetch ${symbol}`)
//     const acc = await accP
//     const baseURL = 'https://query1.finance.yahoo.com'
//     const res = await axios.get<string>(`/v7/finance/download/${symbol}`, {
//       baseURL: baseURL,
//       params: {
//         period1: 0,
//         period2: Math.floor(Date.now() / 1000),
//         interval: '1d',
//         events: 'history',
//       },
//     })
//     return {
//       ...acc,
//       [symbol]: res.data,
//     }
//   }, Promise.resolve({}))
//   await fs.writeFile(mockDataPath, JSON.stringify(mockData, null, 2), 'utf-8')
// }
