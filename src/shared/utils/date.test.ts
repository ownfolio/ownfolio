import { expect, it } from 'vitest'

import { dateEndOf, dateEquals, dateFormat, dateList, dateParse, datePlus, dateStartOf } from './date'

it('dateParse', () => {
  expect(dateParse('2023')).toEqual(new Date(2023, 0, 1))
  expect(dateParse('2023-02-03')).toEqual(new Date(2023, 1, 3))
  expect(dateParse('2023-02-03 04:05:06')).toEqual(new Date(2023, 1, 3, 4, 5, 6))
  expect(dateParse('2023-02-03 04:05:06.789')).toEqual(new Date(2023, 1, 3, 4, 5, 6, 789))
  expect(dateParse('2023-02-03T04:05:06')).toEqual(new Date(2023, 1, 3, 4, 5, 6))
  expect(dateParse('2023-02-03T04:05:06.789')).toEqual(new Date(2023, 1, 3, 4, 5, 6, 789))
})

it('dateFormat', () => {
  expect(dateFormat(dateParse('2023-01-01'), 'yyyy-MM-dd')).toBe('2023-01-01')
})

it('dateStartOf', () => {
  expect(dateStartOf(dateParse('2023-06-15 12:00:00'), 'day')).toEqual(dateParse('2023-06-15'))
  expect(dateStartOf(dateParse('2023-06-15'), 'day')).toEqual(dateParse('2023-06-15'))

  expect(dateStartOf(dateParse('2023-06-15'), 'month')).toEqual(dateParse('2023-06-01'))
  expect(dateStartOf(dateParse('2023-06-01'), 'month')).toEqual(dateParse('2023-06-01'))

  expect(dateStartOf(dateParse('2023-07-02'), 'week')).toEqual(dateParse('2023-06-26'))
  expect(dateStartOf(dateParse('2023-06-19'), 'week')).toEqual(dateParse('2023-06-19'))
  expect(dateStartOf(dateParse('2023-06-18'), 'week')).toEqual(dateParse('2023-06-12'))
  expect(dateStartOf(dateParse('2023-06-15'), 'week')).toEqual(dateParse('2023-06-12'))
  expect(dateStartOf(dateParse('2023-06-12'), 'week')).toEqual(dateParse('2023-06-12'))
  expect(dateStartOf(dateParse('2023-06-11'), 'week')).toEqual(dateParse('2023-06-05'))
  expect(dateStartOf(dateParse('2023-06-03'), 'week')).toEqual(dateParse('2023-05-29'))

  expect(dateStartOf(dateParse('2023-06-01'), 'year')).toEqual(dateParse('2023-01-01'))
})

it('dateEndOf', () => {
  expect(dateEndOf(dateParse('2023-06-15 12:00:00'), 'day')).toEqual(dateParse('2023-06-15 23:59:59.999'))
  expect(dateEndOf(dateParse('2023-06-15'), 'day')).toEqual(dateParse('2023-06-15 23:59:59.999'))

  expect(dateEndOf(dateParse('2023-06-15'), 'month')).toEqual(dateParse('2023-06-30 23:59:59.999'))
  expect(dateEndOf(dateParse('2023-06-01'), 'month')).toEqual(dateParse('2023-06-30 23:59:59.999'))

  expect(dateEndOf(dateParse('2023-06-28'), 'week')).toEqual(dateParse('2023-07-02 23:59:59.999'))
  expect(dateEndOf(dateParse('2023-06-19'), 'week')).toEqual(dateParse('2023-06-25 23:59:59.999'))
  expect(dateEndOf(dateParse('2023-06-18'), 'week')).toEqual(dateParse('2023-06-18 23:59:59.999'))
  expect(dateEndOf(dateParse('2023-06-15'), 'week')).toEqual(dateParse('2023-06-18 23:59:59.999'))
  expect(dateEndOf(dateParse('2023-06-12'), 'week')).toEqual(dateParse('2023-06-18 23:59:59.999'))
  expect(dateEndOf(dateParse('2023-06-11'), 'week')).toEqual(dateParse('2023-06-11 23:59:59.999'))
  expect(dateEndOf(dateParse('2023-05-30'), 'week')).toEqual(dateParse('2023-06-04 23:59:59.999'))

  expect(dateEndOf(dateParse('2023-06-01'), 'year')).toEqual(dateParse('2023-12-31 23:59:59.999'))
})

