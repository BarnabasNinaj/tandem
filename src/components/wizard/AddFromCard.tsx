import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  mapCardLines,
  mergeCardLinesIntoOutflows,
  parseCardPaste,
  upsertMappings,
  type MappedCardLine,
} from '@/lib/card-expenses'
import { formatMoney } from '@/lib/number'
import type {
  BankCategoryMapping,
  CategoryExpense,
  ExpenseCard,
  ExpenseCategory,
} from '@/types/tandem'

export function AddFromCard({
  cards,
  categories,
  mappings,
  outflows,
  partnerAName,
  partnerBName,
  onCancel,
  onApply,
}: {
  cards: ExpenseCard[]
  categories: ExpenseCategory[]
  mappings: BankCategoryMapping[]
  outflows: CategoryExpense[]
  partnerAName: string
  partnerBName: string
  onCancel: () => void
  onApply: (next: {
    outflows: CategoryExpense[]
    mappings: BankCategoryMapping[]
  }) => void
}) {
  const [cardId, setCardId] = useState(cards[0]?.id ?? '')
  const [paste, setPaste] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const parsed = useMemo(() => parseCardPaste(paste), [paste])
  const preview = useMemo(() => {
    const mapped = mapCardLines(parsed, mappings, categories)
    return mapped.map((row) => {
      const categoryId = overrides[row.key] ?? row.categoryId ?? ''
      const cat = categories.find((c) => c.id === categoryId)
      return {
        ...row,
        categoryId: cat?.id ?? null,
        categoryName: cat?.name ?? null,
      } satisfies MappedCardLine
    })
  }, [parsed, mappings, categories, overrides])

  const allMapped =
    preview.length > 0 && preview.every((r) => Boolean(r.categoryId))
  const pasteTotal = preview.reduce((s, r) => s + r.amount, 0)

  const apply = () => {
    if (!allMapped) return
    const confirmed = preview.map((r) => ({
      key: r.key,
      label: r.label,
      categoryId: r.categoryId!,
      amount: r.amount,
    }))
    onApply({
      outflows: mergeCardLinesIntoOutflows(
        outflows,
        confirmed.map((c) => ({
          categoryId: c.categoryId,
          amount: c.amount,
        })),
        categories,
      ),
      mappings: upsertMappings(mappings, confirmed),
    })
  }

  if (cards.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-stone-300 p-4 dark:border-stone-700">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Add cards under Settings → Cards first, then paste monthly category
          totals here.
        </p>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-stone-300 p-4 dark:border-stone-700">
      <div>
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Add from card
        </p>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
          Paste monthly totals (one line: label + amount). Amounts merge into
          the household categories.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="card-pick">Card</Label>
        <Select
          id="card-pick"
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
        >
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ·{' '}
              {c.owner === 'common'
                ? 'Common'
                : c.owner === 'partnerA'
                  ? partnerAName
                  : partnerBName}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="card-paste">Monthly category totals</Label>
        <textarea
          id="card-paste"
          rows={6}
          autoFocus
          placeholder={'Groceries 120,50\nRestaurant 45\nFuel 60'}
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value)
            setOverrides({})
          }}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm dark:border-stone-600 dark:bg-stone-900"
        />
      </div>

      {preview.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] text-left text-sm">
            <thead>
              <tr className="text-xs tracking-wide text-stone-500 uppercase">
                <th className="py-1.5 font-medium">Card label</th>
                <th className="py-1.5 font-medium text-right">Amount</th>
                <th className="py-1.5 pl-3 font-medium">Tandem category</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr
                  key={row.key}
                  className="border-t border-stone-200 dark:border-stone-800"
                >
                  <td className="py-1.5">{row.label}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="py-1.5 pl-3">
                    <Select
                      className={`h-8 rounded-md pr-7 pl-2 text-xs ${
                        row.categoryId
                          ? 'border-stone-300 dark:border-stone-600'
                          : 'border-orange-400 dark:border-orange-500'
                      }`}
                      value={row.categoryId ?? ''}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [row.key]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Pick category…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-stone-300 font-medium dark:border-stone-600">
                <td className="py-1.5">Paste total</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatMoney(pasteTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!allMapped}
          onClick={apply}
        >
          Merge into month
        </Button>
      </div>
    </div>
  )
}
