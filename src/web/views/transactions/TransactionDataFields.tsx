import { css } from '@linaria/core'
import BigNumber from 'bignumber.js'
import React from 'react'

import { Transaction, TransactionData } from '../../../shared/models/Transaction'
import { dateFormat, dateMinus, dateParse } from '../../../shared/utils/date'
import { rpcClient } from '../../api'
import { calculatorInputProps, Input } from '../../components/Input'
import { Label } from '../../components/Label'
import { SelectAccount } from '../../components/SelectAccount'
import { SelectAsset } from '../../components/SelectAsset'

export const TransactionDataFields: React.FC<{
  transaction: Transaction
  data: TransactionData
  setData: (data: TransactionData) => void
}> = ({ transaction, data, setData }): React.ReactElement => {
  switch (data.type) {
    case 'cashDeposit':
      return <CashDepositTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'cashWithdrawal':
      return <CashWithdrawalTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'cashTransfer':
      return <CashTransferTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'assetBuy':
      return <AssetBuyTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'assetSell':
      return <AssetSellTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'assetDeposit':
      return <AssetDepositTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'assetWithdrawal':
      return <AssetWithdrawalTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'assetTransfer':
      return <AssetTransferTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'interest':
      return <InterestTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'dividend':
      return <DividendTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'tax':
      return <TaxTransactionDataFields transaction={transaction} data={data} setData={setData} />
    case 'fee':
      return <FeeTransactionDataFields transaction={transaction} data={data} setData={setData} />
  }
}

