import React from 'react'
import { useSearchParams } from 'react-router-dom'

import { useEnterExitList } from '../hooks/useEnterExitList'
import { AccountDialog } from '../views/accounts/AccountDialog'
import { AssetDialog } from '../views/assets/AssetDialog'
import { AttachmentDialog } from '../views/attachments/AttachmentDialog'
import { PortfolioDialog } from '../views/portfolios/PortfolioDialog'
import { TransactionDialog } from '../views/transactions/TransactionDialog'
import { Dialog } from './Dialog'

export interface DialogContentProps<T> {
  dialogId: number
  closeDialog: (value: T | undefined) => void
}

interface DialogInstance<P> {
  id: number
  parentId?: number
  urlId?: string
  open: boolean
  closeDialog: (value: DialogContentReturnType<P> | undefined) => void
  component: React.FC<P>
  props: DialogContentOwnProps<P>
}

type DialogContentReturnType<P> = P extends DialogContentProps<infer T> ? T : never
type DialogContentOwnProps<P> = P extends DialogContentProps<infer T> ? Omit<P, keyof DialogContentProps<T>> : never

interface ContextValue {
  openDialog: <P>(
    component: React.ComponentType<P>,
    props: DialogContentOwnProps<P>,
    parentId?: number
  ) => Promise<DialogContentReturnType<P> | undefined>
}

const Context = React.createContext<ContextValue>({
  openDialog: async () => {
    throw new Error()
  },
})

export interface DialogsContextProps {
  children: React.ReactElement | ((value: ContextValue) => React.ReactElement)
}

export const DialogsContext: React.FC<DialogsContextProps> = ({ children }) => {
  const nextDialogId = React.useRef(0)
  const [_dialogs, setDialogs] = React.useState<DialogInstance<any>[]>([])
  const dialogs = useEnterExitList<DialogInstance<any>, 'open'>(_dialogs, d => d.id, {
    enterMillis: 100,
    enterOverride: { open: false },
    exitMillis: 1000,
    exitOverride: { open: false },
  })
  const [searchParams, setSearchParams] = useSearchParams()

  const openDialog: ContextValue['openDialog'] = React.useCallback(
    (component, props, dialogParentId) => {
      const dialogId = nextDialogId.current++
      const dialogUrlId = getUrlIdFromDialog({ component: component as any, props })
      const promise = new Promise<any>(resolve => {
        const instance: DialogInstance<any> = {
          id: dialogId,
          parentId: dialogParentId,
          urlId: dialogUrlId,
          open: true,
          closeDialog: value => {
            setDialogs(dialogs => dialogs.filter(d => d.id !== dialogId))
            if (dialogUrlId) {
              setSearchParams(
                params => {
                  if (params.get('dialog') === dialogUrlId) {
                    params.delete('dialog')
                    return params
                  }
                  return params
                },
                {
                  replace: true,
                }
              )
            }
            resolve(value)
          },
          component: component as any,
          props,
        }
        setDialogs(dialogs => [...dialogs, instance])
        if (dialogUrlId) {
          setSearchParams(
            params => {
              params.set('dialog', dialogUrlId)
              return params
            },
            {
              replace: true,
            }
          )
        }
      })
      return promise
    },
    [dialogs]
  )

  React.useEffect(() => {
    const dialogUrlId = searchParams.get('dialog')
    if (dialogUrlId && !dialogs.find(d => d.urlId === dialogUrlId)) {
      const info = getDialogFromUrlId(dialogUrlId)
      if (info) {
        openDialog(info.component, info.props)
      }
    }
  }, [])

  const value = React.useMemo(() => ({ openDialog }), [openDialog])

  const renderDialogs = React.useCallback(
    (parentId?: number) => {
      return dialogs
        .filter(d => d.parentId === parentId)
        .map(({ id, open, closeDialog, component: Component, props }) => (
          <Dialog key={id} show={open} onClose={() => closeDialog(undefined)}>
            <Component dialogId={id} closeDialog={closeDialog} {...props} />
            {renderDialogs(id)}
          </Dialog>
        ))
    },
    [dialogs]
  )

  return (
    <Context.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
      {renderDialogs()}
    </Context.Provider>
  )
}

export function useDialogs() {
  return React.useContext(Context)
}

