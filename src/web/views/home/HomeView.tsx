import { css } from '@linaria/core'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import React from 'react'
import { CgProfile } from 'react-icons/cg'
import { FaCheck } from 'react-icons/fa6'
import { FiPlus } from 'react-icons/fi'
import { GiHamburgerMenu } from 'react-icons/gi'
import { LuRefreshCw } from 'react-icons/lu'
import { Route, Routes, useNavigate } from 'react-router-dom'

import { rpcClient } from '../../api'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDialogs } from '../../components/DialogsContext'
import { DefaultErrorBoundary } from '../../components/ErrorBoundary'
import { Menu } from '../../components/Menu'
import { usePrivacy } from '../../privacy'
import { AccountDialog } from '../accounts/AccountDialog'
import { AccountsView } from '../accounts/AccountsView'
import { AssetDialog } from '../assets/AssetDialog'
import { AssetsView } from '../assets/AssetsView'
import { AttachmentsView } from '../attachments/AttachmentsView'
import { ChartView } from '../chart/ChartView'
import { DashboardView } from '../dashboard/DashboardView'
import { ErrorView } from '../error/ErrorView'
import { LoadingView } from '../loading/LoadingView'
import { PortfolioDialog } from '../portfolios/PortfolioDialog'
import { PortfoliosView } from '../portfolios/PortfoliosView'
import { TestView } from '../test/TestView'
import { TransactionDialog } from '../transactions/TransactionDialog'
import { TransactionsView } from '../transactions/TransactionsView'
import { UserDialog } from '../user/UserDialog'
import { FullScreenDragAndDropFileUpload } from './FullScreenDragAndDropFileUpload'
import { useQuoteUpdate } from './useQuoteUpdate'

export const HomeView: React.FC = () => {
  const navigate = useNavigate()
  const { openDialog } = useDialogs()
  const me = useQuery(['me'], () => rpcClient.me()).data
  const [updatingQuotes, updateQuotes] = useQuoteUpdate(5 * 60 * 1000)
  const { privacy, setPrivacy } = usePrivacy()

  return (
    <>
      <FullScreenDragAndDropFileUpload />
      <div className={stylesRoot}>
        <nav className={stylesNavigation}>
          <div className={stylesNavigationElementGroup}>
            <a
              href="#"
              className={clsx(stylesNavigationLink, stylesNavigationTitle)}
              onClick={event => {
                event.preventDefault()
                navigate('/')
              }}
            >
              myfolio
            </a>
            <ResponsiveMenu
              items={[
                {
                  label: 'Portfolios',
                  onClick: () => navigate('/portfolios'),
                },
                {
                  label: 'Accounts',
                  onClick: () => navigate('/accounts'),
                },
                {
                  label: 'Assets',
                  onClick: () => navigate('/assets'),
                },
                {
                  label: 'Transactions',
                  onClick: () => navigate('/transactions'),
                },
                {
                  label: 'Attachments',
                  onClick: () => navigate('/attachments'),
                },
              ]}
            >
              <a href="#" className={clsx(stylesNavigationLink)}>
                <GiHamburgerMenu />
              </a>
            </ResponsiveMenu>
          </div>
          <div />
          <div className={stylesNavigationElementGroup}>
            <a
              href="#"
              className={stylesNavigationLink}
              onClick={async event => {
                event.preventDefault()
                await updateQuotes()
              }}
            >
              <LuRefreshCw className={clsx(updatingQuotes && stylesNavigationIconRotating)} />
            </a>
            <Menu
              items={[
                {
                  label: 'Create portfolio...',
                  onClick: async () => {
                    await openDialog(PortfolioDialog, { mode: { type: 'create' } })
                  },
                },
                {
                  label: 'Create account...',
                  onClick: async () => {
                    await openDialog(AccountDialog, { mode: { type: 'create' } })
                  },
                },
                {
                  label: 'Create asset...',
                  onClick: async () => {
                    await openDialog(AssetDialog, { mode: { type: 'create' } })
                  },
                },
                {
                  label: 'Create transaction...',
                  onClick: async () => {
                    await openDialog(TransactionDialog, { mode: { type: 'create' } })
                  },
                },
              ]}
              alignment="right"
            >
              <a href="#" className={clsx(stylesNavigationLink)}>
                <FiPlus />
              </a>
            </Menu>
            <Menu
              items={[
                {
                  label: 'Account',
                  onClick: async () => {
                    await openDialog(UserDialog, {})
                  },
                },
                {
                  label: 'Privacy mode',
                  icon: privacy ? <FaCheck /> : <div />,
                  onClick: () => setPrivacy(!privacy),
                },
                null,
                {
                  label: 'Reload',
                  onClick: () => window.location.reload(),
                },
                null,
                {
                  label: 'Logout',
                  onClick: async () => {
                    const result = await openDialog(ConfirmationDialog, {
                      question: 'Are you sure you want to log out?',
                      yesText: 'Yes, log me out!',
                      noText: 'Stay',
                    })
                    if (result) {
                      navigate('/logout')
                    }
                  },
                },
              ]}
              alignment="right"
            >
              <a href="#" className={stylesNavigationLink}>
                <span className={stylesShowSmallScreen}>{me?.email || '???'}</span>
                <CgProfile className={stylesHideSmallScreen} />
              </a>
            </Menu>
          </div>
        </nav>
        <div className={stylesContentContainer1}>
          <section className={stylesContentContainer2}>
            <DefaultErrorBoundary>
              <React.Suspense fallback={<LoadingView />}>
                <Routes>
                  <Route index element={<DashboardView />} />
                  <Route path="portfolios" element={<PortfoliosView />} />
                  <Route path="accounts" element={<AccountsView />} />
                  <Route path="assets" element={<AssetsView />} />
                  <Route path="transactions" element={<TransactionsView />} />
                  <Route path="attachments" element={<AttachmentsView />} />
                  <Route path="chart/:type/:id?" element={<ChartView />} />
                  <Route path="test" element={<TestView />} />
                  <Route
                    path="*"
                    element={<ErrorView title="Not found" description="The entered URL does not exist." />}
                  />
                </Routes>
              </React.Suspense>
            </DefaultErrorBoundary>
          </section>
        </div>
      </div>
    </>
  )
}

