import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'
import { BsThreeDotsVertical } from 'react-icons/bs'

import { selectionSortBy } from '../../shared/utils/array'
import { useElementDimensions } from '../hooks/useElementDimensions'
import { Card } from './Card'
import { ExpandCollapse } from './ExpandCollapse'
import { Menu } from './Menu'

export interface TableDefinitionColumn {
  id: string
  title?: string
  align?: 'left' | 'center' | 'right'
  width?: number
  minWidth?: number
  priority?: number
  className?: string
}

export interface TableDefinitionSubRow {
  id: string | number
  columns: { [id: string]: React.ReactNode }
  menuItems?: React.ComponentProps<typeof Menu>['items']
}

export interface TableDefinitionRow {
  id: string | number
  columns: { [id: string]: React.ReactNode }
  subRows?: TableDefinitionSubRow[]
  menuItems?: React.ComponentProps<typeof Menu>['items']
}

export interface TableDefinition {
  columns: TableDefinitionColumn[]
  rows: TableDefinitionRow[]
}

type Props = React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement> & TableDefinition

export const CardTable = React.forwardRef<HTMLTableElement, Props>(({ columns, rows, className, ...other }, ref) => {
  const widthRef = React.useRef<HTMLTableElement>(null)
  const width = useElementDimensions(w => Math.floor(w / 25) * 25, 0, widthRef)
  const visible = React.useMemo(() => {
    return selectionSortBy(columns, (a, b) => (a.priority || 0) - (b.priority || 0)).reduce<{
      consumedWidth: number
      columnIds: string[]
    }>(
      (acc, c) => {
        const columnPriority = c.priority || 0
        const columnWidth = c.width || c.minWidth || 200
        if (columnPriority === 0 || acc.consumedWidth + columnWidth <= width) {
          return {
            consumedWidth: acc.consumedWidth + columnWidth,
            columnIds: [...acc.columnIds, c.id],
          }
        } else {
          return {
            consumedWidth: acc.consumedWidth + columnWidth,
            columnIds: acc.columnIds,
          }
        }
      },
      { consumedWidth: 0, columnIds: [] }
    ).columnIds
  }, [columns, width])
  const showSubRows = React.useMemo(() => !!rows.find(r => r.subRows && r.subRows.length > 0), [rows])
  const showMenuItems = React.useMemo(
    () =>
      !!rows.find(
        r =>
          (r.menuItems && r.menuItems.length > 0) ||
          (r.subRows && r.subRows.find(sr => sr.menuItems && sr.menuItems.length > 0))
      ),
    [rows]
  )
  const [expanded, setExpanded] = React.useState<{ [id: string | number]: boolean | undefined }>({})
  const isColumnVisible = React.useCallback((id: string) => visible.includes(id), [visible])
  const isRowExpanded = React.useCallback((id: string | number) => expanded[id] === true, [expanded])
  const toggleRowExpanded = React.useCallback(
    (id: string | number) => setExpanded(expanded => ({ ...expanded, [id]: !expanded[id] })),
    []
  )
  return (
    <Card ref={widthRef}>
      <table ref={ref} {...other} className={clsx(stylesRoot, className)}>
        <thead>
          <tr>
            {showSubRows && <th className={stylesColumnExpandCollapse} />}
            {columns.flatMap(column => {
              if (!visible.includes(column.id)) return []
              const align = column.align || 'left'
              return [
                <th
                  key={column.id}
                  className={clsx(
                    align === 'left' && stylesColumnLeft,
                    align === 'center' && stylesColumnCenter,
                    align === 'right' && stylesColumnRight,
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>,
              ]
            })}
            {showMenuItems && <th className={stylesColumnMenu} />}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <CardTableRow
              key={row.id}
              columns={columns}
              row={row}
              showSubRows={showSubRows}
              showMenuItems={showMenuItems}
              isColumnVisible={isColumnVisible}
              isRowExpanded={isRowExpanded}
              toggleRowExpanded={toggleRowExpanded}
            />
          ))}
        </tbody>
      </table>
    </Card>
  )
})

interface RowProps {
  columns: TableDefinitionColumn[]
  row: TableDefinitionRow
  showSubRows: boolean
  showMenuItems: boolean
  isColumnVisible: (id: string) => boolean
  isRowExpanded: (id: string | number) => boolean
  toggleRowExpanded: (id: string | number) => void
}

