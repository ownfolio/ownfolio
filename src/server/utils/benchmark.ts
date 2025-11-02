import { selectionSortBy } from '../../shared/utils/array'

const benchmarkEnabled = ['1', 'yes', 'true'].includes((process.env.BENCHMARK_ENABLED || '').toLowerCase())

let nextPendingBenchmarkId = 1
const pendingBenchmarks: { [id: number]: { name: string; start: [number, number] } | undefined } = {}
const finishedBenchmarks: {
  [name: string]:
    | {
        count: number
        min: number
        max: number
        total: number
      }
    | undefined
} = {}

export function startBenchmark(name: string): number {
  if (!benchmarkEnabled) {
    return 0
  }
  const id = nextPendingBenchmarkId++
  pendingBenchmarks[id] = {
    name,
    start: process.hrtime(),
  }
  return id
}

export function endBenchmark(id: number): void {
  if (!benchmarkEnabled) {
    return
  }
  const pendingBenchmark = pendingBenchmarks[id]
  delete pendingBenchmarks[id]
  if (pendingBenchmark) {
    const { name, start } = pendingBenchmark
    const end = process.hrtime()
    const duration = [end[0] - start[0], end[1] - start[1]]
    const durationMillis = Math.round(duration[0] * 1e6 + duration[1] * 1e-3) * 1e-3
    const benchmark = finishedBenchmarks[name]
    if (benchmark) {
      finishedBenchmarks[name] = {
        count: benchmark.count + 1,
        min: Math.min(benchmark.min, durationMillis),
        max: Math.max(benchmark.min, durationMillis),
        total: benchmark.total + durationMillis,
      }
    } else {
      finishedBenchmarks[name] = {
        count: 1,
        min: durationMillis,
        max: durationMillis,
        total: durationMillis,
      }
    }
  }
}

export function wrapBenchmark<T>(name: string, fn: () => T): T {
  const id = startBenchmark(name)
  try {
    return fn()
  } finally {
    endBenchmark(id)
  }
}

if (benchmarkEnabled) {
  setInterval(() => {
    if (Object.keys(finishedBenchmarks).length > 0) {
      const names = selectionSortBy(Object.keys(finishedBenchmarks), (a, b) => (a === b ? 0 : a < b ? -1 : 1))
      process.stdout.write(
        formatTable(
          ['Name', 'Count', 'Total', 'Mean'],
          names.flatMap(name => {
            const benchmark = finishedBenchmarks[name]
            if (benchmark) {
              return [
                [
                  name,
                  benchmark.count.toFixed(0) + 'x',
                  benchmark.total.toFixed(3) + 'ms',
                  (benchmark.total / benchmark.count).toFixed(3) + 'ms',
                ],
              ]
            } else {
              return []
            }
          })
        )
      )
      Object.keys(finishedBenchmarks).forEach(name => {
        delete finishedBenchmarks[name]
      })
    }
  }, 3000)
}

function formatTable(columns: string[], rows: string[][]): string {
  const columnWidths = columns.map((column, columnIndex) =>
    rows.reduce((width, row) => Math.max(width, row[columnIndex].length), column.length)
  )
  const tableWidth = columnWidths.reduce((width, cw) => width + cw, 0) + (columnWidths.length - 1) * 3

  let result = ''
  result = result + repeat('=', tableWidth) + '\n'
  columns.forEach((column, columnIndex) => {
    if (columnIndex === 0) {
      result = result + padRight(column, columnWidths[columnIndex])
    } else {
      result = result + padLeft(column, columnWidths[columnIndex])
    }
    if (columnIndex < columns.length - 1) {
      result = result + '   '
    } else {
      result = result + '\n'
    }
  })
  result = result + repeat('=', tableWidth) + '\n'
  rows.forEach(row => {
    row.forEach((column, columnIndex) => {
      if (columnIndex === 0) {
        result = result + padRight(column, columnWidths[columnIndex])
      } else {
        result = result + padLeft(column, columnWidths[columnIndex])
      }
      if (columnIndex < columns.length - 1) {
        result = result + '   '
      } else {
        result = result + '\n'
      }
    })
  })
  result = result + repeat('=', tableWidth) + '\n'
  return result
}

function padLeft(s: string, count: number): string {
  return repeat(' ', Math.max(count - s.length, 0)) + s
}

function padRight(s: string, count: number): string {
  return s + repeat(' ', Math.max(count - s.length, 0))
}

function repeat(s: string, count: number): string {
  return new Array(count).fill(s).join('')
}
