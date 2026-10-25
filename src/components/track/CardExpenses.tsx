import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { Select } from '@/components/ui/select'
import {
  mappingsForBank,
  mergeCardLinesIntoOutflows,
  normalizeBankLabel,
  upsertBankMappings,
} from '@/lib/card-expenses'
import { formatMoney } from '@/lib/number'
import { cn } from '@/lib/utils'
import type {
  BankCategoryMapping,
  CategoryExpense,
  ExpenseBank,
  ExpenseCard,
  ExpenseCategory,
} from '@/types/tandem'

function ownerLabel(
  owner: ExpenseCard['owner'],
  partnerAName: string,
  partnerBName: string,
): string {
  if (owner === 'common') return 'Common'
  if (owner === 'partnerA') return partnerAName
  return partnerBName
}

function sortCards(
  cards: ExpenseCard[],
  banks: ExpenseBank[],
): ExpenseCard[] {
  const bankOrder = new Map(banks.map((b, i) => [b.id, i]))
  const ownerOrder = { common: 0, partnerA: 1, partnerB: 2 }
  return [...cards].sort((a, b) => {
    const bi =
      (bankOrder.get(a.bankId) ?? 99) - (bankOrder.get(b.bankId) ?? 99)
    if (bi !== 0) return bi
    const oi = ownerOrder[a.owner] - ownerOrder[b.owner]
    if (oi !== 0) return oi
    return a.name.localeCompare(b.name)
  })
}

export type CardExpensesHandle = {
  /** Merge any typed sheet amounts into the month. Returns true if something was applied. */
  flush: () => boolean
  hasPending: () => boolean
}

export const CardExpenses = forwardRef<
  CardExpensesHandle,
  {
    banks: ExpenseBank[]
    cards: ExpenseCard[]
    categories: ExpenseCategory[]
    mappings: BankCategoryMapping[]
    outflows: CategoryExpense[]
    partnerAName: string
    partnerBName: string
    onApply: (next: {
      outflows: CategoryExpense[]
      mappings: BankCategoryMapping[]
    }) => void
  }
