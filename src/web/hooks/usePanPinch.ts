import React from 'react'

interface State<T> {
  data: T
  firstPointer: {
    pointerId: number
    startX: number
    startY: number
    currentX: number
    currentY: number
  }
  secondPointer?: {
    pointerId: number
    startX: number
    startY: number
    currentX: number
    currentY: number
    firstStartX: number
    firstStartY: number
  }
}

export type PanPinchEventFirst = {
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
}
export type PanPinchEventSecond = PanPinchEventFirst & {
  firstStartX: number
  firstStartY: number
}

export type PanPinchEvent<T> =
  | { type: 'start'; data: T; first: { startX: number; startY: number } }
  | { type: 'move'; data: T; first: PanPinchEventFirst; second?: PanPinchEventSecond }
  | { type: 'stop'; data: T }

export function usePanPinch<T = unknown>(
  ref: React.RefObject<HTMLElement | null>,
  createDataOnStart: () => T,
  updateDataOnSecondStop: ((data: T, first: PanPinchEventFirst, second: PanPinchEventSecond) => T) | undefined,
  handler: (event: PanPinchEvent<T>) => void,
  disabled?: boolean
) {
  const state = React.useRef<State<T> | undefined>(undefined)
  React.useEffect(() => {
    if (!ref.current || disabled) {
      return () => {}
    }
    const elem = ref.current
    const onPointerDown = (event: PointerEvent) => {
      const { left, top } = elem.getBoundingClientRect()
      const { clientX, clientY } = event
      if (!state.current) {
        state.current = {
          data: createDataOnStart(),
          firstPointer: {
            pointerId: event.pointerId,
            startX: clientX - left,
            startY: clientY - top,
            currentX: clientX - left,
            currentY: clientY - top,
          },
        }
        handler({
          type: 'start',
          data: state.current.data,
          first: {
            startX: clientX - left,
            startY: clientY - top,
          },
        })
      } else if (!state.current.secondPointer) {
        state.current = {
          ...state.current,
          secondPointer: {
            pointerId: event.pointerId,
            startX: clientX - left,
            startY: clientY - top,
            currentX: clientX - left,
            currentY: clientY - top,
            firstStartX: state.current.firstPointer.currentX,
            firstStartY: state.current.firstPointer.currentY,
          },
        }
      }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (state.current && state.current.firstPointer.pointerId === event.pointerId) {
        const { data, firstPointer, secondPointer } = state.current
        const { left, top } = elem.getBoundingClientRect()
        const { clientX, clientY } = event
        state.current = {
          ...state.current,
          firstPointer: {
            ...firstPointer,
            currentX: clientX - left,
            currentY: clientY - top,
          },
        }
        handler({
          type: 'move',
          data: data,
          first: {
            startX: firstPointer.startX,
            startY: firstPointer.startY,
            currentX: clientX - left,
            currentY: clientY - top,
            deltaX: clientX - left - firstPointer.startX,
            deltaY: clientY - top - firstPointer.startY,
          },
          second: secondPointer && {
            startX: secondPointer.startX,
            startY: secondPointer.startY,
            currentX: secondPointer.currentX,
            currentY: secondPointer.currentY,
            deltaX: secondPointer.currentX - secondPointer.startX,
            deltaY: secondPointer.currentY - secondPointer.startY,
            firstStartX: secondPointer.firstStartX,
            firstStartY: secondPointer.firstStartY,
          },
        })
      } else if (state.current && state.current.secondPointer?.pointerId === event.pointerId) {
        const { data, firstPointer, secondPointer } = state.current
        const { left, top } = elem.getBoundingClientRect()
        const { clientX, clientY } = event
        state.current = {
          ...state.current,
          secondPointer: {
            ...secondPointer,
            currentX: clientX - left,
            currentY: clientY - top,
          },
        }
        handler({
          type: 'move',
          data: data,
          first: {
            startX: firstPointer.startX,
            startY: firstPointer.startY,
            currentX: firstPointer.currentX,
            currentY: firstPointer.currentY,
            deltaX: firstPointer.currentX - firstPointer.startX,
            deltaY: firstPointer.currentY - firstPointer.startY,
          },
          second: {
            startX: secondPointer.startX,
            startY: secondPointer.startY,
            currentX: clientX - left,
            currentY: clientY - top,
            deltaX: clientX - left - secondPointer.startX,
            deltaY: clientY - top - secondPointer.startY,
            firstStartX: secondPointer.firstStartX,
            firstStartY: secondPointer.firstStartY,
          },
        })
      }
    }
    const onPointerUp = (event: PointerEvent) => {
      if (state.current && state.current.firstPointer.pointerId === event.pointerId) {
        const { data } = state.current
        handler({
          type: 'stop',
          data: data,
        })
        state.current = undefined
      } else if (state.current && state.current.secondPointer?.pointerId === event.pointerId) {
        state.current = {
          ...state.current,
          data: updateDataOnSecondStop
            ? updateDataOnSecondStop(
                state.current.data,
                {
                  startX: state.current.firstPointer.startX,
                  startY: state.current.firstPointer.startY,
                  currentX: state.current.firstPointer.currentX,
                  currentY: state.current.firstPointer.currentY,
                  deltaX: state.current.firstPointer.currentX - state.current.firstPointer.startX,
                  deltaY: state.current.firstPointer.currentY - state.current.firstPointer.startY,
                },
                {
                  startX: state.current.secondPointer.startX,
                  startY: state.current.secondPointer.startY,
                  currentX: state.current.secondPointer.currentX,
                  currentY: state.current.secondPointer.currentY,
                  deltaX: state.current.secondPointer.currentX - state.current.secondPointer.startX,
                  deltaY: state.current.secondPointer.currentY - state.current.secondPointer.startY,
                  firstStartX: state.current.secondPointer.firstStartX,
                  firstStartY: state.current.secondPointer.firstStartY,
                }
              )
            : state.current.data,
          secondPointer: undefined,
        }
      }
    }

    elem.addEventListener('pointerdown', onPointerDown, { passive: true })
    elem.addEventListener('pointermove', onPointerMove, { passive: true })
    elem.addEventListener('pointerup', onPointerUp, { passive: true })
    elem.addEventListener('pointercancel', onPointerUp, { passive: true })
    elem.addEventListener('pointerout', onPointerUp, { passive: true })
    elem.addEventListener('pointerleave', onPointerUp, { passive: true })
    return () => {
      elem.removeEventListener('pointerdown', onPointerDown)
      elem.removeEventListener('pointermove', onPointerMove)
      elem.removeEventListener('pointerup', onPointerUp)
      elem.removeEventListener('pointercancel', onPointerUp)
      elem.removeEventListener('pointerout', onPointerUp)
      elem.removeEventListener('pointerleave', onPointerUp)
      state.current = undefined
    }
  }, [ref.current, disabled])
}
