import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'
import { FaCheck } from 'react-icons/fa6'
import { useParams } from 'react-router-dom'
import { z } from 'zod'

import { maxBy, minBy } from '../../../shared/utils/array'
import { dateEndOf, dateMinus, datePlus, dateStartOf, DateUnit, dateUnitSchema } from '../../../shared/utils/date'
import { AutoSizer } from '../../components/AutoSizer'
import { BottomBar } from '../../components/BottomBar'
import { Menu } from '../../components/Menu'
import { StockChart, StockChartSeries, StockChartViewport } from '../../components/StockChart'
import { usePersistentState } from '../../hooks/usePersistentState'
import { usePrivacy } from '../../privacy'
import { chartViewSeries, ChartViewSeriesConfig, isChartViewSeriesPrivate } from './series'
import { chartViewTool } from './tools'

type ChartParams = { type: 'total'; id?: string } | { type: 'profit'; id?: string } | { type: 'asset'; id: string }

export const ChartView: React.FC = () => {
  const params = useParams() as ChartParams
  const [key, config] = React.useMemo<[string, ChartViewSeriesConfig]>(() => {
    switch (params.type) {
      case 'total':
        return [`total-${params.id || 'all'}`, { type: 'total', portfolioId: params.id }]
      case 'profit':
        return [`profit-${params.id || 'all'}`, { type: 'profit', portfolioId: params.id }]
      case 'asset':
        return [`asset-${params.id}`, { type: 'asset', assetId: params.id }]
      default:
        throw new Error('Unsupported chart type')
    }
  }, [params])
  const [resolution, setResolution] = usePersistentState<DateUnit>('chartView.resolution', dateUnitSchema, 'week')
  const { data: baseSeries } = useSuspenseQuery({
    queryKey: ['chartView', JSON.stringify(config), resolution],
    queryFn: async () => {
      return await chartViewSeries(resolution, config)
    },
  })
  const series = React.useMemo<StockChartSeries[]>(() => {
    return baseSeries.flatMap(series => {
      if (['line', 'candle'].includes(series.type)) {
        return [series, ...[30, 60, 90].map(range => chartViewTool(series, { type: 'simpleMovingAverage', range }))]
      } else {
        return [series]
      }
    })
  }, [baseSeries])
  const seriesTimestampMin = React.useMemo(
    () =>
      minBy<number>(
        series.flatMap(s => {
          switch (s.type) {
            case 'point':
              return s.points.map(p => p.timestamp)
            case 'line':
              return s.points.map(p => p.timestamp)
            case 'candle':
              return s.points.map(p => p.openTimestamp)
          }
        }),
        d => d.valueOf()
      ) || Date.now(),
    [series]
  )

  const { privacy } = usePrivacy()
  const [enabledSeries, setEnabledSeries] = usePersistentState<string[]>(
    `chartView.${key}.series`,
    z.array(z.string()),
    baseSeries.map(s => s.id)
  )
  const defaultViewPort = (dateUnit: DateUnit): StockChartViewport => {
    const now = new Date()
    const from = new Date(maxBy([dateMinus(now, dateUnit, 300), seriesTimestampMin], d => d.valueOf()) || Date.now())
    return {
      scaleMode: 'linear',
      xAxisMinMax: [dateStartOf(from, dateUnit).valueOf(), datePlus(dateStartOf(now, dateUnit), dateUnit, 2).valueOf()],
    }
  }

  const [viewport, setViewport] = React.useState<StockChartViewport>(defaultViewPort(resolution))

  return (
    <div className={stylesRoot}>
      <div className={stylesChartWrapper}>
        <AutoSizer>
          {(width, height) => (
            <StockChart
              width={width}
              height={height}
              showAxes
              showGrid
              showLabels
              showCurrentValues
              enableMouseOver
              enablePanAndZoom
              privacy={privacy && isChartViewSeriesPrivate(config)}
              series={series.filter(s => enabledSeries.includes(s.id))}
              viewport={viewport}
              onChangeViewport={setViewport}
            />
          )}
        </AutoSizer>
      </div>
      <BottomBar className={stylesToolbar}>
        <SeriesMenu series={series} enabledSeries={enabledSeries} setEnabledSeries={setEnabledSeries} />
        <RangeMenu setViewport={setViewport} resolution={resolution} seriesTimestampMin={seriesTimestampMin} />
        <ResolutionMenu resolution={resolution} setResolution={setResolution} />
      </BottomBar>
    </div>
  )
}

