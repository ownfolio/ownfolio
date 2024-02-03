import { RpcBrowserClientError } from '@choffmeister/rpc-browser'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { rpcClient } from '../../api'

interface Props {
  onLoginRequired: () => void
  children: React.ReactElement
}

export const LoginGate: React.FC<Props> = ({ onLoginRequired, children }) => {
  const queryClient = useQueryClient()
  const [done, setDone] = React.useState(false)
  React.useEffect(() => {
    const run = async () => {
      try {
        const me = await rpcClient.me()
        queryClient.setQueryData(['me'], me)
        setDone(true)
      } catch (err) {
        if (err instanceof RpcBrowserClientError && err.status === 401) {
          onLoginRequired()
        } else {
          console.error(err)
          setDone(true)
        }
      }
    }
    run()
  }, [])

  return done ? children : null
}
