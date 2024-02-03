import React from 'react'

export function useMultiState<T extends { [key: string]: unknown }>(initialValue: T) {
  return React.useReducer((values: T, nextValues: Partial<T>) => ({ ...values, ...nextValues }), initialValue)
}
