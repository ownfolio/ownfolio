export type PromiseQueue = <T>(promise: (slot: number) => Promise<T>) => Promise<T>

export interface PromiseQueueEntry<T = any> {
  promise: (slot: number) => Promise<T>
  resolve: (value: T) => void
  reject: (error: any) => void
}

export function createPromisePool(concurrency: number): PromiseQueue {
  const slots = new Array<PromiseQueueEntry | undefined>(concurrency).fill(undefined)
  let queue: PromiseQueueEntry[] = []

  const tryActivateNext = () => {
    const slot = slots.findIndex(s => !s)
    if (slot >= 0 && queue.length > 0) {
      const next = queue[0]
      slots[slot] = next
      queue = queue.slice(1)

      next
        .promise(slot)
        .then(value => {
          next.resolve(value)
          slots[slot] = undefined
          tryActivateNext()
        })
        .catch(error => {
          next.reject(error)
          slots[slot] = undefined
          tryActivateNext()
        })
    }
  }

  return promise =>
    new Promise((resolve, reject) => {
      queue = [...queue, { promise, resolve, reject }]
      tryActivateNext()
    })
}