const CashDepositTransactionDataFields: React.FC<{
  transaction: Transaction
  data: Extract<TransactionData, { type: 'cashDeposit' }>
  setData: (data: Extract<TransactionData, { type: 'cashDeposit' }>) => void
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
        <Input
          id="cashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.cashAmount, value => setData({ ...data, cashAmount: value }))}
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
        <Input
          id="cashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.cashAmount, value => setData({ ...data, cashAmount: value }))}
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
        <Input
          id="cashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.cashAmount, value => setData({ ...data, cashAmount: value }))}
          required
        />
      </Label>
      <Label text="Fee Cash Amount" htmlFor="feeCashAmount">
        <Input
          id="feeCashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.feeCashAmount, value => setData({ ...data, feeCashAmount: value }))}
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
}> = ({ transaction, data, setData }) => {
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
      <Label text="Asset Amount" htmlFor="assetAmount">
        <Input
          id="assetAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.assetAmount, value => setData({ ...data, assetAmount: value }))}
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
          <a
            href="#"
            tabIndex={-1}
            onClick={async event => {
              event.preventDefault()
              const quote = await rpcClient.retrieveQuoteForAsset({ id: data.assetId, date: transaction.date })
              if (quote) {
                const midDayPrice = BigNumber(quote.close)
                  .plus(quote.open || quote.close)
                  .dividedBy(2)
                const cashAmount = midDayPrice.multipliedBy(data.assetAmount)
                if (cashAmount.isFinite()) {
                  setData({ ...data, cashAmount: cashAmount.toFixed(0) })
                }
              }
            }}
          >
            (autofill)
          </a>
        }
      >
        <Input
          id="cashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.cashAmount, value => setData({ ...data, cashAmount: value }))}
          required
        />
      </Label>
      <Label text="Fee Cash Amount" htmlFor="feeCashAmount">
        <Input
          id="feeCashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.feeCashAmount, value => setData({ ...data, feeCashAmount: value }))}
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
}> = ({ transaction, data, setData }) => {
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
      <Label text="Asset Amount" htmlFor="assetAmount">
        <Input
          id="assetAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.assetAmount, value => setData({ ...data, assetAmount: value }))}
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
          <a
            href="#"
            tabIndex={-1}
            onClick={async event => {
              event.preventDefault()
              const quote = await rpcClient.retrieveQuoteForAsset({ id: data.assetId, date: transaction.date })
              if (quote) {
                const midDayPrice = BigNumber(quote.close)
                  .plus(quote.open || quote.close)
                  .dividedBy(2)
                const cashAmount = midDayPrice.multipliedBy(data.assetAmount)
                if (cashAmount.isFinite()) {
                  setData({ ...data, cashAmount: cashAmount.toFixed(0) })
                }
              }
            }}
          >
            (autofill)
          </a>
        }
      >
        <Input
          id="cashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.cashAmount, value => setData({ ...data, cashAmount: value }))}
          required
        />
      </Label>
      <Label text="Fee Cash Amount" htmlFor="feeCashAmount">
        <Input
          id="feeCashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.feeCashAmount, value => setData({ ...data, feeCashAmount: value }))}
          required
        />
      </Label>
      <Label text="Tax Cash Amount" htmlFor="taxCashAmount">
        <Input
          id="taxCashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.taxCashAmount, value => setData({ ...data, taxCashAmount: value }))}
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
}> = ({ transaction, data, setData }) => {
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
      <Label text="Asset Amount" htmlFor="assetAmount">
        <Input
          id="assetAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.assetAmount, value => setData({ ...data, assetAmount: value }))}
          required
        />
      </Label>
      <Label
        text="Cash Amount"
        htmlFor="cashAmount"
        addition={
          <a
            href="#"
            tabIndex={-1}
            onClick={async event => {
              event.preventDefault()
              const quote = await rpcClient.retrieveQuoteForAsset({ id: data.assetId, date: transaction.date })
              if (quote) {
                const midDayPrice = BigNumber(quote.close)
                  .plus(quote.open || quote.close)
                  .dividedBy(2)
                const price = midDayPrice.multipliedBy(data.assetAmount)
                if (price.isFinite()) {
                  setData({ ...data, cashAmount: price.toFixed(0) })
                }
              }
            }}
          >
            (autofill)
          </a>
        }
      >
        <Input
          id="cashAmount"
          type="text"
          value={data.cashAmount}
          onChange={event => setData({ ...data, cashAmount: event.target.value })}
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
}> = ({ transaction, data, setData }) => {
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
      <Label text="Asset Amount" htmlFor="assetAmount">
        <Input
          id="assetAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.assetAmount, value => setData({ ...data, assetAmount: value }))}
          required
        />
      </Label>
      <Label
        text="Cash Amount"
        htmlFor="cashAmount"
        addition={
          <a
            href="#"
            tabIndex={-1}
            onClick={async event => {
              event.preventDefault()
              const quote = await rpcClient.retrieveQuoteForAsset({ id: data.assetId, date: transaction.date })
              if (quote) {
                const midDayPrice = BigNumber(quote.close)
                  .plus(quote.open || quote.close)
                  .dividedBy(2)
                const price = midDayPrice.multipliedBy(data.assetAmount)
                if (price.isFinite()) {
                  setData({ ...data, cashAmount: price.toFixed(0) })
                }
              }
            }}
          >
            (autofill)
          </a>
        }
      >
        <Input
          id="cashAmount"
          type="text"
          value={data.cashAmount}
          onChange={event => setData({ ...data, cashAmount: event.target.value })}
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
}> = ({ data, setData }) => {
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
      <Label text="Asset Amount" htmlFor="assetAmount">
        <Input
          id="assetAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.assetAmount, value => setData({ ...data, assetAmount: value }))}
          required
        />
      </Label>
      <Label text="Fee Asset Amount" htmlFor="feeAssetAmount">
        <Input
          id="feeAssetAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.feeAssetAmount, value => setData({ ...data, feeAssetAmount: value }))}
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
        <Input
          id="cashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.cashAmount, value => setData({ ...data, cashAmount: value }))}
          required
        />
      </Label>
      <Label text="Tax Cash Amount" htmlFor="taxCashAmount">
        <Input
          id="taxCashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.taxCashAmount, value => setData({ ...data, taxCashAmount: value }))}
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
        <Input
          id="cashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.cashAmount, value => setData({ ...data, cashAmount: value }))}
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
          <a
            href="#"
            tabIndex={-1}
            onClick={async event => {
              event.preventDefault()
              const positions = await rpcClient.evaluatePositions({
                when: {
                  type: 'date',
                  date: dateFormat(dateMinus(dateParse(transaction.date), 'day', 1), 'yyyy-MM-dd'),
                },
              })
              const openAccountAssetPosition = positions.value.openAssetPositions.find(
                p => p.type === 'open' && p.accountId === data.assetAccountId && p.assetId === data.assetId
              )
              if (openAccountAssetPosition) {
                setData({ ...data, assetAmount: openAccountAssetPosition.amount })
              }
            }}
          >
            (autofill)
          </a>
        }
      >
        <Input
          id="assetAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.assetAmount, value => setData({ ...data, assetAmount: value }))}
          required
        />
      </Label>
      <Label text="Tax Cash Amount" htmlFor="taxCashAmount">
        <Input
          id="taxCashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.taxCashAmount, value => setData({ ...data, taxCashAmount: value }))}
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
        <Input
          id="taxCashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.taxCashAmount, value => setData({ ...data, taxCashAmount: value }))}
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
        <Input
          id="feeCashAmount"
          type="decimal"
          className={stylesNumberField}
          {...calculatorInputProps(data.feeCashAmount, value => setData({ ...data, feeCashAmount: value }))}
          required
        />
      </Label>
    </>
  )
}

const stylesNumberField = css`
  font-family: monospace;
`
