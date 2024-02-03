import React from 'react'

type ElementDimensionFn<T> = (width: number, height: number) => T

export function useElementDimensions<T, E extends HTMLElement>(
  fn: ElementDimensionFn<T>,
  fallback: T,
  ref: React.RefObject<E>
): T {
  const dimensionsRef = React.useRef<[number, number] | undefined>(undefined)
  const [result, setResult] = React.useState<T>(fallback)
  React.useEffect(() => {
    let animationFrameId = 0
    const handler = () => {
      if (ref.current) {
        const div = ref.current
        const rect = div.getBoundingClientRect()
        const [w, h] = [Math.floor(rect.width), Math.floor(rect.height)]
        if (!dimensionsRef.current || dimensionsRef.current[0] !== w || dimensionsRef.current[1] !== h) {
          dimensionsRef.current = [w, h]
          const nextResult = fn(w, h)
          if (!result || !objectShallowCompare(nextResult, result)) {
            setResult(nextResult)
          }
        }
      }
      animationFrameId = window.requestAnimationFrame(handler)
    }
    handler()
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [ref.current, result])
  return result
}

function objectShallowCompare(a: any, b: any): boolean {
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    if (ka.length === kb.length) {
      for (let i = 0; i < ka.length; i++) {
        if (a[ka[i]] !== b[kb[i]]) {
          return false
        }
      }
      return true
    } else {
      return false
    }
  } else {
    return a === b
  }
}
