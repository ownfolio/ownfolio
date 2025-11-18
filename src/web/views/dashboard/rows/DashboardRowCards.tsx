import { css } from '@linaria/core'
import React from 'react'
import { FaPlus, FaTrash } from 'react-icons/fa6'

import {
  createEmptyDashboardCard,
  DashboardCard,
  DashboardCardType,
  DashboardRowCards,
} from '../../../../shared/models/Dashboard'
import { Card } from '../../../components/Card'
import { Label } from '../../../components/Label'
import { LoadingCardSuspense } from '../../../components/LoadingCardSuspense'
import { SelectDashboardCardType } from '../../../components/SelectDashboardCardType'
import { DashboardCardFields, DashboardCardRenderer } from '../cards'
import { DashboardRowFieldsProps, DashboardRowRendererProps } from './index'

export const DashboardRowCardsRenderer: React.FC<DashboardRowRendererProps<DashboardRowCards>> = ({
  row,
  timetravel,
}) => {
  return (
    <div className={stylesGrid}>
      {row.cards.map((card, cardIndex) => (
        <LoadingCardSuspense key={cardIndex} className={stylesCard}>
          <Card className={stylesCard}>
            <DashboardCardRenderer card={card} timetravel={timetravel} />
          </Card>
        </LoadingCardSuspense>
      ))}
    </div>
  )
}

export const DashboardRowCardsFields: React.FC<DashboardRowFieldsProps<DashboardRowCards>> = ({
  value: row,
  onChange,
}) => {
  const cardsAndAdders = React.useMemo(() => {
    const result: ({ type: 'adder'; index: number } | { type: 'card'; index: number; card: DashboardCard })[] = []
    result.push({ type: 'adder', index: 0 })
    for (let i = 0; i < row.cards.length; i++) {
      result.push({ type: 'card', index: i, card: row.cards[i] })
      result.push({ type: 'adder', index: i + 1 })
    }
    return result
  }, [row.cards])
  return (
    <>
      {cardsAndAdders.map(cardOrAdder => {
        switch (cardOrAdder.type) {
          case 'adder': {
            return (
              <div key={`adder-${cardOrAdder.index}`} className={stylesCardAdd}>
                <FaPlus
                  onClick={async () => {
                    const nextCard = createEmptyDashboardCard('total')
                    onChange({
                      ...row,
                      cards: [
                        ...row.cards.slice(0, cardOrAdder.index),
                        nextCard,
                        ...row.cards.slice(cardOrAdder.index),
                      ],
                    })
                  }}
                  className={stylesAction}
                />
              </div>
            )
          }
          case 'card':
            return (
              <>
                <Label
                  text="Type"
                  addition={
                    <FaTrash
                      onClick={() => {
                        onChange({
                          ...row,
                          cards: [...row.cards.slice(0, cardOrAdder.index), ...row.cards.slice(cardOrAdder.index + 1)],
                        })
                      }}
                      className={stylesAction}
                    />
                  }
                >
                  <SelectDashboardCardType
                    value={cardOrAdder.card.type}
                    onChange={event => {
                      const nextCard = createEmptyDashboardCard(event.target.value as DashboardCardType)
                      onChange({
                        ...row,
                        cards: [
                          ...row.cards.slice(0, cardOrAdder.index),
                          nextCard,
                          ...row.cards.slice(cardOrAdder.index + 1),
                        ],
                      })
                    }}
                  />
                </Label>
                <DashboardCardFields
                  key={`card-${cardOrAdder.index}`}
                  card={cardOrAdder.card}
                  onChangeCard={nextCard => {
                    onChange({
                      ...row,
                      cards: [
                        ...row.cards.slice(0, cardOrAdder.index),
                        nextCard,
                        ...row.cards.slice(cardOrAdder.index + 1),
                      ],
                    })
                  }}
                />
              </>
            )
        }
      })}
    </>
  )
}

const stylesGrid = css`
  display: grid;
  gap: var(--spacing-large);
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
`

const stylesCard = css`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  overflow: hidden;
  position: relative;
`

const stylesCardAdd = css`
  display: grid;
`

const stylesAction = css`
  display: block;
  padding: 2px;
  cursor: pointer;
  align-self: center;
  justify-self: center;
`