>(function CardExpenses(
  {
    banks,
    cards,
    categories,
    mappings,
    outflows,
    partnerAName,
    partnerBName,
    onApply,
  },
  ref,
) {
  const sortedCards = useMemo(
    () => sortCards(cards, banks),
    [cards, banks],
  )
  const [cardId, setCardId] = useState(sortedCards[0]?.id ?? '')
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [newLabel, setNewLabel] = useState('')
  const [newCategoryId, setNewCategoryId] = useState(
    categories[0]?.id ?? '',
  )

  useEffect(() => {
    if (
      categories.length > 0 &&
      !categories.some((c) => c.id === newCategoryId)
    ) {
      setNewCategoryId(categories[0]!.id)
    }
  }, [categories, newCategoryId])

  useEffect(() => {
    if (sortedCards.length === 0) return
    if (!sortedCards.some((c) => c.id === cardId)) {
      setCardId(sortedCards[0]!.id)
      setAmounts({})
      setNewLabel('')
    }
  }, [sortedCards, cardId])

  const card = sortedCards.find((c) => c.id === cardId) ?? sortedCards[0]
  const bank = banks.find((b) => b.id === card?.bankId)
  const bankId = bank?.id ?? ''

  // Labels are per bank — shared by every card at that bank (e.g. all Revolut).
  const bankMaps = useMemo(() => {
    if (!bankId) return []
    return mappingsForBank(mappings, bankId)
  }, [mappings, bankId])

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id

  const sheetTotal = useMemo(
    () => bankMaps.reduce((s, m) => s + (amounts[m.key] ?? 0), 0),
    [bankMaps, amounts],
  )

  const hasAmount = sheetTotal !== 0
  const monthTotal = outflows.reduce((s, o) => s + (o.amount || 0), 0)

  const pickCard = (id: string) => {
    if (id === cardId) return
    const next = sortedCards.find((c) => c.id === id)
    const prevBankId = card?.bankId
    setCardId(id)
    // Same bank → same labels; keep amounts. Different bank → reset sheet.
    if (next?.bankId !== prevBankId) {
      setAmounts({})
      setNewLabel('')
    }
  }

  const clearAmounts = () => {
    setAmounts({})
    setNewLabel('')
  }

  const pendingLines = (): Array<{ categoryId: string; amount: number }> => {
    const lines: Array<{ categoryId: string; amount: number }> = []
    for (const m of bankMaps) {
      const amount = amounts[m.key] ?? 0
      if (amount !== 0) {
        lines.push({ categoryId: m.categoryId, amount })
      }
    }
    return lines
  }

  /** Persist label → category on the bank immediately (not only on Add to month). */
  const addNewLabel = () => {
    if (!bankId || !newLabel.trim() || !newCategoryId) return
    const key = normalizeBankLabel(newLabel)
    if (!key) return
    if (bankMaps.some((m) => m.key === key)) {
      setNewLabel('')
      return
    }
    onApply({
      outflows,
      mappings: upsertBankMappings(mappings, bankId, [
        { label: newLabel.trim(), categoryId: newCategoryId },
      ]),
    })
    setNewLabel('')
  }

  const apply = (): boolean => {
    if (!hasAmount || !bankId || !card) return false

    const lines = pendingLines()
    if (lines.length === 0) return false

    onApply({
      outflows: mergeCardLinesIntoOutflows(outflows, lines, categories),
      mappings,
    })
    clearAmounts()
    return true
  }

  const apiRef = useRef({
    flush: (): boolean => false,
    hasPending: (): boolean => false,
  })
  useLayoutEffect(() => {
    apiRef.current = {
      flush: () => apply(),
      hasPending: () => hasAmount && pendingLines().length > 0,
    }
  })
  useImperativeHandle(ref, () => ({
    flush: () => apiRef.current.flush(),
    hasPending: () => apiRef.current.hasPending(),
  }))

  if (cards.length === 0 || banks.length === 0) {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Add banks and cards under Settings → Banks, then enter this month’s
        spend from each card here. Labels are shared across all cards of a
        bank.
      </p>
    )
  }

  if (!card || !bank) {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-400">
        This card’s bank is missing — fix it in Settings → Banks.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div
          className="flex flex-wrap gap-2"
          role="listbox"
          aria-label="Cards"
        >
          {sortedCards.map((c) => {
            const b = banks.find((x) => x.id === c.bankId)
            const selected = c.id === card.id
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pickCard(c.id)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  selected
                    ? 'border-teal-700/40 bg-teal-700/10 text-stone-900 dark:border-teal-400/40 dark:bg-teal-400/10 dark:text-stone-50'
                    : 'border-stone-300 bg-[var(--surface)] text-stone-700 hover:border-stone-400 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-500',
                )}
              >
                <OwnerBadge
                  owner={c.owner}
                  partnerAName={partnerAName}
                  partnerBName={partnerBName}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block truncate text-[11px] text-stone-600 dark:text-stone-400">
                    {b?.name ?? '?'} ·{' '}
                    {ownerLabel(c.owner, partnerAName, partnerBName)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400">
          {bank.name} labels (same on every {bank.name} card) → household
          categories. Example: “Restaurants” → Food.
        </p>

        {bankMaps.length === 0 ? (
          <p className="text-xs text-stone-600 dark:text-stone-400">
            No labels yet — add one below.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bankMaps.map((m) => (
              <li
                key={m.key}
                className="flex min-w-0 items-center gap-2 rounded-md border border-stone-200/80 px-2.5 py-1.5 dark:border-stone-700/80"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-stone-800 dark:text-stone-100">
                    {m.label}
                  </span>
                  <span className="block truncate text-[11px] text-stone-600 dark:text-stone-400">
                    → {catName(m.categoryId)}
                  </span>
                </div>
                <MoneyInput
                  id={`card-amt-${m.key}`}
                  name={`card-amt-${m.key}`}
                  value={amounts[m.key] ?? 0}
                  onValueChange={(n) =>
                    setAmounts((prev) => ({ ...prev, [m.key]: n }))
                  }
                  className="h-8 w-[6.5rem] shrink-0"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            placeholder="New label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNewLabel()}
            className="h-8 min-w-[6rem] flex-1"
          />
          <Select
            wrapperClassName="w-[8rem] shrink-0"
            className="h-8 pr-7 pl-2 text-xs"
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={addNewLabel}
            disabled={!newLabel.trim() || !newCategoryId}
            aria-label="Add label"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex scroll-mt-4 scroll-mb-40 flex-wrap items-center justify-between gap-2">
          <p className="text-sm tabular-nums text-stone-600 dark:text-stone-400">
            This card {formatMoney(sheetTotal)}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={!hasAmount}
            onClick={() => apply()}
          >
            Add to month
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t border-stone-200 pt-4 dark:border-stone-700">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[10px] font-medium tracking-[0.14em] text-stone-600 uppercase dark:text-stone-400">
            Month totals
          </p>
          <p className="text-sm font-medium tabular-nums text-stone-800 dark:text-stone-100">
            {formatMoney(monthTotal)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {outflows.map((o) => (
            <div
              key={o.categoryId}
              className={cn('min-w-0', o.amount === 0 && 'opacity-45')}
            >
              <p className="truncate text-[11px] text-stone-600 dark:text-stone-400">
                {o.categoryName}
              </p>
              <p className="text-sm font-medium tabular-nums text-stone-900 dark:text-stone-100">
                {formatMoney(o.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
