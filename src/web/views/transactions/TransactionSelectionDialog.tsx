import { css } from '@linaria/core'
import React from 'react'

import { Transaction } from '../../../shared/models/Transaction'
import { rpcClient } from '../../api'
import { Button } from '../../components/Button'
import { DialogContentProps } from '../../components/DialogsContext'
import { SelectTransaction } from '../../components/SelectTransaction'

interface Props extends DialogContentProps<Transaction> {}

export const TransactionSelectionDialog: React.FC<Props> = ({ closeDialog }) => {
  const [transactionId, setTransactionId] = React.useState<string | undefined>(undefined)
  return (
    <div className={stylesRoot}>
      <SelectTransaction value={transactionId} onChange={event => setTransactionId(event.target.value)} />
      <Button
        variant="primary"
        onClick={async () => {
          if (transactionId) {
            const transaction = await rpcClient.retrieveTransaction({ id: transactionId }).then(r => r.data)
            closeDialog(transaction)
          }
        }}
        disabled={!transactionId}
      >
        Select
      </Button>
      <Button onClick={() => closeDialog(undefined)}>Cancel</Button>
    </div>
  )
}

const stylesRoot = css`
  display: grid;
  grid-gap: var(--spacing-large);
`
