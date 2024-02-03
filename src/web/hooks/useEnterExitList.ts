import React from 'react'

export interface UseEnterExitListOpts<T, K extends keyof T> {
  enterMillis: number
  enterOverride: Pick<T, K>
  exitMillis: number
  exitOverride: Pick<T, K>
}

export type UseEnterExitListTransition = 'entering' | 'exiting'

export interface UseEnterExitListState<T, K extends keyof T> {
  elem: T
  key: string | number
  transition?: UseEnterExitListTransition
  override?: Pick<T, K>
}

export function useEnterExitList<T, K extends keyof T>(
  elems: T[],
  keyFn: (elem: T) => string | number,
  opts: UseEnterExitListOpts<T, K>
): T[] {
  const [state, _setState] = React.useState<UseEnterExitListState<T, K>[]>(
    elems.map(elem => ({ elem, key: keyFn(elem) }))
  )
  const setState = React.useCallback((fn: (state: UseEnterExitListState<T, K>[]) => UseEnterExitListState<T, K>[]) => {
    return _setState(state => {
      const nextState = fn(state)
      return !compareUseEnterExitListState(state, nextState) ? nextState : state
    })
  }, [])

  React.useEffect(() => {
    const added = elems.filter(elem => !state.find(s => s.key === keyFn(elem)))
    setState(state => [
      ...state,
      ...added.map(elem => ({
        elem,
        key: keyFn(elem),
        transition: 'entering' as const,
        override: { ...opts.enterOverride },
      })),
    ])
    if (added.length > 0) {
      setTimeout(() => {
        setState(state =>
          state.map(s => {
            if (added.find(elem => keyFn(elem) === s.key)) {
              return { ...s, transition: undefined, override: undefined }
            } else {
              return s
            }
          })
        )
      }, opts.enterMillis)
    }

    const removed = state.filter(s => s.transition !== 'exiting' && !elems.find(elem => keyFn(elem) === s.key))
    setState(state =>
      state.map(s => {
        if (removed.find(s2 => s2.key === s.key)) {
          return { ...s, transition: 'exiting' as const, override: { ...opts.exitOverride } }
        } else {
          return s
        }
      })
    )
    if (removed.length > 0) {
      setTimeout(() => {
        setState(state => state.filter(s => !removed.find(s2 => s2.key === s.key)))
      }, opts.exitMillis)
    }
  }, [elems, state])

  return state.map(s => ({ ...s.elem, ...s.override }))
}

function compareUseEnterExitListState<T, K extends keyof T>(
  a: UseEnterExitListState<T, K>[],
  b: UseEnterExitListState<T, K>[]
): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].key !== b[i].key || a[i].transition !== b[i].transition || a[i].override !== b[i].override) {
      return false
    }
  }
  return true
}