export const CardTableRow: React.FC<RowProps> = ({
  columns,
  row,
  showSubRows,
  showMenuItems,
  isColumnVisible,
  isRowExpanded,
  toggleRowExpanded: _toggleRowExpanded,
}) => {
  const toggleRowExpanded = React.useCallback(() => _toggleRowExpanded(row.id), [_toggleRowExpanded, row.id])
  return (
    <React.Fragment>
      <tr>
        {showSubRows && (
          <td className={stylesColumnExpandCollapse}>
            {row.subRows && row.subRows.length > 0 && (
              <ExpandCollapse expanded={isRowExpanded(row.id)} onClick={toggleRowExpanded} className={stylesIcon} />
            )}
          </td>
        )}
        {columns.flatMap(column => {
          if (!isColumnVisible(column.id)) return []
          const align = column.align || 'left'
          return [
            <td
              key={column.id}
              className={clsx(
                align === 'left' && stylesColumnLeft,
                align === 'center' && stylesColumnCenter,
                align === 'right' && stylesColumnRight,
                column.className
              )}
              style={{ width: column.width }}
            >
              {row.columns[column.id] || ''}
            </td>,
          ]
        })}
        {showMenuItems && (
          <td className={stylesColumnMenu}>
            {row.menuItems && row.menuItems.length > 0 && (
              <Menu items={row.menuItems} alignment="right">
                <a href="#">
                  <BsThreeDotsVertical className={stylesIcon} />
                </a>
              </Menu>
            )}
          </td>
        )}
      </tr>
      {showSubRows &&
        isRowExpanded(row.id) &&
        row.subRows &&
        row.subRows.map(subRow => (
          <CardTableSubRow
            key={subRow.id}
            columns={columns}
            subRow={subRow}
            showMenuItems={showMenuItems}
            isColumnVisible={isColumnVisible}
          />
        ))}
    </React.Fragment>
  )
}

interface SubRowProps {
  columns: TableDefinitionColumn[]
  subRow: TableDefinitionSubRow
  showMenuItems: boolean
  isColumnVisible: (id: string) => boolean
}

export const CardTableSubRow: React.FC<SubRowProps> = ({ columns, subRow, showMenuItems, isColumnVisible }) => {
  return (
    <tr>
      <td className={stylesColumnExpandCollapse} />
      {columns.flatMap(column => {
        if (!isColumnVisible(column.id)) return []
        const align = column.align || 'left'
        return [
          <td
            key={column.id}
            className={clsx(
              align === 'left' && stylesColumnLeft,
              align === 'center' && stylesColumnCenter,
              align === 'right' && stylesColumnRight,
              column.className
            )}
            style={{ width: column.width }}
          >
            {subRow.columns[column.id] || ''}
          </td>,
        ]
      })}
      {showMenuItems && (
        <td className={stylesColumnMenu}>
          {subRow.menuItems && subRow.menuItems.length > 0 && (
            <Menu items={subRow.menuItems} alignment="right">
              <a href="#">
                <BsThreeDotsVertical className={stylesIcon} />
              </a>
            </Menu>
          )}
        </td>
      )}
    </tr>
  )
}

const stylesRoot = css`
  width: 100%;
  border-collapse: collapse;
  border-radius: calc(var(--border-radius-small) + 2px);
  table-layout: fixed;

  & th,
  & td {
    padding: var(--spacing-small);
    box-sizing: border-box;
  }

  & > thead > tr {
    border-bottom: 1px solid var(--color-neutral);

    &:first-child {
      & > th:first-child {
        border-top-left-radius: calc(var(--border-radius-small) + 2px);
      }
      & > th:last-child {
        border-top-right-radius: calc(var(--border-radius-small) + 2px);
      }
    }
  }

  & > tbody > tr {
    &:hover {
      background-color: var(--color-neutral);
    }

    &:not(:last-child) {
      border-bottom: 1px solid var(--color-neutral);
    }

    &:last-child {
      & > td:first-child {
        border-bottom-left-radius: calc(var(--border-radius-small) + 2px);
      }
      & > td:last-child {
        border-bottom-right-radius: calc(var(--border-radius-small) + 2px);
      }
    }
  }
`

const stylesColumnExpandCollapse = css`
  box-sizing: content-box !important;
  width: 16px;
`

const stylesColumnMenu = css`
  box-sizing: content-box !important;
  width: 16px;
  text-align: right;
`

const stylesColumnLeft = css`
  text-align: left;
`

const stylesColumnCenter = css`
  text-align: center;
`

const stylesColumnRight = css`
  text-align: right;
`

const stylesIcon = css`
  display: block;
`
