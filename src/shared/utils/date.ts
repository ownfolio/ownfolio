import { z } from 'zod'

import { formatInt } from './string'

export type DateUnit = 'day' | 'month' | 'week' | 'year'
export type DateUnitWithoutWeek = Exclude<DateUnit, 'week'>

export const dateUnits: DateUnit[] = ['day', 'month', 'week', 'year']
export const dateUnitSchema = z.enum(['day', 'month', 'week', 'year'])

export function dateParse(str: string): Date {
  const b = str.split(/\D/)
  const yyyy = Number.parseInt(b[0])
  const MM = Number.parseInt(b[1]) || 1
  const dd = Number.parseInt(b[2]) || 1
  const H = Number.parseInt(b[3]) || 0
  const M = Number.parseInt(b[4]) || 0
  const S = Number.parseInt(b[5]) || 0
  const sss = Number.parseInt(b[6]) || 0
  return new Date(yyyy, MM - 1, dd, H, M, S, sss)
}

export function dateFormat(date: Date, format: string): string {
  switch (format) {
    case 'd':
      return formatInt(date.getDate(), 1)
    case 'yyyy':
      return formatInt(date.getFullYear(), 4)
    case 'yyyy-MM-dd':
      return `${formatInt(date.getFullYear(), 4)}-${formatInt(date.getMonth() + 1, 2)}-${formatInt(date.getDate(), 2)}`
    case 'yyyyMMdd-HHMMSS':
      return [
        `${formatInt(date.getFullYear(), 4)}${formatInt(date.getMonth() + 1, 2)}${formatInt(date.getDate(), 2)}`,
        `${formatInt(date.getHours(), 2)}${formatInt(date.getMinutes(), 2)}${formatInt(date.getSeconds(), 2)}`,
      ].join('-')
    case 'MMM':
      switch (date.getMonth()) {
        case 0:
          return 'Jan'
        case 1:
          return 'Feb'
        case 2:
          return 'Mar'
        case 3:
          return 'Apr'
        case 4:
          return 'May'
        case 5:
          return 'Jun'
        case 6:
          return 'Jul'
        case 7:
          return 'Aug'
        case 8:
          return 'Sep'
        case 9:
          return 'Oct'
        case 10:
          return 'Nov'
        case 11:
          return 'Dec'
        default:
          throw new Error(`Unsupported month '${date.getMonth()}'`)
      }
    default:
      throw new Error(`Unsupported date format '${format}'`)
  }
}

export function dateStartOf(date: Date, unit: DateUnit): Date {
  switch (unit) {
    case 'day':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    case 'month':
      return new Date(date.getFullYear(), date.getMonth(), 1)
    case 'week':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7))
    case 'year':
      return new Date(date.getFullYear(), 0, 1)
  }
}

export function dateEndOf(date: Date, unit: DateUnit): Date {
  switch (unit) {
    case 'day':
      return new Date(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).valueOf() - 1)
    case 'month':
      return new Date(new Date(date.getFullYear(), date.getMonth() + 1).valueOf() - 1)
    case 'week':
      return new Date(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1) + 7
        ).valueOf() - 1
      )
    case 'year':
      return new Date(new Date(date.getFullYear() + 1, 0, 1).valueOf() - 1)
  }
}

export function dateGet(date: Date, unit: DateUnitWithoutWeek): number {
  switch (unit) {
    case 'day':
      return date.getDate()
    case 'month':
      return date.getMonth() + 1
    case 'year':
      return date.getFullYear()
  }
}

export function dateSet(date: Date, unit: DateUnitWithoutWeek, value: number): Date {
  switch (unit) {
    case 'day':
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        value,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      )
    case 'month':
      return new Date(
        date.getFullYear(),
        value - 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      )
    case 'year':
      return new Date(
        value,
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      )
  }
}

export function datePlus(date: Date, unit: DateUnit, amount: number): Date {
  switch (unit) {
    case 'day':
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + amount,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      )
    case 'week':
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + amount * 7,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      )
    case 'month':
      return new Date(
        date.getFullYear(),
        date.getMonth() + amount,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      )
    case 'year':
      return new Date(
        date.getFullYear() + amount,
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
      )
  }
}

export function dateMinus(date: Date, unit: DateUnit, amount: number): Date {
  return datePlus(date, unit, -amount)
}

export function dateEquals(a: Date, b: Date, unit: DateUnit): boolean {
  return dateStartOf(a, unit).valueOf() === dateStartOf(b, unit).valueOf()
}

export function dateList(startDate: Date, endDate: Date, unit: DateUnit, increment: number = 1): Date[] {
  let date = dateStartOf(startDate, unit)
  const result: Date[] = []
  while (date.valueOf() <= endDate.valueOf()) {
    result.push(date)
    date = datePlus(date, unit, increment)
  }
  return result
}
