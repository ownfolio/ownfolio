import React from 'react'
import { z } from 'zod'

type PersistentStateValueType =
  | undefined
  | null
  | boolean
  | string
  | number
  | Array<any>
  | Record<string | number | symbol, any>

export function usePersistentState<T extends PersistentStateValueType>(
  key: string,
  schema: z.ZodType<T>,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, _setState] = React.useState(read<T>(key, schema, initialValue))
  const setState = (state: React.SetStateAction<T>): void => {
    if (typeof state === 'function') {
      _setState(prev => {
        const next = state(prev)
        write(key, schema, next)
        return next
      })
    } else {
      write(key, schema, state)
      _setState(state)
    }
  }
  return React.useMemo(() => [state, setState], [state, setState])
}

function read<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return fallback
    }
    return schema.parse(JSON.parse(raw))
  } catch (err) {
    try {
      window.localStorage.removeItem(key)
    } catch (err) {
      // ignore
    }
    return fallback
  }
}

function write<T>(key: string, schema: z.ZodType<T>, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(schema.parse(value)))
  } catch (err) {
    console.log(err)
  }
}
