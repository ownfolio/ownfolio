import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

import { rpcClient } from '../api'
import { usePanPinch } from '../hooks/usePanPinch'
import { LoadingView } from '../views/loading/LoadingView'

interface Props {
  attachmentId: string
  className?: string
}

interface Transform {
  scale: number
  translateX: number
  translateY: number
}

export const PdfPreview: React.FC<Props> = ({ attachmentId, className }) => {
  const [blobUrls, setBlobUrls] = React.useState<string[] | undefined>(undefined)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const previewRef = React.useRef<HTMLDivElement>(null)
  const transform = React.useRef<Transform>({ scale: 1, translateX: 0, translateY: 0 })
  const setTransform = React.useCallback(
    (transform2: Transform) => {
      transform.current = { ...transform2 }
      if (previewRef.current) {
        previewRef.current.style.transform = `scale(${transform.current.scale}) translate(${transform.current.translateX}px, ${transform.current.translateY}px)`
      }
    },
    [transform]
  )
  usePanPinch(
    rootRef,
    () => transform.current,
    (data, f, s) => {
      const scaleFactor = s
        ? l2(s.currentX - f.currentX, s.currentY - f.currentY) / l2(s.startX - s.firstStartX, s.startY - s.firstStartY)
        : 1
      const scale = cap(data.scale * scaleFactor, 1, 4)
      return {
        ...data,
        scale,
      }
    },
    event => {
      if (event.type === 'move') {
        const { data, first: f, second: s } = event
        if (!rootRef.current) {
          return
        }
        const scaleFactor = s
          ? l2(s.currentX - f.currentX, s.currentY - f.currentY) /
            l2(s.startX - s.firstStartX, s.startY - s.firstStartY)
          : 1
        const scale = cap(data.scale * scaleFactor, 1, 4)
        setTransform({
          ...transform.current,
          scale,
          translateX: data.translateX + f.deltaX / scale,
          translateY: data.translateY + f.deltaY / scale,
        })
      }
    }
  )
  React.useEffect(() => {
    let blobUrls: string[] | undefined
    const run = async () => {
      try {
        const pages = await rpcClient.downloadPdfAttachmentAsPngs({ id: attachmentId }).then(r => r.data)
        const pageBlobs = await Promise.all(pages.map(page => fetch(page).then(res => res.blob())))
        blobUrls = pageBlobs.map(pageBlob => URL.createObjectURL(pageBlob))
        setBlobUrls(blobUrls)
      } catch (err) {
        console.error(err)
      }
    }
    run()
    return () => {
      if (blobUrls) {
        blobUrls.forEach(blobUrl => URL.revokeObjectURL(blobUrl))
      }
      setBlobUrls(undefined)
    }
  }, [attachmentId])
  return (
    <div
      ref={rootRef}
      onWheel={event => {
        if (!rootRef.current) {
          return
        }
        const { deltaY } = event
        const scale = cap(transform.current.scale + 0.025 * deltaY, 1, 4)
        setTransform({
          ...transform.current,
          scale,
        })
      }}
      onDoubleClick={event => {
        event.preventDefault()
        setTransform({ scale: 1, translateX: 0, translateY: 0 })
      }}
      className={clsx(stylesRoot, !blobUrls && stylesRootLoading, className)}
    >
      {blobUrls ? (
        <div ref={previewRef} className={stylesPages}>
          {blobUrls.map((blobUrl, idx) => (
            <div
              key={idx}
              className={stylesPage}
              style={{
                background: `url("${blobUrl}") center center / contain no-repeat`,
              }}
            />
          ))}
        </div>
      ) : (
        <LoadingView />
      )}
    </div>
  )
}

function cap(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

function l2(a: number, b: number): number {
  return Math.sqrt(a * a + b * b)
}

const stylesRoot = css`
  box-sizing: border-box;
  border: 1px solid var(--color-neutral-dark);
  background-color: var(--color-neutral);
  overflow: hidden;
  width: 100%;
  height: 100%;
  user-select: none;
  touch-action: none;
`

const stylesRootLoading = css`
  display: grid;
`

const stylesPages = css`
  display: grid;
  grid-gap: var(--spacing-small);
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  padding: var(--spacing-small);
  width: 100%;
  height: 100%;
  box-sizing: border-box;
`

const stylesPage = css`
  width: 100%;
  height: 100%;
`
