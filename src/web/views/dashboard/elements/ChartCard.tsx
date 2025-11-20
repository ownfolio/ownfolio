import { css } from '@linaria/core'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'

import { DashboardElementChartCard } from '../../../../shared/models/Dashboard'
import { maxBy, minBy } from '../../../../shared/utils/array'
import { dateMinus, dateParse, datePlus, dateStartOf, DateUnit } from '../../../../shared/utils/date'
import { AutoSizer } from '../../../components/AutoSizer'
import { Card } from '../../../components/Card'
import { Input } from '../../../components/Input'
import { Label } from '../../../components/Label'
import { Select } from '../../../components/Select'
import { SelectAsset } from '../../../components/SelectAsset'
import { SelectDateUnit } from '../../../components/SelectDateUnit'
import { StockChart, StockChartViewport } from '../../../components/StockChart'
import { usePrivacy } from '../../../privacy'
import { chartSeriesAsCandle, chartViewSeries, ChartViewSeriesConfig } from '../../chart/series'
import type { DashboardElementFieldsRendererProps, DashboardElementRendererProps } from './index'

export const ChartCardRenderer: React.FC<DashboardElementRendererProps<DashboardElementChartCard>> = ({
  element,
  timetravel,
}) => {
  const config: ChartViewSeriesConfig = element.config
  const { data: baseSeries } = useSuspenseQuery({
    queryKey: ['dashboardElementChartCard', JSON.stringify(element), timetravel],
    queryFn: async () => {
      return await chartViewSeries('day', config).then(ss =>
        ss.map(s => chartSeriesAsCandle(s, element.config.resolution))
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
  const viewport = defaultViewPort(element.config.resolution, element.config.range, element.config.rangeAmount)

  return (
    <Card>
      <div className={stylesChartWrapper}>
        <AutoSizer>
          {(width, height) => (
            <StockChart
              width={width}
              height={height}
              showGrid
              enableMouseOver
              privacy={privacy}
              series={series}
              viewport={viewport}
              showLabels={!element.hideTitle}
              showAxesInline={!element.hideAxis}
            />
          )}
        </AutoSizer>
      </div>
    </Card>
  )
}

type SelectDashboardElementChartCardConfigTypeProps = React.DetailedHTMLProps<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
> & {
  emptyLabel?: string
  clearable?: boolean
}

const SelectDashboardElementChartCardConfigType = React.forwardRef<
  HTMLSelectElement,
  SelectDashboardElementChartCardConfigTypeProps
>(({ value, onChange, emptyLabel = '-', clearable, className, ...other }, ref: any) => {
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
            {
              value: 'asset',
              label: 'Asset',
            },
          ] satisfies { value: DashboardElementChartCard['config']['type']; label: string }[],
        },
      ],
      emptyLabel,
      clearable,
    }
  }, [])
  return <Select ref={ref} {...other} value={value} onChange={onChange} {...selectProps} />
})

export const ChartCardFieldsRenderer: React.FC<DashboardElementFieldsRendererProps<DashboardElementChartCard>> = ({
  element,
  onChangeElement,
}) => {
  return (
    <>
      <Label text="Chart type" htmlFor="type">
        <SelectDashboardElementChartCardConfigType
          id="type"
          value={element.config.type}
          onChange={event =>
            onChangeElement({
              ...element,
              config: createEmptyDashboardElementChartCardConfig(
                event.target.value as DashboardElementChartCard['config']['type']
              ),
            })
          }
        />
      </Label>
      <Label text="Hide title" htmlFor="hideTitle" position="right">
        <Input
          id="hideTitle"
          type="checkbox"
          checked={element.hideTitle}
          onChange={event => onChangeElement({ ...element, hideTitle: event.target.checked })}
        />
      </Label>
      <Label text="Hide axis" htmlFor="hideAxis" position="right">
        <Input
          id="hideAxis"
          type="checkbox"
          checked={element.hideAxis}
          onChange={event => onChangeElement({ ...element, hideAxis: event.target.checked })}
        />
      </Label>
      <ChartCardFieldsConfigRenderer
        config={element.config}
        onConfigChange={nextConfig => onChangeElement({ ...element, config: nextConfig })}
      />
    </>
  )
}

const ChartCardFieldsConfigRenderer: React.FC<{
  config: DashboardElementChartCard['config']
  onConfigChange: (config: DashboardElementChartCard['config']) => Promise<void> | void
}> = ({ config, onConfigChange }) => {
  switch (config.type) {
    case 'total':
    case 'profit':
      return (
        <>
          <Label text="Resolution" htmlFor="resolution">
            <SelectDateUnit
              id="resolution"
              value={config.resolution}
              onChange={event => onConfigChange({ ...config, resolution: event.target.value as DateUnit })}
              required
            />
          </Label>
          <Label text="Range" htmlFor="range">
            <SelectDateUnit
              id="range"
              value={config.range}
              onChange={event => onConfigChange({ ...config, range: event.target.value as DateUnit })}
              required
            />
          </Label>
          <Label text="Range amount" htmlFor="rangeAmount">
            <Input
              id="rangeAmount"
              type="number"
              min={1}
              value={config.rangeAmount}
              onChange={event => onConfigChange({ ...config, rangeAmount: event.target.valueAsNumber })}
              required
            />
          </Label>
        </>
      )
    case 'asset':
      return (
        <>
          <Label text="Asset" htmlFor="assetId">
            <SelectAsset
              value={config.assetId}
              onChange={event => onConfigChange({ ...config, assetId: event.target.value })}
              required
            />
          </Label>
          <Label text="Resolution" htmlFor="resolution">
            <SelectDateUnit
              id="resolution"
              value={config.resolution}
              onChange={event => onConfigChange({ ...config, resolution: event.target.value as DateUnit })}
              required
            />
          </Label>
          <Label text="Range" htmlFor="range">
            <SelectDateUnit
              id="range"
              value={config.range}
              onChange={event => onConfigChange({ ...config, range: event.target.value as DateUnit })}
              required
            />
          </Label>
          <Label text="Range amount" htmlFor="rangeAmount">
            <Input
              id="rangeAmount"
              type="number"
              min={1}
              value={config.rangeAmount}
              onChange={event => onConfigChange({ ...config, rangeAmount: event.target.valueAsNumber })}
              required
            />
          </Label>
        </>
      )
  }
}

function createEmptyDashboardElementChartCardConfig(
  type: DashboardElementChartCard['config']['type']
): DashboardElementChartCard['config'] {
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
    case 'asset':
      return {
        type: 'asset',
        assetId: '',
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
