import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'
import { BsThreeDotsVertical } from 'react-icons/bs'

import { selectionSortBy } from '../../shared/utils/array'
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

export type TableExpansionState = { [id: string | number]: boolean | undefined }

export interface TableDefinition {
  columns: TableDefinitionColumn[]
  rows: TableDefinitionRow[]
  expansion?: [TableExpansionState, React.Dispatch<React.SetStateAction<TableExpansionState>>]
  expandedByDefault?: boolean
}

type Props = React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement> & TableDefinition

export const CardTable = React.forwardRef<HTMLTableElement, Props>(
  ({ columns, rows, className, expansion, expandedByDefault, ...other }, ref) => {
    const columnWidths = React.useMemo(() => {
      return selectionSortBy(columns, (a, b) => (a.priority || 0) - (b.priority || 0)).reduce<{
        consumedWidth: number
        widths: { [columnId: string]: number }
      }>(
        (acc, c) => {
          const columnPriority = c.priority || 0
          const columnWidth = c.width || c.minWidth || 200
          return {
            consumedWidth: acc.consumedWidth + columnWidth + 2 * 4,
            widths: { ...acc.widths, [c.id]: columnPriority > 0 ? acc.consumedWidth + columnWidth + 2 * 8 : 0 },
          }
        },
        { consumedWidth: 2 * 24, widths: {} }
      ).widths
    }, [columns])
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
    const [expanded, setExpanded] = expansion || React.useState<TableExpansionState>({})
    const isRowExpanded = React.useCallback(
      (id: string | number) => (!expandedByDefault ? expanded[id] === true : expanded[id] !== false),
      [expanded, expandedByDefault]
    )
    const toggleRowExpanded = React.useCallback(
      (id: string | number) => setExpanded({ ...expanded, [id]: !isRowExpanded(id) }),
      [expanded, expandedByDefault]
    )
    return (
      <Card>
        <table ref={ref} {...other} className={clsx(stylesRoot, className)}>
          <thead>
            <tr>
              {showSubRows && <th className={stylesColumnExpandCollapse} />}
              {columns.map(column => {
                const align = column.align || 'left'
                return (
                  <th
                    key={column.id}
                    className={clsx(
                      align === 'left' && stylesColumnLeft,
                      align === 'center' && stylesColumnCenter,
                      align === 'right' && stylesColumnRight,
                      stylesColumnHidden(columnWidths[column.id]),
                      column.className
                    )}
                    data-hidden="1000"
                    style={{ width: column.width }}
                  >
                    {column.title}
                  </th>
                )
              })}
              {showMenuItems && <th className={stylesColumnMenu} />}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <CardTableRow
                key={row.id}
                columns={columns}
                columnWidths={columnWidths}
                row={row}
                showSubRows={showSubRows}
                showMenuItems={showMenuItems}
                isRowExpanded={isRowExpanded}
                toggleRowExpanded={toggleRowExpanded}
              />
            ))}
          </tbody>
        </table>
      </Card>
    )
  }
)

interface RowProps {
  columns: TableDefinitionColumn[]
  columnWidths: { [columnId: string]: number }
  row: TableDefinitionRow
  showSubRows: boolean
  showMenuItems: boolean
  isRowExpanded: (id: string | number) => boolean
  toggleRowExpanded: (id: string | number) => void
}

export const CardTableRow: React.FC<RowProps> = ({
  columns,
  columnWidths,
  row,
  showSubRows,
  showMenuItems,
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
        {columns.map(column => {
          const align = column.align || 'left'
          return (
            <td
              key={column.id}
              className={clsx(
                align === 'left' && stylesColumnLeft,
                align === 'center' && stylesColumnCenter,
                align === 'right' && stylesColumnRight,
                stylesColumnHidden(columnWidths[column.id]),
                column.className
              )}
              style={{ width: column.width }}
            >
              {row.columns[column.id] || ''}
            </td>
          )
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
            columnWidths={columnWidths}
            subRow={subRow}
            showMenuItems={showMenuItems}
          />
        ))}
    </React.Fragment>
  )
}

