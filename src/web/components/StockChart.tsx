import { css } from '@linaria/core'
import * as d3Color from 'd3-color'
import * as d3Scale from 'd3-scale'
import React from 'react'

import { selectionSortBy } from '../../shared/utils/array'
import {
  dateFormat,
  dateGet,
  dateMinus,
  datePlus,
  dateSet,
  dateStartOf,
  DateUnitWithoutWeek,
} from '../../shared/utils/date'
import { useHover } from '../hooks/useHover'
import { usePanPinch } from '../hooks/usePanPinch'
import { Canvas } from './Canvas'

export interface StockChartSeriesPoint {
  timestamp: number
  value: number | undefined
}

export interface StockChartSeriesOHLCPoint {
  openTimestamp: number
  closeTimestamp: number
  open: number
  high: number
  low: number
  close: number
}

export interface StockChartSeriesBase {
  label: string
  priority?: number
}

export interface StockChartLineSeries extends StockChartSeriesBase {
  type: 'line'
  lineWidth?: number
  color: string
  staircase: boolean
  filled: boolean
  points: StockChartSeriesPoint[]
}
export interface StockChartPointSeries extends StockChartSeriesBase {
  type: 'point'
  points: StockChartSeriesPoint[]
}
export interface StockChartCandleSeries extends StockChartSeriesBase {
  type: 'candle'
  points: StockChartSeriesOHLCPoint[]
}
export type StockChartSeries = StockChartLineSeries | StockChartPointSeries | StockChartCandleSeries

export interface StockChartViewport {
  xAxisMinMax?: [number, number]
  yAxisMinMax?: [number, number]
  scaleMode: StockChartScaleMode
}

export type StockChartScaleMode = 'linear' | 'logarithmic'

export interface StockChartProps {
  width: number
  height: number
  showAxes?: boolean
  showGrid?: boolean
  showLabels?: boolean
  showCurrentValues?: boolean
  enableMouseOver?: boolean
  enablePanAndZoom?: boolean
  privacy: boolean
  series: StockChartSeries[]
  viewport: StockChartViewport
  onChangeViewport: (viewport: StockChartViewport) => void
}

