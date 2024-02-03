import React from 'react'
import { z } from 'zod'

import { usePersistentState } from './hooks/usePersistentState'

interface PrivacyContextValue {
  setPrivacy: (privacy: boolean) => void
  privacy: boolean
}

const PrivacyContext = React.createContext<PrivacyContextValue>({
  setPrivacy: () => {},
  privacy: false,
})

export function usePrivacy() {
  return React.useContext(PrivacyContext)
}

export const PrivacyContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [privacy, setPrivacy] = usePersistentState('amountPrivacy', z.boolean(), false)
  const value = React.useMemo(() => ({ privacy, setPrivacy }), [privacy, setPrivacy])
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}
