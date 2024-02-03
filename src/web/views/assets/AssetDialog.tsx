import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { Asset, AssetQuoteProvider, createEmptyAsset } from '../../../shared/models/Asset'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps, DialogOpts } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { SelectCurrency } from '../../components/SelectCurrency'
import { SelectQuoteProvider } from '../../components/SelectQuoteProvider'
import { LoadingView } from '../loading/LoadingView'

type Mode = { type: 'create'; assetTemplate?: Omit<Asset, 'id' | 'createdAt'> } | { type: 'edit'; assetId: string }

interface Props extends DialogContentProps<Asset> {
  mode: Mode
}

export const AssetDialog: React.FC<Props> & DialogOpts = ({ mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const [asset, setAsset] = React.useState<Asset | undefined>(undefined)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  React.useEffect(() => {
    if (mode.type === 'create') {
      setAsset({
        ...createEmptyAsset(),
        ...mode.assetTemplate,
      })
    } else {
      rpcClient
        .retrieveAsset({ id: mode.assetId })
        .then(setAsset)
        .catch(err => {
          closeDialog(undefined)
          Promise.reject(err)
        })
    }
  }, [])
  if (!asset) {
    return <LoadingView />
  }

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          if (mode.type === 'create') {
            await rpcClient.createAsset(asset)
          } else {
            await rpcClient.updateAsset(asset)
          }
          await queryClient.invalidateQueries()
          setState('done')
          closeDialog(undefined)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Name" htmlFor="name">
        <Input
          id="name"
          type="text"
          value={asset.name}
          onChange={event => setAsset(asset => ({ ...asset!, name: event.target.value }))}
          required
          autoFocus
        />
      </Label>
      <Label text="Number" htmlFor="number">
        <Input
          id="number"
          type="text"
          value={asset.number}
          onChange={event => setAsset(asset => ({ ...asset!, number: event.target.value }))}
        />
      </Label>
      <Label text="Symbol" htmlFor="symbol">
        <Input
          id="symbol"
          type="text"
          value={asset.symbol}
          onChange={event => setAsset(asset => ({ ...asset!, symbol: event.target.value }))}
          required
          maxLength={8}
        />
      </Label>
      <Label text="Denomination" htmlFor="denomination">
        <Input
          id="denomination"
          type="numeric"
          min={0}
          max={20}
          value={asset.denomination}
          onChange={event => setAsset(asset => ({ ...asset!, denomination: Number.parseInt(event.target.value) || 0 }))}
          required
        />
      </Label>
      <Label text="Currency" htmlFor="currency">
        <SelectCurrency
          id="currency"
          value={asset.currency}
          onChange={event => setAsset(asset => ({ ...asset!, currency: event.target.value }))}
          required
        />
      </Label>
      <AssetQuoteProviderFields
        quoteProvider={asset.quoteProvider}
        setQuoteProvider={quoteProvider => setAsset(asset => ({ ...asset!, quoteProvider: quoteProvider }))}
      />
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}

AssetDialog.requireExplicitClose = true

const AssetQuoteProviderFields: React.FC<{
  quoteProvider: AssetQuoteProvider | null
  setQuoteProvider: (quoteProvider: AssetQuoteProvider | null) => void
}> = ({ quoteProvider, setQuoteProvider }) => {
  return (
    <>
      <Label text="Quote Provider" htmlFor="quoteProvider">
        <SelectQuoteProvider
          id="quoteProvider"
          value={quoteProvider?.type}
          onChange={event => {
            switch (event.target.value) {
              case 'yahooFinance':
                setQuoteProvider({
                  type: 'yahooFinance',
                  symbol: '',
                  pauseUntil: null,
                })
                break
              default:
                setQuoteProvider(null)
                break
            }
          }}
          clearable
        />
      </Label>
      {quoteProvider?.type === 'yahooFinance' && (
        <>
          <Label text="Yahoo Finance Symbol" htmlFor="quoteProviderYahooFinanceSymbol">
            <Input
              id="quoteProviderYahooFinanceSymbol"
              type="text"
              value={quoteProvider.symbol}
              onChange={event =>
                setQuoteProvider({
                  ...quoteProvider,
                  symbol: event.target.value,
                })
              }
              required
            />
          </Label>
        </>
      )}
    </>
  )
}
