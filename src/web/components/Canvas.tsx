import React from 'react'

interface Props extends React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement> {
  width: number
  height: number
  render: (props: { context: CanvasRenderingContext2D; canvas: HTMLCanvasElement }) => void
  renderInputs?: () => unknown[]
}

export const Canvas = React.forwardRef<HTMLCanvasElement, Props>(
  ({ width: _width, height: _height, render, renderInputs, ...other }, ref) => {
    React.useEffect(() => {
      const [width, height] = [Math.floor(_width), Math.floor(_height)]
      const currentRef = typeof ref !== 'function' ? ref?.current : undefined
      if (currentRef) {
        let animationFrameId = 0
        let lastRenderInputs: unknown[] | undefined
        const dpr = window.devicePixelRatio || 1
        const canvas = currentRef
        const context = canvas.getContext('2d')!
        const handler = () => {
          let resized = false
          const [canvasWidth, canvasHeight] = [Math.floor(width * dpr), Math.floor(height * dpr)]
          if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            canvas.width = canvasWidth
            canvas.height = canvasHeight
            resized = true
          }
          if (canvas.style.width !== `${width}px` || canvas.style.height !== `${height}px`) {
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
            resized = true
          }
          context.scale(dpr, dpr)
          if (resized || !lastRenderInputs || !renderInputs || !compareArrays(lastRenderInputs, renderInputs())) {
            lastRenderInputs = renderInputs && renderInputs()
            render({ context, canvas })
          }
          context.setTransform(1, 0, 0, 1, 0, 0)
          animationFrameId = window.requestAnimationFrame(handler)
        }
        handler()
        return () => window.cancelAnimationFrame(animationFrameId)
      } else {
        return () => {}
      }
    }, [_width, _height, render, renderInputs])
    return <canvas ref={ref} {...other} />
  }
)

function compareArrays(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) {
    return false
  } else {
    return a.reduce<boolean>((acc, elem, idx) => acc && elem === b[idx], true)
  }
}
