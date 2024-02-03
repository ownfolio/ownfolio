import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { rpcClient } from '../../api'

export function useQuoteUpdate(interval: number): [boolean, () => Promise<void>] {
  const queryClient = useQueryClient()
  const [visible, setVisible] = React.useState(true)
  const [updating, setUpdating] = React.useState(false)

  const run = React.useCallback(async (manual: boolean) => {
    try {
      setUpdating(true)
      const updates = await rpcClient.updateQuotes()
      if (manual || updates.assetQuotesUpdates.length > 0) {
        await queryClient.invalidateQueries()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }, [])

  React.useEffect(() => {
    const visibilitychange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', visibilitychange)
    return () => document.removeEventListener('visibilitychange', visibilitychange)
  }, [])

  React.useEffect(() => {
    if (visible) {
      run(false)
    }
    const intervalId = visible ? window.setInterval(() => run(false), interval) : 0
    return () => window.clearInterval(intervalId)
  }, [interval, visible])
  return [updating, () => run(true)]
}
