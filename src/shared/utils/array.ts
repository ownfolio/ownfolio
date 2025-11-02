export function groupBy<T>(elems: T[], keyFn: (elem: T) => string): T[][] {
  const keyIndexMap: { [key: string]: number | undefined } = {}
  const result: T[][] = []
  elems.forEach(elem => {
    const key = keyFn(elem)
    const keyIndex = keyIndexMap[key]
    if (keyIndex !== undefined) {
      result[keyIndex].push(elem)
    } else {
      keyIndexMap[key] = result.length
      result.push([elem])
    }
  })
  return result
}

export function mapGroupBy<T>(elems: T[], keyFn: (elem: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  elems.forEach(elem => {
    const key = keyFn(elem)
    if (result[key]) {
      result[key] = [...result[key], elem]
    } else {
      result[key] = [elem]
    }
  })
  return result
}

export function selectionSortBy<T>(elems: T[], cmp: (a: T, b: T) => number): T[] {
  const result = [...elems]
  for (let i = 0; i < result.length; i++) {
    let indexMin = i

    for (let j = i + 1; j < result.length; j++) {
      if (cmp(result[j], result[indexMin]) < 0) {
        indexMin = j
      }
    }

    if (indexMin !== i) {
      const lesser = result[indexMin]
      result[indexMin] = result[i]
      result[i] = lesser
    }
  }
  return result
}

export function mergeSortedBy<T>(a: T[], b: T[], cmp: (a: T, b: T) => number): T[] {
  let aIndex = 0,
    bIndex = 0
  const result: T[] = []
  while (aIndex < a.length && bIndex < b.length) {
    const aElem = a[aIndex]
    const bElem = b[bIndex]
    if (cmp(aElem, bElem) <= 0) {
      result.push(aElem)
      aIndex = aIndex + 1
    } else {
      result.push(bElem)
      bIndex = bIndex + 1
    }
  }
  result.push(...a.slice(aIndex))
  result.push(...b.slice(bIndex))
  return result
}

export function findIndexLeft<T>(array: readonly T[], fn: (item: T) => boolean, skipLeft: number = 0): number {
  for (let i = skipLeft; i < array.length; i++) {
    const item = array[i]
    if (fn(item)) {
      return i
    }
  }
  return -1
}

export function findIndexLeftUntil<T>(array: readonly T[], fn: (item: T) => boolean, skipLeft: number = 0): number {
  for (let i = skipLeft; i < array.length; i++) {
    const item = array[i]
    if (fn(item)) {
      return i - 1
    }
  }
  return array.length - 1
}

export function minBy<T>(elems: T[], valueFn: (elem: T) => number): T | undefined {
  let min: T | undefined
  let minValue = Number.POSITIVE_INFINITY
  elems.forEach(elem => {
    const value = valueFn(elem)
    if (value < minValue) {
      min = elem
      minValue = value
    }
  })
  return min
}

export function maxBy<T>(elems: T[], valueFn: (elem: T) => number): T | undefined {
  let max: T | undefined
  let maxValue = Number.NEGATIVE_INFINITY
  elems.forEach(elem => {
    const value = valueFn(elem)
    if (value > maxValue) {
      max = elem
      maxValue = value
    }
  })
  return max
}

export function findClosest<T>(elems: T[], fn: (elem: T) => number): T | undefined {
  let index = -1
  let distance = Number.POSITIVE_INFINITY
  elems.forEach((elem, idx) => {
    const dist = fn(elem)
    if (dist < distance) {
      index = idx
      distance = dist
    }
  })
  return index >= 0 ? elems[index] : undefined
}

export function filterNotFalse<T>(elems: (T | false)[]): T[] {
  return elems.flatMap(elem => {
    if (elem === false) {
      return []
    }
    return [elem]
  })
}

export function filterNotUndefined<T>(elems: (T | undefined)[]): T[] {
  return elems.flatMap(elem => {
    if (elem === undefined) {
      return []
    }
    return [elem]
  })
}

export function chunks<T>(elems: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < elems.length; i += size) {
    result.push(elems.slice(i, i + size))
  }
  return result
}
