import { css } from '@linaria/core'
import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { FaCheck } from 'react-icons/fa6'
import { useParams } from 'react-router-dom'

import { maxBy, minBy } from '../../../shared/utils/array'
import { dateEndOf, dateMinus, datePlus, dateStartOf, DateUnit, dateUnitSchema } from '../../../shared/utils/date'
import { AutoSizer } from '../../components/AutoSizer'
import { BottomBar } from '../../components/BottomBar'
import { Menu } from '../../components/Menu'
import { StockChart, StockChartSeries, StockChartViewport } from '../../components/StockChart'
import { usePersistentState } from '../../hooks/usePersistentState'
import { usePrivacy } from '../../privacy'
import { chartViewSeries, ChartViewSeriesConfig, isChartViewSeriesPrivate } from './series'
import { chartViewTool, ChartViewToolConfig } from './tools'
import { isSimpleMovingAverageToolConfig } from './tools/simpleMovingAverage'

type ChartParams = { type: 'total'; id?: string } | { type: 'asset'; id: string }

export const ChartView: React.FC = () => {
  const params = useParams() as ChartParams
  const [config] = React.useState<ChartViewSeriesConfig>(
    ((): ChartViewSeriesConfig => {
      switch (params.type) {
        case 'total':
          return { type: 'total', portfolioId: params.id }
        case 'asset':
          return { type: 'asset', assetId: params.id }
      }
    })()
  )
  const [tools, setTools] = React.useState<ChartViewToolConfig[]>([{ type: 'simpleMovingAverage', range: 30 }])
  const [resolution, setResolution] = usePersistentState<DateUnit>('chartView.resolution', dateUnitSchema, 'week')
  const { privacy } = usePrivacy()

  const mainSeries = useQuery<StockChartSeries[]>(['chartView', JSON.stringify(config), resolution], async () => {
    return await chartViewSeries(resolution, config)
  }).data!
  const toolSeries = React.useMemo<StockChartSeries[]>(() => {
    return mainSeries.length > 0 ? tools.map(toolConfig => chartViewTool(mainSeries[0], toolConfig)) : []
  }, [mainSeries, tools])
  const series = React.useMemo<StockChartSeries[]>(() => [...mainSeries, ...toolSeries], [mainSeries, toolSeries])

  const seriesTimestampMin = React.useMemo(
    () =>
      minBy<number>(
        series.flatMap(s => {
          switch (s.type) {
            case 'point':
              return s.points.map(p => p.timestamp)
            case 'line':
              return s.points.map(p => p.timestamp)
              throw new Error()
            case 'candle':
              return s.points.map(p => p.openTimestamp)
          }
        }),
        d => d.valueOf()
      ) || Date.now(),
    [series]
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
              series={series}
              viewport={viewport}
              onChangeViewport={setViewport}
            />
          )}
        </AutoSizer>
      </div>
      <BottomBar className={stylesToolbar}>
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
        <ResolutionMenu resolution={resolution} setResolution={setResolution} />
        <ToolMenu tools={tools} setTools={setTools} />
      </BottomBar>
    </div>
  )
}

const ResolutionMenu: React.FC<{ resolution: DateUnit; setResolution: (tools: DateUnit) => void }> = ({
  resolution,
  setResolution,
}) => {
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

const ToolMenu: React.FC<{ tools: ChartViewToolConfig[]; setTools: (tools: ChartViewToolConfig[]) => void }> = ({
  tools,
  setTools,
}) => {
  return (
    <Menu
      items={[
        ...[30, 60, 90].map(range => ({
          label: `SMA ${range}`,
          icon: tools.find(c => isSimpleMovingAverageToolConfig(c, range)) ? <FaCheck /> : <div />,
          onClick: () => {
            if (!tools.find(c => isSimpleMovingAverageToolConfig(c, range))) {
              setTools([...tools, { type: 'simpleMovingAverage', range: range }])
            } else {
              setTools(tools.filter(c => !isSimpleMovingAverageToolConfig(c, range)))
            }
          },
        })),
      ]}
      verticalAlignment="top"
    >
      <a href="#" className={stylesTool}>
        Tools
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
