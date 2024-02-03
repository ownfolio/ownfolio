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

export function uniqueBy<T, T2>(elems: T[], fn: (elem: T) => T2): T[] {
  return elems.reduce<T[]>((acc, elem) => (!acc.find(elem2 => fn(elem2) === fn(elem)) ? [...acc, elem] : acc), [])
}

export function upsertFirstBy<T>(
  elems: T[],
  matcher: (elem: T) => boolean,
  insert: () => T,
  update: (elem: T) => T
): T[] {
  const idx = elems.findIndex(matcher)
  if (idx < 0) {
    return [...elems, insert()]
  } else {
    return [...elems.slice(0, idx), update(elems[idx]), ...elems.slice(idx + 1)]
  }
}
