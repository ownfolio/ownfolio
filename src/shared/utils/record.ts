export function recordMap<T, T2>(record: Record<string, T>, fn: (value: T, key: string) => T2): Record<string, T2> {
  const result: Record<string, T2> = {}
  Object.keys(record).forEach(key => {
    result[key] = fn(record[key], key)
  })
  return result
}
