import { Dialog as HeadlessUIDialog, Transition } from '@headlessui/react'
import { css } from '@linaria/core'
import React from 'react'

import { LoadingView } from '../views/loading/LoadingView'

interface Props {
  show: boolean
  onClose: () => void
  children: React.ReactNode
}

export const Dialog: React.FC<Props> = ({ show, onClose, children }) => {
  return (
    <Transition show={show} as={React.Fragment}>
      <HeadlessUIDialog onClose={onClose} className={stylesRoot}>
        <Transition.Child
          enter={stylesBackdropEnter}
          enterFrom={stylesBackdropEnterFrom}
          enterTo={stylesBackdropEnterTo}
          leave={stylesBackdropLeave}
          leaveFrom={stylesBackdropLeaveFrom}
          leaveTo={stylesBackdropLeaveTo}
          as={React.Fragment}
        >
          <div className={stylesBackdrop} aria-hidden="true" />
        </Transition.Child>
        <div className={stylesContainer1}>
          <div className={stylesContainer2}>
            <Transition.Child
              enter={stylesDialogEnter}
              enterFrom={stylesDialogEnterFrom}
              enterTo={stylesDialogEnterTo}
              leave={stylesDialogLeave}
              leaveFrom={stylesDialogLeaveFrom}
              leaveTo={stylesDialogLeaveTo}
            >
              <HeadlessUIDialog.Panel className={stylesDialog}>
                <React.Suspense fallback={<LoadingView />}>{children}</React.Suspense>
              </HeadlessUIDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessUIDialog>
    </Transition>
  )
}

export const DialogTitle = HeadlessUIDialog.Title
export const DialogDescription = HeadlessUIDialog.Description

const stylesRoot = css`
  position: fixed;
  inset: 0;
  z-index: 1;
`

const stylesBackdrop = css`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
`

const stylesContainer1 = css`
  position: fixed;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
`

const stylesContainer2 = css`
  display: grid;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-large);
  padding-top: max(var(--spacing-large), var(--safe-area-inset-top));
  padding-bottom: max(var(--spacing-large), var(--safe-area-inset-bottom));
  padding-left: max(var(--spacing-large), var(--safe-area-inset-left));
  padding-right: max(var(--spacing-large), var(--safe-area-inset-right));
  box-sizing: border-box;
`

const stylesBackdropEnter = css`
  transition: opacity 0.3s ease;
`

const stylesBackdropEnterFrom = css`
  opacity: 0;
`

const stylesBackdropEnterTo = css`
  opacity: 1;
`

const stylesBackdropLeave = css`
  transition: opacity 0.3s ease;
`

const stylesBackdropLeaveFrom = css`
  opacity: 1;
`

const stylesBackdropLeaveTo = css`
  opacity: 0;
`

const stylesDialog = css`
  background-color: var(--color-neutral-lite);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.125);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-large);
  word-break: break-word;
`

const stylesDialogEnter = css`
  transition:
    opacity 0.15s ease,
    scale 0.15s ease;
`

const stylesDialogEnterFrom = css`
  opacity: 0;
  scale: 0.75;
`

const stylesDialogEnterTo = css`
  opacity: 1;
  scale: 1;
`

const stylesDialogLeave = css`
  transition:
    opacity 0.3s ease,
    scale 0.3s ease;
`

const stylesDialogLeaveFrom = css`
  opacity: 1;
  scale: 1;
`

const stylesDialogLeaveTo = css`
  opacity: 0;
  scale: 0.75;
`
