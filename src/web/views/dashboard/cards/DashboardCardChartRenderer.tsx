import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { DashboardCard } from '../../../../shared/models/DashboardCard'
import { maxBy, minBy } from '../../../../shared/utils/array'
import { dateMinus, datePlus, dateStartOf, DateUnit } from '../../../../shared/utils/date'
import { AutoSizer } from '../../../components/AutoSizer'
import { StockChart, StockChartViewport } from '../../../components/StockChart'
import { usePrivacy } from '../../../privacy'
import { chartViewSeries, ChartViewSeriesConfig, isChartViewSeriesPrivate } from '../../chart/series'

export const DashboardCardChartRenderer: React.FC<{
  card: Extract<DashboardCard, { type: 'chart' }>
  timetravel?: string
}> = ({ card, timetravel }) => {
  const resolution: DateUnit = 'day'
  const config: ChartViewSeriesConfig = { type: 'total' }
  const { data: baseSeries } = useSuspenseQuery({
    queryKey: ['dashboardCardChard', JSON.stringify(card), timetravel, resolution],
    queryFn: async () => {
      return await chartViewSeries(resolution, config)
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
    <div className={stylesChartWrapper}>
      <AutoSizer>
        {(width, height) => (
          <StockChart
            width={width}
            height={height}
            showGrid
            enableMouseOver
            privacy={privacy && isChartViewSeriesPrivate(config)}
            series={series}
            viewport={viewport}
            onChangeViewport={setViewport}
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