interface SubRowProps {
  columns: TableDefinitionColumn[]
  columnWidths: { [columnId: string]: number }
  subRow: TableDefinitionSubRow
  showMenuItems: boolean
}

export const CardTableSubRow: React.FC<SubRowProps> = ({ columns, columnWidths, subRow, showMenuItems }) => {
  return (
    <tr>
      <td className={stylesColumnExpandCollapse} />
      {columns.map(column => {
        const align = column.align || 'left'
        return (
          <td
            key={column.id}
            className={clsx(
              align === 'left' && stylesColumnLeft,
              align === 'center' && stylesColumnCenter,
              align === 'right' && stylesColumnRight,
              stylesColumnHidden(columnWidths[column.id]),
              column.className
            )}
            style={{ width: column.width }}
          >
            {subRow.columns[column.id] || ''}
          </td>
        )
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

const stylesColumnHidden = (width: number) => {
  if (width === 0) return undefined
  const options = [
    {
      width: 0,
      style: css`
        @media only screen and (max-width: 99px) {
          display: none;
        }
      `,
    },
    {
      width: 100,
      style: css`
        @media only screen and (max-width: 199px) {
          display: none;
        }
      `,
    },
    {
      width: 200,
      style: css`
        @media only screen and (max-width: 299px) {
          display: none;
        }
      `,
    },
    {
      width: 300,
      style: css`
        @media only screen and (max-width: 399px) {
          display: none;
        }
      `,
    },
    {
      width: 400,
      style: css`
        @media only screen and (max-width: 499px) {
          display: none;
        }
      `,
    },
    {
      width: 500,
      style: css`
        @media only screen and (max-width: 599px) {
          display: none;
        }
      `,
    },
    {
      width: 600,
      style: css`
        @media only screen and (max-width: 699px) {
          display: none;
        }
      `,
    },
    {
      width: 700,
      style: css`
        @media only screen and (max-width: 799px) {
          display: none;
        }
      `,
    },
    {
      width: 800,
      style: css`
        @media only screen and (max-width: 899px) {
          display: none;
        }
      `,
    },
    {
      width: 900,
      style: css`
        @media only screen and (max-width: 999px) {
          display: none;
        }
      `,
    },
    {
      width: 1000,
      style: css`
        @media only screen and (max-width: 1099px) {
          display: none;
        }
      `,
    },
    {
      width: 1100,
      style: css`
        @media only screen and (max-width: 1199px) {
          display: none;
        }
      `,
    },
    {
      width: 1200,
      style: css`
        @media only screen and (max-width: 1299px) {
          display: none;
        }
      `,
    },
    {
      width: 1300,
      style: css`
        @media only screen and (max-width: 1399px) {
          display: none;
        }
      `,
    },
    {
      width: 1400,
      style: css`
        @media only screen and (max-width: 1499px) {
          display: none;
        }
      `,
    },
    {
      width: 1500,
      style: css`
        @media only screen and (max-width: 1599px) {
          display: none;
        }
      `,
    },
    {
      width: 1600,
      style: css`
        @media only screen and (max-width: 1699px) {
          display: none;
        }
      `,
    },
    {
      width: 1700,
      style: css`
        @media only screen and (max-width: 1799px) {
          display: none;
        }
      `,
    },
    {
      width: 1800,
      style: css`
        @media only screen and (max-width: 1899px) {
          display: none;
        }
      `,
    },
    {
      width: 1900,
      style: css`
        @media only screen and (max-width: 1999px) {
          display: none;
        }
      `,
    },
  ] as const
  return options
    .filter(o => o.width < width)
    .reduce((closest, option) => (width - option.width < width - closest.width ? option : closest), options[0]).style
}

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
