import { css } from '@linaria/core'
import React from 'react'

import { DashboardElementText } from '../../../../shared/models/Dashboard'
import { StringInput } from '../../../components/Input'
import { Label } from '../../../components/Label'
import type { DashboardElementFieldsRendererProps, DashboardElementRendererProps } from './index'

export const TextRenderer: React.FC<DashboardElementRendererProps<DashboardElementText>> = ({ element }) => {
  return <div className={stylesRoot}>{element.text}</div>
}

export const TextFieldsRenderer: React.FC<DashboardElementFieldsRendererProps<DashboardElementText>> = ({
  element,
  onChangeElement,
}) => {
  return (
    <>
      <Label text="Test" htmlFor="text">
        <StringInput
          id="hideTitle"
          value={element.text}
          onValueChange={text => onChangeElement({ ...element, text })}
          required
        />
      </Label>
    </>
  )
}

const stylesRoot = css`
  display: grid;
  align-items: center;
  justify-content: center;
  text-align: center;
`