export const ResponsiveMenu: React.FC<React.ComponentProps<typeof Menu>> = ({ items, className, ...other }) => {
  return (
    <>
      <Menu items={items} className={clsx(stylesResponsiveMenuCollapsed, className)} {...other} />
      {items
        .flatMap(item => (item ? [item] : []))
        .map((item, idx) => (
          <a
            key={idx}
            href="#"
            className={clsx(stylesNavigationLink, stylesResponsiveMenuExpandedItem)}
            onClick={event => {
              event.preventDefault()
              if (item.onClick) {
                item.onClick()
              }
            }}
          >
            {item.label}
          </a>
        ))}
    </>
  )
}

const stylesRoot = css`
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
`

const stylesNavigation = css`
  background-color: var(--color-primary);
  padding: var(--spacing-medium);
  padding-top: max(var(--spacing-medium), var(--safe-area-inset-top));
  padding-left: max(var(--spacing-medium), var(--safe-area-inset-left));
  padding-right: max(var(--spacing-medium), var(--safe-area-inset-right));
  display: grid;
  grid-gap: var(--spacing-medium);
  grid-template-columns: auto 1fr auto;
  align-items: center;
  color: var(--color-text-on-primary);
  box-shadow: 0 0 8px rgb(0, 0, 0, 0.35);
  border-bottom: 1px solid var(--color-primary-dark);
`

const stylesNavigationTitle = css`
  font-weight: bold;
`

const stylesNavigationElementGroup = css`
  display: flex;
  gap: var(--spacing-small);
`

const stylesNavigationLink = css`
  display: block;
  transition: background-color 0.3s ease;
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
  border-radius: var(--border-radius-small);
  outline: 0;
  color: var(--color-text-on-primary);
  height: 20px;
  display: flex;
  align-items: center;
  justify-items: center;

  &:hover,
  &:focus {
    background-color: var(--color-primary-lite);
    outline: 0;
  }

  & svg {
    display: block;
  }
`

const stylesNavigationIconRotating = css`
  animation: rotation 2s infinite linear;

  @keyframes rotation {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`

const stylesResponsiveMenuCollapsed = css`
  @media (min-width: 1201px) {
    display: none;
  }
`

const stylesResponsiveMenuExpandedItem = css`
  @media (max-width: 1200px) {
    display: none;
  }
`

const stylesContentContainer1 = css`
  position: relative;
`

const stylesContentContainer2 = css`
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
  display: grid;
`

const stylesShowSmallScreen = css`
  @media (max-width: 600px) {
    display: none !important;
  }
`

const stylesHideSmallScreen = css`
  @media (min-width: 601px) {
    display: none !important;
  }
`
