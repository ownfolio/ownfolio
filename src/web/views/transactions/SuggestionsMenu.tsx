import React from 'react'
import { FaWandMagicSparkles } from 'react-icons/fa6'

import { IconLink } from '../../components/IconLink'
import { Menu } from '../../components/Menu'

interface Props {
  valueGenerators: {
    label: (value: string) => string
    value: () => Promise<string | undefined> | string | undefined
    deps: React.DependencyList
  }[]
  value: string
  setValue: (value: string) => void
}

export const SuggestionsMenu: React.FC<Props> = ({ valueGenerators, value, setValue }) => {
  if (valueGenerators.length === 0) {
    return 0
  }
  const [values, setValues] = React.useState<(string | undefined)[]>([])
  React.useEffect(
    () => {
      const valuesRaw = valueGenerators.map(valueGenerator => valueGenerator.value())
      setValues(
        valuesRaw.map(valueRaw => (typeof valueRaw === 'string' || valueRaw === undefined ? valueRaw : undefined))
      )
      Promise.all(
        valuesRaw.map((valueRaw, idx) => {
          if (typeof valueRaw === 'string' || valueRaw === undefined) {
            return Promise.resolve()
          }
          return valueRaw.then(value =>
            setValues(values => values.map((value2, idx2) => (idx2 === idx ? value : value2)))
          )
        })
      ).catch(err => {
        console.error(err)
      })
    },
    valueGenerators.flatMap(({ deps }) => deps)
  )
  const valueGeneratorsWithNonEmptyChangedValue = valueGenerators
    .map((valueGenerator, idx) => [valueGenerator, values[idx]] as const)
    .flatMap(([valueGenerator, value]) => (value !== undefined ? [[valueGenerator, value] as const] : []))
    .filter(([, generatedValue]) => generatedValue !== value)
  if (valueGeneratorsWithNonEmptyChangedValue.length === 0) {
    return null
  }
  return (
    <Menu
      items={valueGeneratorsWithNonEmptyChangedValue.map(([valueGenerator, value]) => {
        return {
          label: valueGenerator.label(value),
          onClick: () => setValue(value),
        }
      })}
      alignment="right"
    >
      <IconLink icon={FaWandMagicSparkles} tabIndex={-1} />
    </Menu>
  )
}