export const StockChart: React.FC<StockChartProps> = ({
  width,
  height,
  showAxes,
  showGrid,
  showLabels,
  showCurrentValues,
  enableMouseOver,
  enablePanAndZoom,
  privacy,
  series,
  viewport: viewportProp,
  onChangeViewport,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const mouse = React.useRef<[number, number] | undefined>(undefined)

  const fontSize = 14
  const axesPadding = 10
  const xAxisHeight = fontSize + 2 * axesPadding
  const viewport = React.useRef<StockChartViewport>(viewportProp)
  const axes = React.useRef<{ xAxis?: Axis; yAxis?: Axis }>({})

  React.useEffect(() => {
    viewport.current = viewportProp
  }, [viewportProp])
  useHover(canvasRef, event => {
    if (enableMouseOver && (event.type === 'start' || event.type === 'move')) {
      mouse.current = [Math.round(event.positionX), Math.round(event.positionY)]
    } else if (enableMouseOver && event.type === 'stop') {
      mouse.current = undefined
    }
  })
  usePanPinch(
    canvasRef,
    () => ({ viewport: viewport.current, axes: axes.current }),
    undefined,
    event => {
      if (enablePanAndZoom && event.type === 'move') {
        const {
          data,
          first: { startX, startY, deltaX, deltaY },
        } = event
        const { xAxis, yAxis } = data.axes
        const [leftTimestamp, rightTimestamp] = data.viewport.xAxisMinMax || extractXAxisMinMax(series)
        const [bottomValue, topValue] =
          data.viewport.yAxisMinMax ||
          extractYAxisMinMax(series, [leftTimestamp, rightTimestamp], height - xAxisHeight, data.viewport.scaleMode)
        if (xAxis && yAxis) {
          if (startX > width - yAxis.width && startY < height - xAxis.height) {
            // panning on y-axis => scale y-axis
            const deltaValue = yAxis.scale.invert(startY) - yAxis.scale.invert(startY + deltaY)
            viewport.current = {
              ...data.viewport,
              yAxisMinMax: [bottomValue - deltaValue / 2, topValue + deltaValue / 2],
            }
          } else if (startY > height - xAxis.height && startX < width - yAxis.width) {
            // panning on x-axis => scale x-axis
            const x0 = 0
            const x1 = width - yAxis.width
            const x = startX
            const leftTimestamp = xAxis.scale.invert(((x - x1) / (startX + deltaX - x1)) * (x0 - x1) + x1)
            if (leftTimestamp < rightTimestamp) {
              viewport.current = {
                ...data.viewport,
                xAxisMinMax: [leftTimestamp, rightTimestamp],
              }
            }
          } else if (startX < width - yAxis.width && startY < height - xAxis.height) {
            // panning on main area => move chart
            const deltaTimestamp = xAxis.scale.invert(startX) - xAxis.scale.invert(startX + deltaX)
            const deltaValue = yAxis.scale.invert(startY) - yAxis.scale.invert(startY + deltaY)
            viewport.current = {
              ...data.viewport,
              xAxisMinMax: [leftTimestamp + deltaTimestamp, rightTimestamp + deltaTimestamp],
              yAxisMinMax: data.viewport.yAxisMinMax ? [bottomValue + deltaValue, topValue + deltaValue] : undefined,
            }
          }
        }
      } else if (enablePanAndZoom && event.type === 'stop') {
        onChangeViewport(viewport.current)
      }
    },
    !enablePanAndZoom
  )
  const seriesSorted = React.useMemo(
    () => selectionSortBy(series, (a, b) => (a.priority || 0) - (b.priority || 0)),
    [series]
  )

  return (
    <Canvas
      ref={canvasRef}
      width={width}
      height={height}
      renderInputs={() => [showAxes, showGrid, showCurrentValues, series, viewport.current, mouse.current]}
      render={({ context: ctx }) => {
        ctx.clearRect(0, 0, width, height)
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue',
      sans-serif`

        const [leftTimestamp, rightTimestamp] = viewport.current.xAxisMinMax || extractXAxisMinMax(series)
        const [bottomValue, topValue] =
          viewport.current.yAxisMinMax ||
          extractYAxisMinMax(series, [leftTimestamp, rightTimestamp], height - xAxisHeight, viewport.current.scaleMode)
        const yAxis = generateYAxis(
          bottomValue,
          topValue,
          showAxes ? height - xAxisHeight : height,
          ctx,
          axesPadding,
          !!showAxes,
          viewport.current.scaleMode
        )
        const xAxis = generateXAxis(
          leftTimestamp,
          rightTimestamp,
          width - yAxis.width,
          xAxisHeight,
          axesPadding,
          !!showAxes
        )
        axes.current = { xAxis, yAxis }

        if (showAxes) {
          renderAxesCross(ctx, width, height, xAxis, yAxis)
          renderXAxis(ctx, height, xAxis)
          renderYAxis(ctx, width, yAxis, privacy)
        }
        if (showGrid) {
          renderGrid(ctx, width, height, xAxis, yAxis)
        }
        seriesSorted.forEach(series => renderSeries(ctx, width, height, xAxis, yAxis, series))
        if (showCurrentValues) {
          seriesSorted.forEach(series =>
            renderCurrentValue(ctx, width, yAxis, series, [leftTimestamp, rightTimestamp], privacy)
          )
        }
        if (showLabels) {
          renderLabels(ctx, series)
        }
        if (mouse.current && mouse.current[0] < width - yAxis.width && mouse.current[1] < height - xAxis.height) {
          renderMouse(ctx, width, height, mouse.current, xAxis, yAxis, privacy)
        }
      }}
      className={stylesRoot}
    />
  )
}

interface Tick {
  value: number
  label: string
  highlighted?: boolean
}

interface Axis {
  scale: d3Scale.ScaleContinuousNumeric<number, number>
  ticks: Tick[]
  width: number
  height: number
  padding: number
}

function generateXAxis(
  min: number,
  max: number,
  width: number,
  height: number,
  padding: number,
  showAxes: boolean
): Axis {
  const scale = d3Scale.scaleLinear().domain([min, max]).range([0, width])
  const ticks = generateXTicks(scale)
  return {
    scale,
    ticks,
    width,
    height: showAxes ? height : 0,
    padding,
  }
}

function generateYAxis(
  min: number,
  max: number,
  height: number,
  ctx: CanvasRenderingContext2D,
  padding: number,
  showAxes: boolean,
  scaleMode?: StockChartScaleMode
): Axis {
  const scale = (
    (scaleMode === 'logarithmic' ? d3Scale.scaleSymlog() : d3Scale.scaleLinear()).domain([min, max]) as any
  ).range([height, 0])
  const ticks = generateYTicks(scale, scaleMode || 'linear')
  const width = Math.ceil(ticks.reduce((w, t) => Math.max(w, ctx.measureText(t.label).width), 0)) + 2 * padding
  return {
    ticks,
    scale,
    width: showAxes ? width : 0,
    height,
    padding,
  }
}

function renderAxesCross(ctx: CanvasRenderingContext2D, width: number, height: number, xAxis: Axis, yAxis: Axis): void {
  ctx.save()

  ctx.strokeStyle = '#888888'

  ctx.beginPath()
  ctx.moveTo(0, height - xAxis.height + 0.5)
  ctx.lineTo(width, height - xAxis.height + 0.5)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(width - yAxis.width + 0.5, 0)
  ctx.lineTo(width - yAxis.width + 0.5, height)
  ctx.stroke()

  ctx.restore()
}

function renderGrid(ctx: CanvasRenderingContext2D, width: number, height: number, xAxis: Axis, yAxis: Axis): void {
  ctx.save()
  const region = new Path2D()
  region.rect(0, 0, width - yAxis.width, height - xAxis.height)
  ctx.clip(region)

  const strokeStyle = '#00000010'
  const highlighedStrokeStyle = '#00000020'
  xAxis.ticks
    .filter(tick => !tick.highlighted)
    .forEach(tick => {
      ctx.strokeStyle = strokeStyle
      ctx.beginPath()
      ctx.moveTo(Math.round(xAxis.scale(tick.value)) + 0.5, 0)
      ctx.lineTo(Math.round(xAxis.scale(tick.value)) + 0.5, height)
      ctx.stroke()
    })
  xAxis.ticks
    .filter(tick => tick.highlighted)
    .forEach(tick => {
      ctx.strokeStyle = highlighedStrokeStyle
      ctx.beginPath()
      ctx.moveTo(Math.round(xAxis.scale(tick.value)) + 0.5, 0)
      ctx.lineTo(Math.round(xAxis.scale(tick.value)) + 0.5, height)
      ctx.stroke()
    })
  yAxis.ticks
    .filter(tick => !tick.highlighted)
    .forEach(tick => {
      ctx.strokeStyle = strokeStyle
      ctx.beginPath()
      ctx.moveTo(0, Math.round(yAxis.scale(tick.value)) + 0.5)
      ctx.lineTo(width, Math.round(yAxis.scale(tick.value)) + 0.5)
      ctx.stroke()
    })
  yAxis.ticks
    .filter(tick => tick.highlighted)
    .forEach(tick => {
      ctx.strokeStyle = highlighedStrokeStyle
      ctx.beginPath()
      ctx.moveTo(0, Math.round(yAxis.scale(tick.value)) + 0.5)
      ctx.lineTo(width, Math.round(yAxis.scale(tick.value)) + 0.5)
      ctx.stroke()
    })
  ctx.restore()
}

function renderXAxis(ctx: CanvasRenderingContext2D, height: number, axis: Axis): void {
  ctx.save()
  const originalFont = ctx.font
  const highlightedFont = 'bold ' + originalFont
  const region = new Path2D()
  region.rect(0, height - axis.height, axis.width, axis.height)
  ctx.clip(region)
  ctx.fillStyle = 'black'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  axis.ticks.forEach(tick => {
    const x = Math.round(axis.scale(tick.value))
    ctx.beginPath()
    ctx.moveTo(x + 0.5, height - axis.height)
    ctx.lineTo(x + 0.5, height - axis.height + axis.padding / 2)
    ctx.stroke()
    ctx.font = tick.highlighted ? highlightedFont : originalFont
    ctx.fillText(tick.label, x, height - axis.height / 2)
  })
  ctx.restore()
}

function renderYAxis(ctx: CanvasRenderingContext2D, width: number, axis: Axis, privacy: boolean): void {
  ctx.save()
  const region = new Path2D()
  region.rect(width - axis.width, 0, axis.width, axis.height)
  ctx.clip(region)
  ctx.fillStyle = 'black'
  ctx.textBaseline = 'middle'
  axis.ticks.forEach(tick => {
    const y = Math.round(axis.scale(tick.value))
    ctx.beginPath()
    ctx.moveTo(width - axis.width, y + 0.5)
    ctx.lineTo(width - axis.width + axis.padding / 2, Math.round(axis.scale(tick.value)) + 0.5)
    ctx.stroke()
    ctx.fillText(!privacy ? tick.label : '••••••••', width - axis.width + axis.padding, y)
  })
  ctx.restore()
}

function renderSeries(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  xAxis: Axis,
  yAxis: Axis,
  series: StockChartSeries
): void {
  ctx.save()
  const region = new Path2D()
  region.rect(0, 0, width - yAxis.width, height - xAxis.height)
  ctx.clip(region)

  if (series.type === 'line' && series.filled) {
    if (series.points.length > 2) {
      const fillColor = d3Color.color(series.color) || d3Color.rgb(0, 0, 0)
      ctx.fillStyle = fillColor.formatHex().substr(0, 7) + '88'
      let activePath: [StockChartSeriesPoint, StockChartSeriesPoint] | undefined
      series.points.forEach((p, i) => {
        if (typeof p.value === 'number') {
          const x = xAxis.scale(p.timestamp)
          const y = yAxis.scale(p.value)
          if (!activePath) {
            if (series.staircase && i < series.points.length - 1) {
              const p2 = { timestamp: series.points[i + 1].timestamp, value: p.value }
              const x2 = xAxis.scale(p2.timestamp)
              const y2 = yAxis.scale(p2.value)
              ctx.beginPath()
              ctx.moveTo(x, y)
              ctx.lineTo(x2, y2)
              activePath = [p, p2]
            } else {
              ctx.beginPath()
              ctx.moveTo(x, y)
              activePath = [p, p]
            }
          } else {
            if (series.staircase && i < series.points.length - 1) {
              const p2 = { timestamp: series.points[i + 1].timestamp, value: p.value }
              const x2 = xAxis.scale(p2.timestamp)
              const y2 = yAxis.scale(p2.value)
              ctx.lineTo(x, y)
              ctx.lineTo(x2, y2)
              activePath = [activePath[0], p2]
            } else {
              ctx.lineTo(x, y)
              activePath = [activePath[0], p]
            }
          }
        } else {
          if (activePath) {
            ctx.lineTo(xAxis.scale(activePath[1].timestamp), yAxis.scale(0))
            ctx.lineTo(xAxis.scale(activePath[0].timestamp), yAxis.scale(0))
            ctx.fill()
            activePath = undefined
          }
        }
      })
      if (activePath) {
        ctx.lineTo(xAxis.scale(activePath[1].timestamp), yAxis.scale(0))
        ctx.lineTo(xAxis.scale(activePath[0].timestamp), yAxis.scale(0))
        ctx.fill()
        activePath = undefined
      }
    }
  }
  if (series.type === 'line') {
    if (series.points.length > 1) {
      const strokeColor = d3Color.color(series.color) || d3Color.rgb(0, 0, 0)
      ctx.strokeStyle = strokeColor.formatHex().substr(0, 7)
      ctx.lineWidth = series.lineWidth || 3
      let activePath: [StockChartSeriesPoint, StockChartSeriesPoint] | undefined
      series.points.forEach((p, i) => {
        if (typeof p.value === 'number') {
          const x = xAxis.scale(p.timestamp)
          const y = yAxis.scale(p.value)
          if (!activePath) {
            if (series.staircase && i < series.points.length - 1) {
              const p2 = { timestamp: series.points[i + 1].timestamp, value: p.value }
              const x2 = xAxis.scale(p2.timestamp)
              const y2 = yAxis.scale(p2.value)
              ctx.beginPath()
              ctx.moveTo(x, y)
              ctx.lineTo(x2, y2)
              activePath = [p, p2]
            } else {
              ctx.beginPath()
              ctx.moveTo(x, y)
              activePath = [p, p]
            }
          } else {
            if (series.staircase && i < series.points.length - 1) {
              const p2 = { timestamp: series.points[i + 1].timestamp, value: p.value }
              const x2 = xAxis.scale(p2.timestamp)
              const y2 = yAxis.scale(p2.value)
              ctx.lineTo(x, y)
              ctx.lineTo(x2, y2)
              activePath = [activePath[0], p2]
            } else {
              ctx.lineTo(x, y)
              activePath = [activePath[0], p]
            }
          }
        } else {
          if (activePath) {
            ctx.stroke()
            activePath = undefined
          }
        }
      })
      if (activePath) {
        ctx.stroke()
        activePath = undefined
      }
    }
  }
  if (series.type === 'point') {
    series.points.forEach(point => {
      if (typeof point.value === 'number') {
        const [cx, cy] = [xAxis.scale(point.timestamp), yAxis.scale(point.value)]
        const radius = 7
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.moveTo(cx - radius, cy)
        ctx.lineTo(cx, cy - radius)
        ctx.lineTo(cx + radius, cy)
        ctx.lineTo(cx, cy + radius)
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = 'black'
        ctx.beginPath()
        ctx.moveTo(cx - radius, cy)
        ctx.lineTo(cx, cy - radius)
        ctx.lineTo(cx + radius, cy)
        ctx.lineTo(cx, cy + radius)
        ctx.lineTo(cx - radius, cy)
        ctx.closePath()
        ctx.stroke()
      }
    })
  }
  if (series.type === 'candle') {
    series.points.forEach(p => {
      const xl = xAxis.scale(p.openTimestamp)
      const xr = xAxis.scale(p.closeTimestamp)
      const xm = (xl + xr) / 2
      const xw = xr - xl
      const y0 = Math.min(yAxis.scale(p.open), yAxis.scale(p.close))
      const y1 = Math.max(yAxis.scale(p.open), yAxis.scale(p.close))
      const yh = yAxis.scale(p.high)
      const yl = yAxis.scale(p.low)
      const color = p.open <= p.close ? '#26a69a' : '#ef524f'
      if (xw >= 3) {
        ctx.fillStyle = color
        ctx.fillRect(xl + xw * 0.1, y0, xw * 0.8, Math.max(y1 - y0, 1))
      }
      ctx.lineWidth = 1
      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.moveTo(xm, yh)
      ctx.lineTo(xm, yh + Math.max(yl - yh, 1))
      ctx.stroke()
    })
  }

  ctx.restore()
}

function interpolateFirstAndLastPoint(
  series: StockChartLineSeries,
  xMinMax: [number, number]
): [StockChartSeriesPoint | undefined, StockChartSeriesPoint | undefined] {
  const firstPoint = series.points.reduceRight<StockChartSeriesPoint | undefined>((res, p, i) => {
    if (!res && typeof p.value === 'number' && p.timestamp >= xMinMax[0]) {
      const p2 = i > 0 ? series.points[i - 1] : undefined
      if (p2 && typeof p2.value === 'number' && p2.timestamp < xMinMax[0]) {
        if (series.staircase) {
          return {
            timestamp: xMinMax[0],
            value: p2.value!,
          }
        } else {
          const lambda = (xMinMax[0] - p.timestamp) / (p2.timestamp - p.timestamp)
          return {
            timestamp: p.timestamp * (1 - lambda) + p2.timestamp,
            value: p.value! * (1 - lambda) + p2.value * lambda,
          }
        }
      } else {
        return res
      }
    } else {
      return res
    }
  }, undefined)
  const lastPoint = series.points.reduce<StockChartSeriesPoint | undefined>((res, p, i) => {
    if (!res && typeof p.value === 'number' && p.timestamp <= xMinMax[1]) {
      const p2 = i < series.points.length - 1 ? series.points[i + 1] : undefined
      if (p2 && typeof p2.value === 'number' && p2.timestamp > xMinMax[1]) {
        if (series.staircase) {
          return {
            timestamp: xMinMax[1],
            value: p.value!,
          }
        } else {
          const lambda = (xMinMax[1] - p.timestamp) / (p2.timestamp - p.timestamp)
          return {
            timestamp: p.timestamp * (1 - lambda) + p2.timestamp,
            value: p.value! * (1 - lambda) + p2.value * lambda,
          }
        }
      } else if (series.points.slice(i + 1).every(p => typeof p.value !== 'number' || p.timestamp > xMinMax[1])) {
        return {
          timestamp: p.timestamp,
          value: p.value,
        }
      } else {
        return res
      }
    } else {
      return res
    }
  }, undefined)
  return [firstPoint, lastPoint]
}

function renderCurrentValue(
  ctx: CanvasRenderingContext2D,
  width: number,
  yAxis: Axis,
  series: StockChartSeries,
  xMinMax: [number, number],
  privacy: boolean
): void {
  ctx.save()

  if (series.type === 'line') {
    const [, lastPoint] = interpolateFirstAndLastPoint(series, xMinMax)
    if (lastPoint) {
      const strokeColor = d3Color.color(series.color) || d3Color.rgb(0, 0, 0)
      ctx.strokeStyle = strokeColor.formatHex().substr(0, 7)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 1])

      const y = Math.round(yAxis.scale(lastPoint.value!))
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width - yAxis.width, y + 0.5)
      ctx.stroke()

      ctx.fillStyle = strokeColor.formatHex().substr(0, 7)
      ctx.fillRect(width - yAxis.width, y - 10, yAxis.width, 20)
      ctx.fillStyle = 'white'
      ctx.textBaseline = 'middle'
      ctx.fillText(!privacy ? lastPoint.value!.toFixed(2) : '••••••••', width - yAxis.width + yAxis.padding, y + 1)
    }
  }
  if (series.type === 'candle') {
    const lastPoint = series.points.reduceRight<StockChartSeriesOHLCPoint | undefined>(
      (last, p) => (!last || p.closeTimestamp >= xMinMax[1] ? p : last),
      undefined
    )
    if (lastPoint) {
      const strokeColor = d3Color.color(lastPoint.open <= lastPoint.close ? '#26a69a' : '#ef524f')!
      ctx.strokeStyle = strokeColor.formatHex().substr(0, 7)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 1])

      const y = Math.round(yAxis.scale(lastPoint.close))
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width - yAxis.width, y + 0.5)
      ctx.stroke()

      ctx.fillStyle = strokeColor.formatHex().substr(0, 7)
      ctx.fillRect(width - yAxis.width, y - 10, yAxis.width, 20)
      ctx.fillStyle = 'white'
      ctx.textBaseline = 'middle'
      ctx.fillText(!privacy ? lastPoint.close.toFixed(2) : '••••••••', width - yAxis.width + yAxis.padding, y + 1)
    }
  }

  ctx.restore()
}

function renderLabels(ctx: CanvasRenderingContext2D, series: StockChartSeries[]): void {
  ctx.fillStyle = 'black'
  ctx.textBaseline = 'hanging'
  series.forEach((series, index) => {
    ctx.fillText(series.label, 10, 10 + index * 20)
  })
}

function renderMouse(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  position: [number, number],
  xAxis: Axis,
  yAxis: Axis,
  privacy: boolean
) {
  ctx.save()

  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])

  ctx.beginPath()
  ctx.moveTo(position[0] + 0.5, 0)
  ctx.lineTo(position[0] + 0.5, height - xAxis.height)
  ctx.stroke()

  const xText = dateFormat(new Date(xAxis.scale.invert(position[0])), 'yyyy-MM-dd')
  const xTextWidth = ctx.measureText(xText).width
  ctx.fillStyle = 'black'
  ctx.fillRect(position[0] - xTextWidth / 2 - 4, height - xAxis.height, xTextWidth + 8, 20)
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(xText, position[0], height - xAxis.height + 20 - 2)

  ctx.beginPath()
  ctx.moveTo(0, position[1] + 0.5)
  ctx.lineTo(width - yAxis.width, position[1] + 0.5)
  ctx.stroke()

  const yText = !privacy ? yAxis.scale.invert(position[1]).toFixed(2) : '••••••••'
  ctx.fillStyle = 'black'
  ctx.fillRect(width - yAxis.width, position[1] - 10, yAxis.width, 20)
  ctx.fillStyle = 'white'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(yText, width - yAxis.width + yAxis.padding, position[1] + 1)

  ctx.restore()
}

function extractXAxisMinMax(series: StockChartSeries[]): [number, number] {
  return [
    series.reduce((min, s) => {
      switch (s.type) {
        case 'line':
        case 'point':
          return Math.min(
            min,
            s.points.reduce((min, p) => Math.min(min, p.timestamp), Infinity)
          )
        case 'candle':
          return Math.min(
            min,
            s.points.reduce((min, p) => Math.min(min, p.openTimestamp), Infinity)
          )
      }
    }, Infinity),
    series.reduce((max, s) => {
      switch (s.type) {
        case 'line':
        case 'point':
          return Math.max(
            max,
            s.points.reduce((max, p) => Math.max(max, p.timestamp), -Infinity)
          )
        case 'candle':
          return Math.max(
            max,
            s.points.reduce((max, p) => Math.max(max, p.closeTimestamp), -Infinity)
          )
      }
    }, -Infinity),
  ]
}

function extractYAxisMinMax(
  series: StockChartSeries[],
  xAxisMinMax: [number, number],
  height: number,
  scaleMode: StockChartScaleMode
): [number, number] {
  const [min1, max1] = series
    .map(s => {
      switch (s.type) {
        case 'line': {
          return s.points
            .filter(p => p.timestamp >= xAxisMinMax[0] && p.timestamp <= xAxisMinMax[1] && typeof p.value === 'number')
            .concat(
              interpolateFirstAndLastPoint(s, xAxisMinMax)
                .filter(p => !!p)
                .map(p => p!)
            )
            .reduce((a, p) => [Math.min(a[0], p.value!), Math.max(a[1], p.value!)], [Infinity, -Infinity])
        }
        case 'point': {
          return s.points
            .filter(p => p.timestamp >= xAxisMinMax[0] && p.timestamp <= xAxisMinMax[1] && typeof p.value === 'number')
            .reduce((a, p) => [Math.min(a[0], p.value!), Math.max(a[1], p.value!)], [Infinity, -Infinity])
        }
        case 'candle': {
          const left = s.points.reduce((left, p, i) => (p.openTimestamp <= xAxisMinMax[0] ? i : left), 0)
          const right = s.points.reduceRight(
            (right, p, i) => (p.closeTimestamp >= xAxisMinMax[1] ? i : right),
            s.points.length - 1
          )
          return s.points
            .slice(left, right + 1)
            .reduce(
              (a, p) => [
                Math.min(a[0], p.open, p.high, p.low, p.close),
                Math.max(a[1], p.open, p.high, p.low, p.close),
              ],
              [Infinity, -Infinity]
            )
        }
      }
    })
    .reduce((a, b) => [Math.min(a[0], b[0]), Math.max(a[1], b[1])], [Infinity, -Infinity])
  const [min2, max2] = Number.isFinite(min1) && Number.isFinite(max1) ? [min1, max1] : [0, 0]
  const testScale = (
    (scaleMode === 'logarithmic' ? d3Scale.scaleSymlog() : d3Scale.scaleLinear()).domain([min2, max2]) as any
  ).range([height, 0])
  const [min3, max3] = [
    testScale.invert(testScale(min2) + height * 0.05),
    testScale.invert(testScale(max2) - height * 0.05),
  ]
  const [min4, max4] = [Math.max(min3, min2 >= 0 ? 0 : -Infinity), Math.min(max3, max2 <= 0 ? 0 : Infinity)]
  return [min4, max4]
}

function generateXTicks(scale: d3Scale.ScaleContinuousNumeric<number, number>): Tick[] {
  const slotSize = 100

  const getTickLabel = (value: Date) => {
    if (value.getMonth() === 0 && value.getDate() === 1) {
      return dateFormat(value, 'yyyy')
    } else if (value.getDate() === 1) {
      return dateFormat(value, 'MMM')
    } else {
      return dateFormat(value, 'd')
    }
  }

  const getTickValues = (xAxisMinMax: [number, number], increment: DateUnitWithoutWeek, incrementMultiple: number) => {
    const [min, max] = [new Date(xAxisMinMax[0]), new Date(xAxisMinMax[1])]
    const values = [
      dateMinus(
        dateSet(
          dateStartOf(min, increment),
          increment,
          Math.floor(dateGet(min, increment) / incrementMultiple) * incrementMultiple
        ),
        increment,
        incrementMultiple * 10
      ),
    ]
    while (values[values.length - 1].valueOf() <= max.valueOf()) {
      const lastValue = values[values.length - 1]
      const nextValue = datePlus(lastValue, increment, incrementMultiple)
      if (lastValue.getFullYear() !== nextValue.getFullYear()) {
        const adjustedNextValue = dateStartOf(nextValue, 'year')
        if (scale(adjustedNextValue.valueOf()) - scale(lastValue.valueOf()) < slotSize / 2) {
          values.pop()
        }
        values.push(adjustedNextValue)
      } else if (lastValue.getMonth() !== nextValue.getMonth()) {
        const adjustedNextValue = dateStartOf(nextValue, 'month')
        if (scale(adjustedNextValue.valueOf()) - scale(lastValue.valueOf()) < slotSize / 2) {
          values.pop()
        }
        values.push(adjustedNextValue)
      } else {
        values.push(nextValue)
      }
    }
    return values
  }

  const domainDays = (scale.domain()[1] - scale.domain()[0]) / 1000 / 60 / 60 / 24
  const rangeSlots = (scale.range()[1] - scale.range()[0]) / slotSize

  if (domainDays / rangeSlots < 30) {
    const incrementMultiple = snapValue(domainDays / rangeSlots, [1, 2, 3, 7, 14])
    return getTickValues([scale.domain()[0], scale.domain()[1]], 'day', incrementMultiple).map(value => ({
      value: value.valueOf(),
      label: getTickLabel(value),
      highlighted: value.getDate() === 1,
    }))
  } else if (domainDays / rangeSlots < (365 * 2) / 3) {
    const incrementMultiple = snapValue(domainDays / rangeSlots / 30, [1, 2, 3, 6])
    return getTickValues([scale.domain()[0], scale.domain()[1]], 'month', incrementMultiple).map(value => ({
      value: value.valueOf(),
      label: getTickLabel(value),
      highlighted: value.getMonth() === 0 && value.getDate() === 1,
    }))
  } else {
    const incrementMultiple = snapValue(domainDays / rangeSlots / 365, [1, 2, 3, 5, 10, 25, 50, 100])
    return getTickValues([scale.domain()[0], scale.domain()[1]], 'year', incrementMultiple).map(value => ({
      value: value.valueOf(),
      label: getTickLabel(value),
      highlighted: false,
    }))
  }
}

function generateYTicks(scale: d3Scale.ScaleContinuousNumeric<number, number>, scaleMode: StockChartScaleMode): Tick[] {
  const count = Math.max(Math.floor(Math.abs(scale.range()[1] - scale.range()[0]) / 50), 1)
  if (scaleMode === 'linear') {
    return scale.ticks(count).map(value => ({
      value,
      label: value.toFixed(2),
    }))
  } else if (scaleMode === 'logarithmic') {
    const linear = d3Scale.scaleLinear().range(scale.range()).domain(scale.range())
    return linear
      .ticks(count)
      .map(t => scale.invert(t))
      .map(value => ({
        value,
        label: value.toFixed(2),
      }))
  } else {
    return []
  }
}

function snapValue(value: number, snaps: number[]): number {
  const result = snaps.reduce<{ value: number; distance: number } | undefined>((acc, s) => {
    if (!acc || Math.abs(value - s) < acc.distance) {
      return { value: s, distance: Math.abs(value - s) }
    } else {
      return acc
    }
  }, undefined)
  return result ? result.value : 0
}

const stylesRoot = css`
  user-select: none;
  touch-action: none;
`
