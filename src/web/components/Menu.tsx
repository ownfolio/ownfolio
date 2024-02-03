import * as HeadlessUI from '@headlessui/react'
import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'

interface Props {
  items: ({
    label: React.ReactNode
    icon?: React.ReactElement
    onClick?: () => void
  } | null)[]
  alignment?: 'left' | 'right'
  verticalAlignment?: 'bottom' | 'top'
  children: React.ReactElement
}

export const Menu: React.FC<Props> = ({ items, alignment = 'left', verticalAlignment = 'bottom', children }) => {
  const hasIcons = items.find(i => !!i?.icon)
  return (
    <HeadlessUI.Menu as="div" className={stylesRoot}>
      {({ open }) => (
        <>
          <HeadlessUI.Menu.Button as={React.Fragment}>{children}</HeadlessUI.Menu.Button>
          <HeadlessUI.Transition
            show={open}
            as={React.Fragment}
            enter={stylesMenuEnter}
            enterFrom={stylesMenuEnterFrom}
            enterTo={stylesMenuEnterTo}
            leave={stylesMenuLeave}
            leaveFrom={stylesMenuLeaveFrom}
            leaveTo={stylesMenuLeaveTo}
          >
            <HeadlessUI.Menu.Items
              static
              className={clsx(
                stylesMenuItems,
                alignment === 'left' && stylesMenuItemsAlignmentLeft,
                alignment === 'right' && stylesMenuItemsAlignmentRight,
                verticalAlignment === 'bottom' && stylesMenuItemsVerticalAlignmentBottom,
                verticalAlignment === 'top' && stylesMenuItemsVerticalAlignmentTop
              )}
            >
              {items.map((item, idx) => {
                if (item === null) {
                  return <hr key={idx} className={stylesMenuDivider} />
                }
                return (
                  <HeadlessUI.Menu.Item key={idx}>
                    {({ active }) => (
                      <button
                        type="button"
                        className={clsx(
                          stylesMenuItem,
                          hasIcons && styleMenuItemWithIcon,
                          active && stylesMenuItemActive
                        )}
                        onClick={item.onClick}
                        disabled={!item.onClick}
                      >
                        {item.icon ? item.icon : hasIcons ? <div /> : null}
                        {item.label}
                      </button>
                    )}
                  </HeadlessUI.Menu.Item>
                )
              })}
            </HeadlessUI.Menu.Items>
          </HeadlessUI.Transition>
        </>
      )}
    </HeadlessUI.Menu>
  )
}

const stylesRoot = css`
  position: relative;
`

const stylesMenuItems = css`
  background-color: var(--color-neutral-lite);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.25);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-small);
  position: absolute;
  max-width: 300px;
  z-index: 1;
`

const stylesMenuItemsAlignmentLeft = css``

const stylesMenuItemsAlignmentRight = css`
  right: 0;
`

const stylesMenuItemsVerticalAlignmentBottom = css`
  transform: translateY(var(--spacing-small));
`

const stylesMenuItemsVerticalAlignmentTop = css`
  top: 0;
  transform: translateY(calc(-100% - var(--spacing-small)));
`

const stylesMenuItem = css`
  padding: var(--spacing-small) calc(var(--spacing-small) * 2);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  color: var(--color-text);
  background: 0;
  border: 0;
  outline: 0;
  display: block;
  box-sizing: border-box;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: var(--border-radius-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const styleMenuItemWithIcon = css`
  display: grid;
  grid-template-columns: 16px 1fr;
  grid-gap: var(--spacing-small);
  align-items: center;
  padding-left: var(--spacing-small);
`

const stylesMenuItemActive = css`
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
`

const stylesMenuDivider = css`
  margin: var(--spacing-small) 0;
  border: 0;
  border-bottom: 1px solid var(--color-neutral-dark);
`

const stylesMenuEnter = css`
  transition:
    opacity 0.15s ease,
    scale 0.15s ease;
`

const stylesMenuEnterFrom = css`
  opacity: 0;
  scale: 0.75;
`

const stylesMenuEnterTo = css`
  opacity: 1;
  scale: 1;
`

const stylesMenuLeave = css`
  transition:
    opacity 0.3s ease,
    scale 0.3s ease;
`

const stylesMenuLeaveFrom = css`
  opacity: 1;
  scale: 1;
`

const stylesMenuLeaveTo = css`
  opacity: 0;
  scale: 0.75;
`
