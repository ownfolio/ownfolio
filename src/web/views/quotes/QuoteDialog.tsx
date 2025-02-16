import { css } from '@linaria/core'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { createEmptyQuote, Quote } from '../../../shared/models/Quote'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { Form } from '../../components/Form'
import { calculatorInputProps, Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { SelectAsset } from '../../components/SelectAsset'
import { LoadingView } from '../loading/LoadingView'

type Mode = { type: 'create'; assetId: string } | { type: 'edit'; assetId: string; date: string }

interface Props extends DialogContentProps<Quote> {
  mode: Mode
}

export const QuoteDialog: React.FC<Props> = ({ mode, closeDialog }) => {
  const queryClient = useQueryClient()
  const [quote, setQuote] = React.useState<Quote | undefined>(undefined)
  const [state, setState] = React.useState<'busy' | 'done' | undefined>(undefined)

  React.useEffect(() => {
    if (mode.type === 'create') {
      setQuote(createEmptyQuote(mode.assetId))
    } else {
      rpcClient
        .retrieveQuoteForAsset({ id: mode.assetId, date: mode.date })
        .then(r => r.data || createEmptyQuote(mode.assetId))
        .then(setQuote)
        .catch(err => {
          closeDialog(undefined)
          Promise.reject(err)
        })
    }
  }, [])
  if (!quote) {
    return <LoadingView />
  }

  return (
    <Form
      onSubmit={async event => {
        event.preventDefault()
        try {
          setState('busy')
          await rpcClient.updateQuoteForAsset(quote)
          await queryClient.invalidateQueries()
          setState('done')
          closeDialog(undefined)
        } finally {
          setState(undefined)
        }
      }}
    >
      <Label text="Asset" htmlFor="assetId">
        <SelectAsset
          id="assetId"
          value={quote.assetId}
          onChange={event => setQuote({ ...quote, assetId: event.target.value })}
          disabled
          required
        />
      </Label>
      <Label text="Date" htmlFor="date">
        <Input
          id="date"
          type="date"
          value={quote.date}
          onChange={event => setQuote(quote => ({ ...quote!, date: event.target.value }))}
          required
          autoFocus
        />
      </Label>
      <Label text="Open" htmlFor="open">
        <Input
          id="open"
          className={stylesNumberField}
          {...calculatorInputProps(quote.open || '', value => setQuote(quote => ({ ...quote!, open: value || null })))}
        />
      </Label>
      <Label text="High" htmlFor="high">
        <Input
          id="high"
          className={stylesNumberField}
          {...calculatorInputProps(quote.high || '', value => setQuote(quote => ({ ...quote!, high: value || null })))}
        />
      </Label>
      <Label text="Low" htmlFor="low">
        <Input
          id="low"
          className={stylesNumberField}
          {...calculatorInputProps(quote.low || '', value => setQuote(quote => ({ ...quote!, low: value || null })))}
        />
      </Label>
      <Label text="Close" htmlFor="close">
        <Input
          id="close"
          className={stylesNumberField}
          {...calculatorInputProps(quote.close, value => setQuote(quote => ({ ...quote!, close: value })))}
          required
        />
      </Label>
      <Button type="submit" variant="primary" busy={state === 'busy'} check={state === 'done'} disabled={!!state}>
        Save
      </Button>
      <Button type="reset" onClick={() => closeDialog(undefined)}>
        Cancel
      </Button>
    </Form>
  )
}

const stylesNumberField = css`
  font-family: monospace;
`
