import { useMemo, useState } from 'react'
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

export function AddFromCard({
  banks,
  cards,
  categories,
  mappings,
  outflows,
  partnerAName,
  partnerBName,
  onCancel,
  onApply,
}: {
  banks: ExpenseBank[]
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
  const [newAmount, setNewAmount] = useState(0)
  const [sessionMaps, setSessionMaps] = useState<BankCategoryMapping[]>([])

  const card = sortedCards.find((c) => c.id === cardId) ?? sortedCards[0]
  const bank = banks.find((b) => b.id === card?.bankId)
  const bankId = bank?.id ?? ''

  const bankMaps = useMemo(() => {
    if (!bankId) return []
    const base = mappingsForBank(mappings, bankId)
    const extra = sessionMaps.filter((m) => m.bankId === bankId)
    const byKey = new Map(base.map((m) => [m.key, m]))
    for (const m of extra) byKey.set(m.key, m)
    return Array.from(byKey.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    )
  }, [mappings, sessionMaps, bankId])

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id

  const sheetTotal = useMemo(() => {
    let sum = bankMaps.reduce((s, m) => s + (amounts[m.key] ?? 0), 0)
    if (newLabel.trim() && newAmount !== 0) sum += newAmount
    return sum
  }, [bankMaps, amounts, newLabel, newAmount])

  const hasAmount = sheetTotal !== 0

  const pickCard = (id: string) => {
    setCardId(id)
    setAmounts({})
    setNewLabel('')
    setNewAmount(0)
    setSessionMaps([])
  }

  const addNewLabel = () => {
    if (!bankId || !newLabel.trim() || !newCategoryId) return
    const key = normalizeBankLabel(newLabel)
    if (!key) return
    if (bankMaps.some((m) => m.key === key)) {
      setAmounts((prev) => ({
        ...prev,
        [key]: (prev[key] ?? 0) + newAmount,
      }))
    } else {
      setSessionMaps((prev) => [
        ...prev.filter((m) => !(m.bankId === bankId && m.key === key)),
        {
          bankId,
          key,
          label: newLabel.trim(),
          categoryId: newCategoryId,
        },
      ])
      if (newAmount !== 0) {
        setAmounts((prev) => ({ ...prev, [key]: newAmount }))
      }
    }
    setNewLabel('')
    setNewAmount(0)
  }

  const apply = () => {
    if (!hasAmount || !bankId || !card) return

    const lines: Array<{ categoryId: string; amount: number }> = []
    const mappingUpserts: Array<{ label: string; categoryId: string }> = []

    for (const m of bankMaps) {
      const amount = amounts[m.key] ?? 0
      if (amount !== 0) {
        lines.push({ categoryId: m.categoryId, amount })
      }
      if (sessionMaps.some((s) => s.bankId === bankId && s.key === m.key)) {
        mappingUpserts.push({ label: m.label, categoryId: m.categoryId })
      }
    }

    if (newLabel.trim() && newCategoryId) {
      const key = normalizeBankLabel(newLabel)
      if (key) {
        if (newAmount !== 0) {
          lines.push({ categoryId: newCategoryId, amount: newAmount })
        }
        mappingUpserts.push({
          label: newLabel.trim(),
          categoryId: newCategoryId,
        })
      }
    }

    if (lines.length === 0) return

    onApply({
      outflows: mergeCardLinesIntoOutflows(outflows, lines, categories),
      mappings:
        mappingUpserts.length > 0
          ? upsertBankMappings(mappings, bankId, mappingUpserts)
          : mappings,
    })
  }

  if (cards.length === 0 || banks.length === 0) {
    return (
      <div className="space-y-2 rounded-xl border border-stone-300 p-3 dark:border-stone-700">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Add banks and cards under Settings → Banks first.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Back
        </Button>
      </div>
    )
  }

  if (!card || !bank) {
    return (
      <div className="space-y-2 rounded-xl border border-stone-300 p-3 dark:border-stone-700">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          This card’s bank is missing — fix it in Settings → Banks.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-stone-300 p-3 dark:border-stone-700">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Add from card
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {bank.name} labels → household categories
        </p>
      </div>

      <Select
        id="card-pick"
        value={card.id}
        onChange={(e) => pickCard(e.target.value)}
        className="h-8 text-sm"
        aria-label="Card"
      >
        {sortedCards.map((c) => {
          const b = banks.find((x) => x.id === c.bankId)
          return (
            <option key={c.id} value={c.id}>
              {b?.name ?? '?'} · {c.name} ·{' '}
              {ownerLabel(c.owner, partnerAName, partnerBName)}
            </option>
          )
        })}
      </Select>

      {card ? (
        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
          <span>Entering as</span>
          <OwnerBadge
            owner={card.owner}
            partnerAName={partnerAName}
            partnerBName={partnerBName}
          />
          <span>{ownerLabel(card.owner, partnerAName, partnerBName)}</span>
        </div>
      ) : null}

      {bankMaps.length === 0 ? (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          No labels yet — add one below.
        </p>
      ) : (
        <ul className="space-y-1">
          {bankMaps.map((m, idx) => (
            <li key={m.key} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-stone-800 dark:text-stone-100">
                  {m.label}
                </span>
                <span className="ml-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                  → {catName(m.categoryId)}
                </span>
              </div>
              <MoneyInput
                id={`card-amt-${m.key}`}
                name={`card-amt-${m.key}`}
                autoFocus={idx === 0}
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
        <MoneyInput
          value={newAmount}
          onValueChange={setNewAmount}
          className="h-8 w-[6.5rem] shrink-0"
        />
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
          {formatMoney(sheetTotal)}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!hasAmount}
            onClick={apply}
          >
            Add to month
          </Button>
        </div>
      </div>
    </div>
  )
}
