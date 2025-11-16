import BigNumber from 'bignumber.js'
import React from 'react'

import { Attachment } from '../../../shared/models/Attachment'
import { Transaction, TransactionData } from '../../../shared/models/Transaction'
import { dateFormat, dateMinus, dateParse } from '../../../shared/utils/date'
import { rpcClient } from '../../api'
import { BigNumberInput } from '../../components/Input'
import { Label } from '../../components/Label'
import { SelectAccount } from '../../components/SelectAccount'
import { SelectAsset } from '../../components/SelectAsset'
import { SuggestionsMenu } from './SuggestionsMenu'

export const TransactionDataFields: React.FC<{
  transaction: Transaction
  data: TransactionData
  setData: (data: TransactionData) => void
  previewedAttachment?: Attachment
}> = ({ transaction, data, setData, previewedAttachment }): React.ReactElement => {
  switch (data.type) {
    case 'cashDeposit':
      return (
        <CashDepositTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'cashWithdrawal':
      return (
        <CashWithdrawalTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'cashTransfer':
      return (
        <CashTransferTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'assetBuy':
      return (
        <AssetBuyTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'assetSell':
      return (
        <AssetSellTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'assetDeposit':
      return (
        <AssetDepositTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'assetWithdrawal':
      return (
        <AssetWithdrawalTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'assetTransfer':
      return (
        <AssetTransferTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'interest':
      return (
        <InterestTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'dividend':
      return (
        <DividendTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'tax':
      return (
        <TaxTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
    case 'fee':
      return (
        <FeeTransactionDataFields
          transaction={transaction}
          data={data}
          setData={setData}
          previewedAttachment={previewedAttachment}
        />
      )
  }
}

const CashDepositTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'cashDeposit' }>
  setData: (data: Extract<TransactionData, { type: 'cashDeposit' }>) => void
  previewedAttachment?: Attachment
}> = ({ data, setData }) => {
  return (
    <>
      <Label text="Cash Account" htmlFor="cashAccountId">
        <SelectAccount
          id="cashAccountId"
          value={data.cashAccountId}
          onChange={event => setData({ ...data, cashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Cash Amount" htmlFor="cashAmount">
        <BigNumberInput
          id="cashAmount"
          value={data.cashAmount}
          onValueChange={value => setData({ ...data, cashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const CashWithdrawalTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'cashWithdrawal' }>
  setData: (data: Extract<TransactionData, { type: 'cashWithdrawal' }>) => void
  previewedAttachment?: Attachment
}> = ({ data, setData }) => {
  return (
    <>
      <Label text="Cash Account" htmlFor="cashAccountId">
        <SelectAccount
          id="cashAccountId"
          value={data.cashAccountId}
          onChange={event => setData({ ...data, cashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Cash Amount" htmlFor="cashAmount">
        <BigNumberInput
          id="cashAmount"
          value={data.cashAmount}
          onValueChange={value => setData({ ...data, cashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const CashTransferTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'cashTransfer' }>
  setData: (data: Extract<TransactionData, { type: 'cashTransfer' }>) => void
  previewedAttachment?: Attachment
}> = ({ data, setData }) => {
  return (
    <>
      <Label text="From Account" htmlFor="fromCashAccountId">
        <SelectAccount
          id="fromCashAccountId"
          value={data.fromCashAccountId}
          onChange={event => setData({ ...data, fromCashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="To Account" htmlFor="toCashAccountId">
        <SelectAccount
          id="toCashAccountId"
          value={data.toCashAccountId}
          onChange={event => setData({ ...data, toCashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Cash Amount" htmlFor="cashAmount">
        <BigNumberInput
          id="cashAmount"
          value={data.cashAmount}
          onValueChange={value => setData({ ...data, cashAmount: value })}
          required
        />
      </Label>
      <Label text="Fee Cash Amount" htmlFor="feeCashAmount">
        <BigNumberInput
          id="feeCashAmount"
          value={data.feeCashAmount}
          onValueChange={value => setData({ ...data, feeCashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const AssetBuyTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'assetBuy' }>
  setData: (data: Extract<TransactionData, { type: 'assetBuy' }>) => void
  previewedAttachment?: Attachment
}> = ({ transaction, data, setData, previewedAttachment }) => {
  return (
    <>
      <Label text="Asset Account" htmlFor="assetAccountId">
        <SelectAccount
          id="assetAccountId"
          value={data.assetAccountId}
          onChange={event => setData({ ...data, assetAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Asset" htmlFor="assetId">
        <SelectAsset
          id="assetId"
          value={data.assetId}
          onChange={event => setData({ ...data, assetId: event.target.value })}
          required
        />
      </Label>
      <Label
        text="Asset Amount"
        htmlFor="assetAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || !['assetBuy', 'assetSell'].includes(content.parsed.type)) {
                    return undefined
                  }
                  return content.parsed.assetAmount
                },
                deps: [previewedAttachment],
              },
            ]}
            value={data.assetAmount.toString()}
            setValue={value => setData({ ...data, assetAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="assetAmount"
          value={data.assetAmount}
          onValueChange={value => setData({ ...data, assetAmount: value })}
          required
        />
      </Label>
      <Label text="Cash Account" htmlFor="cashAccountId">
        <SelectAccount
          id="cashAccountId"
          value={data.cashAccountId}
          onChange={event => setData({ ...data, cashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label
        text="Cash Amount"
        htmlFor="cashAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || content.parsed.type !== 'assetBuy') {
                    return undefined
                  }
                  return content.parsed.assetPrice
                },
                deps: [previewedAttachment],
              },
              {
                label: value => `Fill "${value}" from quotes`,
                value: async () => {
                  const { data: quote } = await rpcClient.retrieveQuoteForAsset({
                    id: data.assetId,
                    date: transaction.date,
                  })
                  if (!quote) {
                    return undefined
                  }
                  const midDayPrice = BigNumber(quote.close)
                    .plus(quote.open || quote.close)
                    .dividedBy(2)
                  const cashAmount = midDayPrice.multipliedBy(data.assetAmount)
                  return cashAmount.isFinite() ? cashAmount.toFixed(0) : undefined
                },
                deps: [data.assetId, transaction.date, data.assetAmount],
              },
            ]}
            value={data.cashAmount.toString()}
            setValue={value => setData({ ...data, cashAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput value={data.cashAmount} onValueChange={value => setData({ ...data, cashAmount: value })} />
      </Label>
      <Label
        text="Fee Cash Amount"
        htmlFor="feeCashAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || content.parsed.type !== 'assetBuy') {
                    return undefined
                  }
                  return content.parsed.fee
                },
                deps: [previewedAttachment],
              },
            ]}
            value={data.feeCashAmount.toString()}
            setValue={value => setData({ ...data, feeCashAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="feeCashAmount"
          value={data.feeCashAmount}
          onValueChange={value => setData({ ...data, feeCashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const AssetSellTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'assetSell' }>
  setData: (data: Extract<TransactionData, { type: 'assetSell' }>) => void
  previewedAttachment?: Attachment
}> = ({ transaction, data, setData, previewedAttachment }) => {
  return (
    <>
      <Label text="Asset Account" htmlFor="assetAccountId">
        <SelectAccount
          id="assetAccountId"
          value={data.assetAccountId}
          onChange={event => setData({ ...data, assetAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Asset" htmlFor="assetId">
        <SelectAsset
          id="assetId"
          value={data.assetId}
          onChange={event => setData({ ...data, assetId: event.target.value })}
        />
      </Label>
      <Label
        text="Asset Amount"
        htmlFor="assetAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || !['assetBuy', 'assetSell'].includes(content.parsed.type)) {
                    return undefined
                  }
                  return content.parsed.assetAmount
                },
                deps: [previewedAttachment],
              },
            ]}
            value={data.assetAmount.toString()}
            setValue={value => setData({ ...data, assetAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="assetAmount"
          value={data.assetAmount}
          onValueChange={value => setData({ ...data, assetAmount: value })}
          required
        />
      </Label>
      <Label text="Cash Account" htmlFor="cashAccountId">
        <SelectAccount
          id="cashAccountId"
          value={data.cashAccountId}
          onChange={event => setData({ ...data, cashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label
        text="Cash Amount"
        htmlFor="cashAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || content.parsed.type !== 'assetSell') {
                    return undefined
                  }
                  return content.parsed.assetPrice
                },
                deps: [previewedAttachment],
              },
              {
                label: value => `Fill "${value}" from quotes`,
                value: async () => {
                  const { data: quote } = await rpcClient.retrieveQuoteForAsset({
                    id: data.assetId,
                    date: transaction.date,
                  })
                  if (!quote) {
                    return undefined
                  }
                  const midDayPrice = BigNumber(quote.close)
                    .plus(quote.open || quote.close)
                    .dividedBy(2)
                  const cashAmount = midDayPrice.multipliedBy(data.assetAmount)
                  return cashAmount.isFinite() ? cashAmount.toFixed(0) : undefined
                },
                deps: [data.assetId, transaction.date, data.assetAmount],
              },
            ]}
            value={data.cashAmount.toString()}
            setValue={value => setData({ ...data, cashAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="cashAmount"
          value={data.cashAmount}
          onValueChange={value => setData({ ...data, cashAmount: value })}
          required
        />
      </Label>
      <Label
        text="Fee Cash Amount"
        htmlFor="feeCashAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || content.parsed.type !== 'assetSell') {
                    return undefined
                  }
                  return content.parsed.fee
                },
                deps: [previewedAttachment],
              },
            ]}
            value={data.feeCashAmount.toString()}
            setValue={value => setData({ ...data, feeCashAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="feeCashAmount"
          value={data.feeCashAmount}
          onValueChange={value => setData({ ...data, feeCashAmount: value })}
          required
        />
      </Label>
      <Label
        text="Tax Cash Amount"
        htmlFor="taxCashAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || content.parsed.type !== 'assetSell') {
                    return undefined
                  }
                  return content.parsed.tax
                },
                deps: [previewedAttachment],
              },
            ]}
            value={data.taxCashAmount.toString()}
            setValue={value => setData({ ...data, taxCashAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="taxCashAmount"
          value={data.taxCashAmount}
          onValueChange={value => setData({ ...data, taxCashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const AssetDepositTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'assetDeposit' }>
  setData: (data: Extract<TransactionData, { type: 'assetDeposit' }>) => void
  previewedAttachment?: Attachment
}> = ({ transaction, data, setData, previewedAttachment }) => {
  return (
    <>
      <Label text="Asset Account" htmlFor="assetAccountId">
        <SelectAccount
          id="assetAccountId"
          value={data.assetAccountId}
          onChange={event => setData({ ...data, assetAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Asset" htmlFor="assetId">
        <SelectAsset
          id="assetId"
          value={data.assetId}
          onChange={event => setData({ ...data, assetId: event.target.value })}
          required
        />
      </Label>
      <Label
        text="Asset Amount"
        htmlFor="assetAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || !['assetBuy', 'assetSell'].includes(content.parsed.type)) {
                    return undefined
                  }
                  return content.parsed.assetAmount
                },
                deps: [previewedAttachment],
              },
            ]}
            value={data.assetAmount.toString()}
            setValue={value => setData({ ...data, assetAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="assetAmount"
          value={data.assetAmount}
          onValueChange={value => setData({ ...data, assetAmount: value })}
          required
        />
      </Label>
      <Label
        text="Cash Amount"
        htmlFor="cashAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from quotes`,
                value: async () => {
                  const { data: quote } = await rpcClient.retrieveQuoteForAsset({
                    id: data.assetId,
                    date: transaction.date,
                  })
                  if (!quote) {
                    return undefined
                  }
                  const midDayPrice = BigNumber(quote.close)
                    .plus(quote.open || quote.close)
                    .dividedBy(2)
                  const cashAmount = midDayPrice.multipliedBy(data.assetAmount)
                  return cashAmount.isFinite() ? cashAmount.toFixed(0) : undefined
                },
                deps: [data.assetId, transaction.date, data.assetAmount],
              },
            ]}
            value={data.cashAmount.toString()}
            setValue={value => setData({ ...data, cashAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="cashAmount"
          value={data.cashAmount}
          onValueChange={value => setData({ ...data, cashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const AssetWithdrawalTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'assetWithdrawal' }>
  setData: (data: Extract<TransactionData, { type: 'assetWithdrawal' }>) => void
  previewedAttachment?: Attachment
}> = ({ transaction, data, setData, previewedAttachment }) => {
  return (
    <>
      <Label text="Asset Account" htmlFor="assetAccountId">
        <SelectAccount
          id="assetAccountId"
          value={data.assetAccountId}
          onChange={event => setData({ ...data, assetAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Asset" htmlFor="assetId">
        <SelectAsset
          id="assetId"
          value={data.assetId}
          onChange={event => setData({ ...data, assetId: event.target.value })}
          required
        />
      </Label>
      <Label
        text="Asset Amount"
        htmlFor="assetAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || !['assetBuy', 'assetSell'].includes(content.parsed.type)) {
                    return undefined
                  }
                  return content.parsed.assetAmount
                },
                deps: [previewedAttachment],
              },
            ]}
            value={data.assetAmount.toString()}
            setValue={value => setData({ ...data, assetAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="assetAmount"
          value={data.assetAmount}
          onValueChange={value => setData({ ...data, assetAmount: value })}
          required
        />
      </Label>
      <Label
        text="Cash Amount"
        htmlFor="cashAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from quotes`,
                value: async () => {
                  const { data: quote } = await rpcClient.retrieveQuoteForAsset({
                    id: data.assetId,
                    date: transaction.date,
                  })
                  if (!quote) {
                    return undefined
                  }
                  const midDayPrice = BigNumber(quote.close)
                    .plus(quote.open || quote.close)
                    .dividedBy(2)
                  const cashAmount = midDayPrice.multipliedBy(data.assetAmount)
                  return cashAmount.isFinite() ? cashAmount.toFixed(0) : undefined
                },
                deps: [data.assetId, transaction.date, data.assetAmount],
              },
            ]}
            value={data.cashAmount.toString()}
            setValue={value => setData({ ...data, cashAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="cashAmount"
          value={data.cashAmount}
          onValueChange={value => setData({ ...data, cashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const AssetTransferTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'assetTransfer' }>
  setData: (data: Extract<TransactionData, { type: 'assetTransfer' }>) => void
  previewedAttachment?: Attachment
}> = ({ data, setData, previewedAttachment }) => {
  return (
    <>
      <Label text="From Asset Account" htmlFor="fromAssetAccountId">
        <SelectAccount
          id="fromAssetAccountId"
          value={data.fromAssetAccountId}
          onChange={event => setData({ ...data, fromAssetAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="To Asset Account" htmlFor="toAssetAccountId">
        <SelectAccount
          id="toAccountId"
          value={data.toAssetAccountId}
          onChange={event => setData({ ...data, toAssetAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Asset" htmlFor="assetId">
        <SelectAsset
          id="assetId"
          value={data.assetId}
          onChange={event => setData({ ...data, assetId: event.target.value })}
          required
        />
      </Label>
      <Label
        text="Asset Amount"
        htmlFor="assetAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from attachment`,
                value: async () => {
                  if (!previewedAttachment) {
                    return undefined
                  }
                  const { data: content } = await rpcClient.retrieveAttachmentContent({ id: previewedAttachment.id })
                  if (!content || !content.parsed || !['assetBuy', 'assetSell'].includes(content.parsed.type)) {
                    return undefined
                  }
                  return content.parsed.assetAmount
                },
                deps: [previewedAttachment],
              },
            ]}
            value={data.assetAmount.toString()}
            setValue={value => setData({ ...data, assetAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="assetAmount"
          value={data.assetAmount}
          onValueChange={value => setData({ ...data, assetAmount: value })}
          required
        />
      </Label>
      <Label text="Fee Asset Amount" htmlFor="feeAssetAmount">
        <BigNumberInput
          id="feeAssetAmount"
          value={data.feeAssetAmount}
          onValueChange={value => setData({ ...data, feeAssetAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const InterestTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'interest' }>
  setData: (data: Extract<TransactionData, { type: 'interest' }>) => void
  previewedAttachment?: Attachment
}> = ({ data, setData }) => {
  return (
    <>
      <Label text="Cash Account" htmlFor="cashAccountId">
        <SelectAccount
          id="cashAccountId"
          value={data.cashAccountId}
          onChange={event => setData({ ...data, cashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Cash Amount" htmlFor="cashAmount">
        <BigNumberInput
          id="cashAmount"
          value={data.cashAmount}
          onValueChange={value => setData({ ...data, cashAmount: value })}
          required
        />
      </Label>
      <Label text="Tax Cash Amount" htmlFor="taxCashAmount">
        <BigNumberInput
          id="taxCashAmount"
          value={data.taxCashAmount}
          onValueChange={value => setData({ ...data, taxCashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const DividendTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'dividend' }>
  setData: (data: Extract<TransactionData, { type: 'dividend' }>) => void
  previewedAttachment?: Attachment
}> = ({ transaction, data, setData }) => {
  return (
    <>
      <Label text="Cash Account" htmlFor="cashAccountId">
        <SelectAccount
          id="cashAccountId"
          value={data.cashAccountId}
          onChange={event => setData({ ...data, cashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Cash Amount" htmlFor="cashAmount">
        <BigNumberInput
          id="cashAmount"
          value={data.cashAmount}
          onValueChange={value => setData({ ...data, cashAmount: value })}
          required
        />
      </Label>
      <Label text="Asset Account" htmlFor="assetAccountId">
        <SelectAccount
          id="assetAccountId"
          value={data.assetAccountId}
          onChange={event => setData({ ...data, assetAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Asset" htmlFor="assetId">
        <SelectAsset
          id="assetId"
          value={data.assetId}
          onChange={event => setData({ ...data, assetId: event.target.value })}
          required
        />
      </Label>
      <Label
        text="Asset Amount"
        htmlFor="assetAmount"
        addition={
          <SuggestionsMenu
            valueGenerators={[
              {
                label: value => `Fill "${value}" from quotes`,
                value: async () => {
                  const { data: positions } = await rpcClient.evaluatePositions({
                    when: {
                      type: 'date',
                      date: dateFormat(dateMinus(dateParse(transaction.date), 'day', 1), 'yyyy-MM-dd'),
                    },
                  })
                  const openAccountAssetPosition = positions.value.openAssetPositions.find(
                    p => p.type === 'open' && p.accountId === data.assetAccountId && p.assetId === data.assetId
                  )
                  return openAccountAssetPosition ? openAccountAssetPosition.amount.toString() : undefined
                },
                deps: [data.assetId, transaction.date, data.assetAmount],
              },
            ]}
            value={data.assetAmount.toString()}
            setValue={value => setData({ ...data, cashAmount: BigNumber(value) })}
          />
        }
      >
        <BigNumberInput
          id="assetAmount"
          value={data.assetAmount}
          onValueChange={value => setData({ ...data, assetAmount: value })}
          required
        />
      </Label>
      <Label text="Tax Cash Amount" htmlFor="taxCashAmount">
        <BigNumberInput
          id="taxCashAmount"
          value={data.taxCashAmount}
          onValueChange={value => setData({ ...data, taxCashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const TaxTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'tax' }>
  setData: (data: Extract<TransactionData, { type: 'tax' }>) => void
  previewedAttachment?: Attachment
}> = ({ data, setData }) => {
  return (
    <>
      <Label text="Cash Account" htmlFor="cashAccountId">
        <SelectAccount
          id="cashAccountId"
          value={data.cashAccountId}
          onChange={event => setData({ ...data, cashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Tax Cash Amount" htmlFor="taxCashAmount">
        <BigNumberInput
          id="taxCashAmount"
          value={data.taxCashAmount}
          onValueChange={value => setData({ ...data, taxCashAmount: value })}
          required
        />
      </Label>
    </>
  )
}

const FeeTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'fee' }>
  setData: (data: Extract<TransactionData, { type: 'fee' }>) => void
  previewedAttachment?: Attachment
}> = ({ data, setData }) => {
  return (
    <>
      <Label text="Cash Account" htmlFor="cashAccountId">
        <SelectAccount
          id="cashAccountId"
          value={data.cashAccountId}
          onChange={event => setData({ ...data, cashAccountId: event.target.value })}
          required
        />
      </Label>
      <Label text="Fee Cash Amount" htmlFor="feeCashAmount">
        <BigNumberInput
          id="feeCashAmount"
          value={data.feeCashAmount}
          onValueChange={value => setData({ ...data, feeCashAmount: value })}
          required
        />
      </Label>
    </>
  )
}
