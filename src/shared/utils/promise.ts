export function sleep(delay: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(() => resolve(), delay))
}

export function sequential<T>(promises: (() => Promise<T>)[]): Promise<T[]> {
  return promises.reduce<Promise<T[]>>(async (accP, promise) => {
    const acc = await accP
    const value = await promise()
    return [...acc, value]
  }, Promise.resolve([]))
}