interface DialogInfo {
  component: React.ComponentType<DialogContentProps<any>>
  props: DialogContentOwnProps<any>
}

function getUrlIdFromDialog(info: DialogInfo): string | undefined {
  if (info.component === PortfolioDialog) {
    const { mode } = info.props as DialogContentOwnProps<React.ComponentProps<typeof PortfolioDialog>>
    return mode.type === 'create' ? 'portfolio-create' : `portfolio-edit-${mode.portfolioId}`
  }
  if (info.component === AccountDialog) {
    const { mode } = info.props as DialogContentOwnProps<React.ComponentProps<typeof AccountDialog>>
    return mode.type === 'create' ? 'account-create' : `account-edit-${mode.accountId}`
  }
  if (info.component === AssetDialog) {
    const { mode } = info.props as DialogContentOwnProps<React.ComponentProps<typeof AssetDialog>>
    return mode.type === 'create' ? 'asset-create' : `asset-edit-${mode.assetId}`
  }
  if (info.component === TransactionDialog) {
    const { mode } = info.props as DialogContentOwnProps<React.ComponentProps<typeof TransactionDialog>>
    return mode.type === 'create' ? 'transaction-create' : `transaction-edit-${mode.transactionId}`
  }
  if (info.component === AttachmentDialog) {
    const { attachmentId } = info.props as DialogContentOwnProps<React.ComponentProps<typeof AttachmentDialog>>
    return `attachment-edit-${attachmentId}`
  }
  return undefined
}

function getDialogFromUrlId(urlId: string): DialogInfo | undefined {
  if (urlId.startsWith('portfolio-')) {
    if (urlId === 'portfolio-create') {
      return {
        component: PortfolioDialog as any,
        props: {
          mode: { type: 'create' },
        } as DialogContentOwnProps<React.ComponentProps<typeof PortfolioDialog>>,
      }
    }
    if (urlId.startsWith('portfolio-edit-')) {
      return {
        component: PortfolioDialog as any,
        props: {
          mode: { type: 'edit', portfolioId: urlId.substring('portfolio-edit-'.length) },
        } as DialogContentOwnProps<React.ComponentProps<typeof PortfolioDialog>>,
      }
    }
  }
  if (urlId.startsWith('account-')) {
    if (urlId === 'account-create') {
      return {
        component: AccountDialog as any,
        props: {
          mode: { type: 'create' },
        } as DialogContentOwnProps<React.ComponentProps<typeof AccountDialog>>,
      }
    }
    if (urlId.startsWith('account-edit-')) {
      return {
        component: AccountDialog as any,
        props: {
          mode: { type: 'edit', accountId: urlId.substring('account-edit-'.length) },
        } as DialogContentOwnProps<React.ComponentProps<typeof AccountDialog>>,
      }
    }
  }
  if (urlId.startsWith('asset-')) {
    if (urlId === 'asset-create') {
      return {
        component: AssetDialog as any,
        props: {
          mode: { type: 'create' },
        } as DialogContentOwnProps<React.ComponentProps<typeof AssetDialog>>,
      }
    }
    if (urlId.startsWith('asset-edit-')) {
      return {
        component: AssetDialog as any,
        props: {
          mode: { type: 'edit', assetId: urlId.substring('asset-edit-'.length) },
        } as DialogContentOwnProps<React.ComponentProps<typeof AssetDialog>>,
      }
    }
  }
  if (urlId.startsWith('transaction-')) {
    if (urlId === 'transaction-create') {
      return {
        component: TransactionDialog as any,
        props: {
          mode: { type: 'create' },
        } as DialogContentOwnProps<React.ComponentProps<typeof TransactionDialog>>,
      }
    }
    if (urlId.startsWith('transaction-edit-')) {
      return {
        component: TransactionDialog as any,
        props: {
          mode: { type: 'edit', transactionId: urlId.substring('transaction-edit-'.length) },
        } as DialogContentOwnProps<React.ComponentProps<typeof TransactionDialog>>,
      }
    }
  }
  if (urlId.startsWith('attachment-edit-')) {
    return {
      component: AttachmentDialog as any,
      props: {
        attachmentId: urlId.substring('attachment-edit-'.length),
      } as DialogContentOwnProps<React.ComponentProps<typeof AttachmentDialog>>,
    }
  }
  return undefined
}
