import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { DashboardCardChart } from '../../../../shared/models/Dashboard'
import { maxBy, minBy } from '../../../../shared/utils/array'
import { dateMinus, dateParse, datePlus, dateStartOf, DateUnit } from '../../../../shared/utils/date'
import { AutoSizer } from '../../../components/AutoSizer'
import { Input } from '../../../components/Input'
import { Label } from '../../../components/Label'
import { Select } from '../../../components/Select'
import { SelectDateUnit } from '../../../components/SelectDateUnit'
import { StockChart, StockChartViewport } from '../../../components/StockChart'
import { usePrivacy } from '../../../privacy'
import { chartSeriesAsCandle, chartViewSeries, ChartViewSeriesConfig } from '../../chart/series'
import type { DashboardCardFieldsProps, DashboardCardRendererProps } from './index'

export const DashboardCardChartRenderer: React.FC<DashboardCardRendererProps<DashboardCardChart>> = ({
  card,
  timetravel,
}) => {
  const config: ChartViewSeriesConfig = { type: card.config.type }
  const { data: baseSeries } = useSuspenseQuery({
    queryKey: ['dashboardCardChart', JSON.stringify(card), timetravel],
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

type SelectDashboardCardChartTypeProps = React.DetailedHTMLProps<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
> & {
  emptyLabel?: string
  clearable?: boolean
}

const SelectDashboardCardChartConfigType = React.forwardRef<HTMLSelectElement, SelectDashboardCardChartTypeProps>(
  ({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
    const selectProps = React.useMemo(() => {
      return {
        optionGroups: [
          {
            id: 'all',
            label: 'Chart type',
            options: [
              {
                value: 'total',
                label: 'Total',
              },
              {
                value: 'profit',
                label: 'Profit',
              },
            ] satisfies { value: DashboardCardChart['config']['type']; label: string }[],
          },
        ],
        emptyLabel,
        clearable,
      }
    }, [])
    return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
  }
)

export const DashboardCardChartFields: React.FC<DashboardCardFieldsProps<DashboardCardChart>> = ({
  value,
  onChange,
}) => {
  return (
    <>
      <Label text="Chart type">
        <SelectDashboardCardChartConfigType
          value={value.config.type}
          onChange={event =>
            onChange({
              ...value,
              config: createEmptyDashboardCardChartConfig(event.target.value as DashboardCardChart['config']['type']),
            })
          }
        />
      </Label>
      <DashboardCardChartConfigFields value={value.config} onChange={config => onChange({ ...value, config })} />
    </>
  )
}

const DashboardCardChartConfigFields: React.FC<DashboardCardFieldsProps<DashboardCardChart['config']>> = ({
  value,
  onChange,
}) => {
  switch (value.type) {
    case 'total':
    case 'profit':
      return (
        <>
          <Label text="Resolution">
            <SelectDateUnit
              value={value.resolution}
              onChange={event => onChange({ ...value, resolution: event.target.value as DateUnit })}
            />
          </Label>
          <Label text="Range">
            <SelectDateUnit
              value={value.range}
              onChange={event => onChange({ ...value, range: event.target.value as DateUnit })}
            />
          </Label>
          <Label text="Range amount">
            <Input
              type="number"
              min={1}
              value={value.rangeAmount}
              onChange={event => onChange({ ...value, rangeAmount: event.target.valueAsNumber })}
            />
          </Label>
        </>
      )
  }
}

function createEmptyDashboardCardChartConfig(type: DashboardCardChart['config']['type']): DashboardCardChart['config'] {
  switch (type) {
    case 'total':
      return {
        type: 'total',
        resolution: 'week',
        range: 'year',
        rangeAmount: 1,
      }
    case 'profit':
      return {
        type: 'profit',
        resolution: 'week',
        range: 'year',
        rangeAmount: 1,
      }
  }
}

const stylesChartWrapper = css`
  position: relative;
  min-height: 300px;
`
