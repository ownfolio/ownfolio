import { css } from '@linaria/core'
import clsx from 'clsx'
import React from 'react'
import { IconType } from 'react-icons/lib'

type Props = Omit<
  React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>,
  'children'
> & {
  icon: IconType
}

export const IconLink = React.forwardRef<HTMLAnchorElement, Props>(({ icon: Icon, className, ...other }, ref) => {
  return (
    <a ref={ref} className={clsx(stylesRoot, className)} {...other}>
      <Icon className={stylesIcon} />
    </a>
  )
})

const stylesRoot = css`
  flex-shrink: 0;
`

const stylesIcon = css`
  display: block;
  cursor: pointer;
`
