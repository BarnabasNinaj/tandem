import { describe, expect, it } from 'vitest'
import {
  displayOutflows,
  INVESTMENTS_CATEGORY_ID,
  INVESTMENTS_PARTNER_A_SERIES,
  INVESTMENTS_PARTNER_B_SERIES,
} from './investment-split'

describe('displayOutflows', () => {
  it('splits Investments by card paidBy into partner series', () => {
    const rows = displayOutflows(
      [
        {
          categoryId: 'groceries',
          categoryName: 'Groceries',
          amount: 40,
        },
        {
          categoryId: INVESTMENTS_CATEGORY_ID,
          categoryName: 'Investments',
          amount: 350,
          paidBy: { partnerA: 200, partnerB: 150, common: 0 },
        },
      ],
      'Barney',
      'Lucka',
    )
    expect(rows).toEqual([
      { categoryId: 'groceries', categoryName: 'Groceries', amount: 40 },
      {
        categoryId: INVESTMENTS_PARTNER_A_SERIES,
        categoryName: 'Investments · Barney',
        amount: 200,
      },
      {
        categoryId: INVESTMENTS_PARTNER_B_SERIES,
        categoryName: 'Investments · Lucka',
        amount: 150,
      },
    ])
  })

  it('keeps a single Investments row when paidBy is missing', () => {
    expect(
      displayOutflows(
        [
          {
            categoryId: INVESTMENTS_CATEGORY_ID,
            categoryName: 'Investments',
            amount: 100,
          },
        ],
        'Barney',
        'Lucka',
      ),
    ).toEqual([
      {
        categoryId: INVESTMENTS_CATEGORY_ID,
        categoryName: 'Investments',
        amount: 100,
      },
    ])
  })
})
