import { css } from '@linaria/core'
import React from 'react'

import { sleep } from '../../../shared/utils/promise'
import { Amount } from '../../components/Amount'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { CardTable } from '../../components/CardTable'
import { Input } from '../../components/Input'
import { Percentage } from '../../components/Percentage'
import { Select } from '../../components/Select'
import { Toggle } from '../../components/Toggle'
import { ViewContainer } from '../../components/ViewContainer'

const TestButton: React.FC<{ check?: boolean }> = ({ check }) => {
  return (
    <div>
      <div>
        <Button
          check={check}
          onClick={async () => {
            await sleep(1000)
          }}
        >
          Click me!
        </Button>
      </div>
    </div>
  )
}

const TestInput: React.FC<{ initialValue: string }> = ({ initialValue }) => {
  const [value, setValue] = React.useState<string>(initialValue)

  return (
    <div>
      <div>{`Value: ${JSON.stringify(value)}`}</div>
      <div>
        <Input value={value} onChange={event => setValue(event.target.value)} />
      </div>
    </div>
  )
}

const TestInputCheckbox: React.FC<{ initialChecked: boolean }> = ({ initialChecked }) => {
  const [checked, setChecked] = React.useState<boolean>(initialChecked)

  return (
    <div>
      <div>{`Checked: ${JSON.stringify(checked)}`}</div>
      <div>
        <Input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />
      </div>
    </div>
  )
}

const TestSelect: React.FC<{ initialValue: string; clearable?: boolean }> = ({ initialValue, clearable }) => {
  const [value, setValue] = React.useState<string>(initialValue)
  return (
    <div>
      <div>{`Value: ${JSON.stringify(value)}`}</div>
      <div>
        <Select
          value={value}
          onChange={event => setValue(event.target.value)}
          optionGroups={[
            {
              id: '1',
              label: 'First',
              options: [
                { value: '1.1', label: '1.1' },
                { value: '1.2', label: '1.2' },
              ],
            },
            {
              id: '2',
              label: 'Second',
              options: [
                { value: '2.1', label: '2.1' },
                { value: '2.2', label: '2.2' },
                { value: '2.3', label: '2.3' },
              ],
            },
            { id: '3', label: 'Third', options: [] },
          ]}
          hiddenGroups={['2']}
          emptyLabel="(empty)"
          clearable={clearable}
        />
      </div>
    </div>
  )
}

const TestToggle: React.FC<{ initialChecked: boolean }> = ({ initialChecked }) => {
  const [checked, setChecked] = React.useState<boolean>(initialChecked)

  return (
    <div>
      <div>{`Checked: ${JSON.stringify(checked)}`}</div>
      <div>
        <Toggle checked={checked} onChangeChecked={checked => setChecked(checked)} />
      </div>
    </div>
  )
}

export const TestView: React.FC = () => {
  return (
    <ViewContainer>
      <div>
        <CardTable
          columns={[
            { id: 'checked', width: 20 },
            { id: 'name', title: 'Name' },
            { id: 'another', title: 'Another' },
            { id: 'yetAnother', title: 'Yet Another' },
            { id: 'price', title: 'Price', align: 'right' },
            { id: 'action', align: 'right' },
          ]}
          rows={[
            {
              id: '1',
              columns: {
                checked: 'C',
                name: 'First',
                another: 'Lorem ipsum',
                yetAnother: 'Lorem ipsum',
                price: '1',
                action: 'A',
              },
              menuItems: [
                {
                  label: 'Test',
                  onClick: () => console.log('Test'),
                },
              ],
            },
            {
              id: '2',
              columns: {
                checked: 'C',
                name: 'Second',
                another: 'Lorem ipsum',
                yetAnother: 'Lorem ipsum',
                price: '2',
                action: 'A',
              },
              subRows: [
                {
                  id: '3',
                  columns: {
                    checked: 'C',
                    name: 'Third',
                    another: 'Lorem ipsum',
                    yetAnother: 'Lorem ipsum',
                    price: '3',
                    action: 'A',
                  },
                  menuItems: [
                    {
                      label: 'Test 2',
                      onClick: () => console.log('Test 2'),
                    },
                  ],
                },
              ],
            },
          ]}
        />
      </div>
      <div>
        <Card className={stylesCard}>
          <h1>Button</h1>
          <TestButton />
          <TestButton check />
        </Card>
      </div>
      <div>
        <Card className={stylesCard}>
          <h1>Input</h1>
          <TestInput initialValue="" />
          <TestInput initialValue="foo" />
          <TestInputCheckbox initialChecked={false} />
          <TestInputCheckbox initialChecked={true} />
        </Card>
      </div>
      <div>
        <Card className={stylesCard}>
          <h1>Select</h1>
          <TestSelect initialValue="" />
          <TestSelect initialValue="1.2" />
          <TestSelect initialValue="2.3" />
          <TestSelect initialValue="" clearable />
          <TestSelect initialValue="1.2" clearable />
          <TestSelect initialValue="2.3" clearable />
        </Card>
      </div>
      <div>
        <Card className={stylesCard}>
          <h1>Toggle</h1>
          <TestToggle initialChecked={false} />
          <TestToggle initialChecked={true} />
        </Card>
      </div>
      <div>
        <Card className={stylesCard}>
          <h1>Amount</h1>
          <div>
            <Amount amount="123.45" denomination={2} symbol="EUR" />
          </div>
          <div>
            <Amount amount="123.45" denomination={2} symbol="EUR" signColor signChar signIcon />
          </div>
          <div>
            <Amount amount="-123.45" denomination={2} symbol="EUR" signColor signChar signIcon />
          </div>
        </Card>
      </div>
      <div>
        <Card className={stylesCard}>
          <h1>Percentage</h1>
          <div>
            <Percentage percentage="12.3" />
          </div>
          <div>
            <Percentage percentage="12.3" decimals={2} signColor signChar signIcon />
          </div>
          <div>
            <Percentage percentage="-12.3" decimals={2} signColor signChar signIcon />
          </div>
        </Card>
      </div>
    </ViewContainer>
  )
}

const stylesCard = css`
  padding: var(--spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-large);
`
