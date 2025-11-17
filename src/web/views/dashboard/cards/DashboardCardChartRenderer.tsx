import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { DashboardCard } from '../../../../shared/models/Dashboard'
import { maxBy, minBy } from '../../../../shared/utils/array'
import { dateMinus, dateParse, datePlus, dateStartOf, DateUnit } from '../../../../shared/utils/date'
import { AutoSizer } from '../../../components/AutoSizer'
import { StockChart, StockChartViewport } from '../../../components/StockChart'
import { usePrivacy } from '../../../privacy'
import { chartSeriesAsCandle, chartViewSeries, ChartViewSeriesConfig } from '../../chart/series'

export const DashboardCardChartRenderer: React.FC<{
  card: Extract<DashboardCard, { type: 'chart' }>
  timetravel?: string
}> = ({ card, timetravel }) => {
  const config: ChartViewSeriesConfig = { type: card.config.type }
  const { data: baseSeries } = useSuspenseQuery({
    queryKey: ['dashboardCardChard', JSON.stringify(card), timetravel],
    queryFn: async () => {
      return await chartViewSeries('day', config).then(ss =>
        ss.map(s => chartSeriesAsCandle(s, card.config.resolution))
      )
    },
  })
  const series = [baseSeries[0]]
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
  const defaultViewPort = (resolution: DateUnit, range: DateUnit, rangeAmount: number): StockChartViewport => {
    const now = timetravel ? dateParse(timetravel) : new Date()
    const from = new Date(
      maxBy([dateMinus(now, range, rangeAmount), seriesTimestampMin], d => d.valueOf()) || Date.now()
    )
    return {
      scaleMode: 'linear',
      xAxisMinMax: [
        dateStartOf(from, resolution).valueOf(),
        datePlus(dateStartOf(now, resolution), resolution, 2).valueOf(),
      ],
    }
  }
  const viewport = defaultViewPort(card.config.resolution, card.config.range, card.config.rangeAmount)

  return (
    <div className={stylesChartWrapper}>
      <AutoSizer>
        {(width, height) => (
          <StockChart
            width={width}
            height={height}
            showGrid
            enableMouseOver
            showAxesInline
            privacy={privacy}
            series={series}
            viewport={viewport}
          />
        )}
      </AutoSizer>
    </div>
  )
}

const stylesChartWrapper = css`
  position: relative;
  min-height: 100px;
`
