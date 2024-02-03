import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'
import { MdOutlineExpandMore } from 'react-icons/md'

interface Props {
  expanded?: boolean
  onClick?: () => void
  className?: string
}

export const ExpandCollapse: React.FC<Props> = ({ expanded, onClick, className }) => {
  return (
    <MdOutlineExpandMore
      onClick={event => {
        event.preventDefault()
        onClick?.()
      }}
      className={clsx(stylesRoot, expanded && stylesRootExpanded, className)}
    />
  )
}

const stylesRoot = css`
  transition: transform 0.25s ease;
  transform: rotate(-90deg);
  cursor: pointer;
`

const stylesRootExpanded = css`
  transform: rotate(0deg);
`
