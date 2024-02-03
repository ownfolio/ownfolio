import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

interface Props
  extends Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, 'children'> {
  children: (width: number, height: number) => React.ReactNode
}

export const AutoSizer: React.FC<Props> = ({ className, children, ...other }) => {
  const ref = React.useRef<HTMLDivElement>(null)
  const dimensionsRef = React.useRef<[number, number]>([0, 0])
  const [dimensions, setDimensions] = React.useState<[number, number]>([0, 0])
  React.useEffect(() => {
    let animationFrameId = 0
    const handler = () => {
      if (ref.current) {
        const div = ref.current
        const rect = div.getBoundingClientRect()
        const [w, h] = [Math.floor(rect.width), Math.floor(rect.height)]
        if (dimensionsRef.current[0] !== w || dimensionsRef.current[1] !== h) {
          dimensionsRef.current = [w, h]
          setDimensions(dimensionsRef.current)
        }
      }
      animationFrameId = window.requestAnimationFrame(handler)
    }
    handler()
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [ref.current])
  return (
    <div ref={ref} {...other} className={clsx(stylesRoot, className)}>
      {dimensions[0] > 0 && dimensions[1] > 0 && children(dimensions[0], dimensions[1])}
    </div>
  )
}

const stylesRoot = css`
  position: absolute;
  inset: 0;
  overflow: hidden;
`
