import React from 'react'

export type HoverEventType = 'start' | 'move' | 'stop'

export interface HoverEvent {
  type: HoverEventType
  positionX: number
  positionY: number
}

export function useHover(ref: React.RefObject<HTMLElement>, handler: (event: HoverEvent) => void, disabled?: boolean) {
  React.useEffect(() => {
    if (!ref.current || disabled) {
      return () => {}
    }
    const elem = ref.current
    const onPointerEnter = (event: MouseEvent) => {
      const { left, top } = elem.getBoundingClientRect()
      const { clientX, clientY } = event
      handler({
        type: 'start',
        positionX: clientX - left,
        positionY: clientY - top,
      })
    }
    const onPointerMove = (event: MouseEvent) => {
      const { left, top } = elem.getBoundingClientRect()
      const { clientX, clientY } = event
      handler({
        type: 'move',
        positionX: clientX - left,
        positionY: clientY - top,
      })
    }
    const onPointerUp = (event: MouseEvent) => {
      const { left, top } = elem.getBoundingClientRect()
      const { clientX, clientY } = event
      handler({
        type: 'stop',
        positionX: clientX - left,
        positionY: clientY - top,
      })
    }

    elem.addEventListener('pointerenter', onPointerEnter, { passive: true })
    elem.addEventListener('pointermove', onPointerMove, { passive: true })
    elem.addEventListener('pointerup', onPointerUp, { passive: true })
    elem.addEventListener('pointercancel', onPointerUp, { passive: true })
    elem.addEventListener('pointerout', onPointerUp, { passive: true })
    elem.addEventListener('pointerleave', onPointerUp, { passive: true })
    return () => {
      elem.removeEventListener('pointerenter', onPointerEnter)
      elem.removeEventListener('pointermove', onPointerMove)
      elem.removeEventListener('pointerup', onPointerUp)
      elem.removeEventListener('pointercancel', onPointerUp)
      elem.removeEventListener('pointerout', onPointerUp)
      elem.removeEventListener('pointerleave', onPointerUp)
    }
  }, [ref.current, disabled])
}
