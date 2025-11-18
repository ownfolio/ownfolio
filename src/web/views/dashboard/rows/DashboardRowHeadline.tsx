import React from 'react'

import { DashboardRowHeadline } from '../../../../shared/models/Dashboard'
import { StringInput } from '../../../components/Input'
import { Label } from '../../../components/Label'
import type { DashboardRowFieldsProps, DashboardRowRendererProps } from './index'

export const DashboardRowHeadlineRenderer: React.FC<DashboardRowRendererProps<DashboardRowHeadline>> = ({ row }) => {
  return <h2>{row.content}</h2>
}

export const DashboardRowHeadlineFields: React.FC<DashboardRowFieldsProps<DashboardRowHeadline>> = ({
  value,
  onChange,
}) => {
  return (
    <Label text="Content">
      <StringInput value={value.content} onValueChange={content => onChange({ ...value, content })} />
    </Label>
  )
}
