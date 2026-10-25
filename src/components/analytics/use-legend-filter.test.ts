import { describe, expect, it } from 'vitest'
import { legendSeriesKey } from './use-legend-filter'

describe('legendSeriesKey', () => {
  it('uses dataKey for bar/line series', () => {
    expect(legendSeriesKey({ dataKey: 'partnerA', value: 'Barney' })).toBe(
      'partnerA',
    )
    expect(legendSeriesKey({ dataKey: 'income', value: 'Income' })).toBe(
      'income',
    )
  })

  it('uses slice label when pie dataKey is value', () => {
    expect(legendSeriesKey({ dataKey: 'value', value: 'Food' })).toBe('Food')
  })
})