it('datePlus', () => {
  expect(datePlus(dateParse('2023-06-15 12:00:00'), 'day', 4)).toEqual(dateParse('2023-06-19 12:00:00'))
  expect(datePlus(dateParse('2023-06-15'), 'day', 4)).toEqual(dateParse('2023-06-19'))
  expect(datePlus(dateParse('2023-06-15'), 'month', 4)).toEqual(dateParse('2023-10-15'))
  expect(datePlus(dateParse('2023-06-15'), 'week', 4)).toEqual(dateParse('2023-07-13'))
  expect(datePlus(dateParse('2023-06-01'), 'year', 4)).toEqual(dateParse('2027-06-01'))
})

it('dateEquals', () => {
  expect(dateEquals(dateParse('2022-12-30'), dateParse('2022-12-30'), 'day')).toEqual(true)
  expect(dateEquals(dateParse('2022-12-30'), dateParse('2023-01-01'), 'day')).toEqual(false)

  expect(dateEquals(dateParse('2022-12-30'), dateParse('2023-01-01'), 'week')).toEqual(true)
  expect(dateEquals(dateParse('2022-12-30'), dateParse('2023-01-02'), 'week')).toEqual(false)

  expect(dateEquals(dateParse('2022-12-30'), dateParse('2022-12-01'), 'month')).toEqual(true)
  expect(dateEquals(dateParse('2022-12-30'), dateParse('2023-01-01'), 'month')).toEqual(false)

  expect(dateEquals(dateParse('2022-12-30'), dateParse('2022-01-01'), 'year')).toEqual(true)
  expect(dateEquals(dateParse('2022-12-30'), dateParse('2023-01-01'), 'year')).toEqual(false)
})

it('dateList', () => {
  expect(dateList(dateParse('2023-06-15'), dateParse('2023-06-14'), 'day')).toEqual([])

  expect(dateList(dateParse('2023-06-15'), dateParse('2023-06-15'), 'day')).toEqual([dateParse('2023-06-15')])
  expect(dateList(dateParse('2023-06-15'), dateParse('2023-06-16'), 'day')).toEqual([
    dateParse('2023-06-15'),
    dateParse('2023-06-16'),
  ])
  expect(dateList(dateParse('2023-06-15'), dateParse('2023-06-17'), 'day')).toEqual([
    dateParse('2023-06-15'),
    dateParse('2023-06-16'),
    dateParse('2023-06-17'),
  ])

  expect(dateList(dateParse('2023-06-12'), dateParse('2023-06-12'), 'week')).toEqual([dateParse('2023-06-12')])
  expect(dateList(dateParse('2023-06-12'), dateParse('2023-06-19'), 'week')).toEqual([
    dateParse('2023-06-12'),
    dateParse('2023-06-19'),
  ])

  expect(dateList(dateParse('2023-06-15'), dateParse('2023-06-17'), 'day', 2)).toEqual([
    dateParse('2023-06-15'),
    dateParse('2023-06-17'),
  ])

  expect(dateList(dateParse('2023-06-15'), dateParse('2023-06-15 12:00:00'), 'day')).toEqual([dateParse('2023-06-15')])
  expect(dateList(dateParse('2023-06-15'), dateParse('2023-06-16 12:00:00'), 'day')).toEqual([
    dateParse('2023-06-15'),
    dateParse('2023-06-16'),
  ])
})