const SeriesMenu: React.FC<{
  series: StockChartSeries[]
  enabledSeries: string[]
  setEnabledSeries: React.Dispatch<React.SetStateAction<string[]>>
}> = ({ series, enabledSeries, setEnabledSeries }) => {
  return (
    <Menu
      items={series.map(series => {
        return {
          label: series.label,
          icon: enabledSeries.includes(series.id) ? <FaCheck /> : <div />,
          onClick: () => {
            setEnabledSeries(enabledSeries => {
              return !enabledSeries.includes(series.id)
                ? [...enabledSeries, series.id]
                : enabledSeries.filter(id => id !== series.id)
            })
          },
        }
      })}
      verticalAlignment="top"
    >
      <a href="#" className={stylesTool}>
        Series
      </a>
    </Menu>
  )
}

const RangeMenu: React.FC<{
  setViewport: React.Dispatch<React.SetStateAction<StockChartViewport>>
  resolution: DateUnit
  seriesTimestampMin: number
}> = ({ setViewport, resolution, seriesTimestampMin }) => {
  return (
    <Menu
      items={[
        {
          label: '1 month',
          onClick: () => {
            setViewport(viewport => ({
              ...viewport,
              xAxisMinMax: [
                dateStartOf(dateMinus(new Date(), 'month', 1), resolution).valueOf(),
                dateEndOf(new Date(), resolution).valueOf(),
              ],
              yAxisMinMax: undefined,
            }))
          },
        },
        {
          label: '1 year',
          onClick: () => {
            setViewport(viewport => ({
              ...viewport,
              xAxisMinMax: [
                dateStartOf(dateMinus(new Date(), 'year', 1), resolution).valueOf(),
                dateEndOf(new Date(), resolution).valueOf(),
              ],
              yAxisMinMax: undefined,
            }))
          },
        },
        {
          label: '2 years',
          onClick: () => {
            setViewport(viewport => ({
              ...viewport,
              xAxisMinMax: [
                dateStartOf(dateMinus(new Date(), 'year', 2), resolution).valueOf(),
                dateEndOf(new Date(), resolution).valueOf(),
              ],
              yAxisMinMax: undefined,
            }))
          },
        },
        {
          label: '3 years',
          onClick: () => {
            setViewport(viewport => ({
              ...viewport,
              xAxisMinMax: [
                dateStartOf(dateMinus(new Date(), 'year', 3), resolution).valueOf(),
                dateEndOf(new Date(), resolution).valueOf(),
              ],
              yAxisMinMax: undefined,
            }))
          },
        },
        {
          label: '5 years',
          onClick: () => {
            setViewport(viewport => ({
              ...viewport,
              xAxisMinMax: [
                dateStartOf(dateMinus(new Date(), 'year', 5), resolution).valueOf(),
                dateEndOf(new Date(), resolution).valueOf(),
              ],
              yAxisMinMax: undefined,
            }))
          },
        },
        {
          label: 'all',
          onClick: () => {
            setViewport(viewport => ({
              ...viewport,
              xAxisMinMax: [
                dateStartOf(new Date(seriesTimestampMin), resolution).valueOf(),
                dateEndOf(new Date(), resolution).valueOf(),
              ],
              yAxisMinMax: undefined,
            }))
          },
        },
      ]}
      verticalAlignment="top"
    >
      <a href="#" className={stylesTool}>
        Range
      </a>
    </Menu>
  )
}

const ResolutionMenu: React.FC<{
  resolution: DateUnit
  setResolution: React.Dispatch<React.SetStateAction<DateUnit>>
}> = ({ resolution, setResolution }) => {
  return (
    <Menu
      items={[
        {
          label: 'Daily',
          icon: resolution === 'day' ? <FaCheck /> : <div />,
          onClick: () => setResolution('day'),
        },
        {
          label: 'Weekly',
          icon: resolution === 'week' ? <FaCheck /> : <div />,
          onClick: () => setResolution('week'),
        },
        {
          label: 'Monthly',
          icon: resolution === 'month' ? <FaCheck /> : <div />,
          onClick: () => setResolution('month'),
        },
        {
          label: 'Yearly',
          icon: resolution === 'year' ? <FaCheck /> : <div />,
          onClick: () => setResolution('year'),
        },
      ]}
      verticalAlignment="top"
    >
      <a href="#" className={stylesTool}>
        Resolution
      </a>
    </Menu>
  )
}

const stylesRoot = css`
  display: grid;
  grid-template-rows: 1fr auto;
`

const stylesChartWrapper = css`
  position: relative;
`

const stylesToolbar = css`
  display: flex;
  align-items: center;
`

const stylesTool = css`
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
`
