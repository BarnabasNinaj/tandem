import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { Select } from '@/components/ui/select'
import { AddFromCard } from '@/components/wizard/AddFromCard'
import { formatMonthKey, listRecentMonthKeys } from '@/lib/dates'
import {
  computeMonthly,
  draftForMonth,
  type WizardDraft,
} from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { useTandemStore } from '@/store/tandem-store'

export function MonthEditor() {
  const state = useTandemStore((s) => s.state)!
  const draft = useTandemStore((s) => s.wizardDraft)!
  const setWizardDraft = useTandemStore((s) => s.setWizardDraft)
  const cancelTracking = useTandemStore((s) => s.cancelTracking)
  const saveMonth = useTandemStore((s) => s.saveMonth)
  const autosaveDraft = useTandemStore((s) => s.autosaveDraft)
  const updateState = useTandemStore((s) => s.updateState)
  const syncing = useTandemStore((s) => s.syncing)

  const [saving, setSaving] = useState(false)
  const [addFromCard, setAddFromCard] = useState(false)

  useEffect(() => {
    const id = setInterval(() => void autosaveDraft(), 5000)
    return () => clearInterval(id)
  }, [autosaveDraft])

  const allowanceSplit = state.settings.allowanceSplit
  const { settings } = state
  const money = formatMoney

  const computed = useMemo(
    () =>
      computeMonthly(
        draft.inflows,
        draft.outflows,
        draft.allocations,
        allowanceSplit,
      ),
    [draft, allowanceSplit],
  )

  const setAllowanceSplit = (mode: 'equal' | 'income') => {
    updateState((s) => ({
      ...s,
      settings: { ...s.settings, allowanceSplit: mode },
    }))
  }

  const update = (patch: Partial<WizardDraft>) => {
    setWizardDraft({ ...draft, ...patch })
  }

  const onSave = async () => {
    setSaving(true)
    try {
      await saveMonth(draft)
    } finally {
      setSaving(false)
    }
  }

  const monthOptions = listRecentMonthKeys(36)
  const editingSaved = Boolean(state.history[draft.monthKey])

  const loadMonth = (key: string) => {
    if (key === draft.monthKey) return
    setWizardDraft(draftForMonth(state.history, key, settings.categories))
    setAddFromCard(false)
  }

  return (
    <div className="space-y-8 pb-28 animate-[fadeUp_0.35s_ease-out]">
      <header className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={cancelTracking}
        >
          <ArrowLeft className="h-4 w-4" />
          Months
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-stone-900 dark:text-stone-50 sm:text-3xl">
            {formatMonthKey(draft.monthKey)}
          </h1>
          <p className="text-sm text-stone-700 dark:text-stone-400">
            {editingSaved ? 'Editing saved month' : 'New month'}
            {' · '}
            autosaves while you work
          </p>
        </div>
        <label className="sr-only" htmlFor="track-month">
          Month
        </label>
        <Select
          id="track-month"
          wrapperClassName="shrink-0 w-auto"
          title={
            editingSaved
              ? 'Editing saved month — save to overwrite'
              : 'New month — pick a saved one to edit'
          }
          className="h-9 max-w-[10rem] rounded-md border-stone-300 pr-7 pl-2 text-sm text-stone-800 dark:text-stone-100"
          value={draft.monthKey}
          onChange={(e) => loadMonth(e.target.value)}
        >
          {monthOptions.map((k) => (
            <option key={k} value={k}>
              {formatMonthKey(k)}
              {state.history[k] ? ' · saved' : ''}
            </option>
          ))}
        </Select>
      </header>

      <section className="space-y-4 border-t border-stone-300 pt-6 dark:border-stone-700">
        <h2 className="text-xs font-medium tracking-[0.18em] text-stone-700 uppercase dark:text-stone-400">
          Incomes
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={`${settings.partnerAName} Income`} name="pa-income">
            <MoneyInput
              name="pa-income"
              autoFocus
              value={draft.inflows.partnerASalary}
              onValueChange={(n) =>
                update({
                  inflows: { ...draft.inflows, partnerASalary: n },
                })
              }
            />
          </Field>
          <Field label={`${settings.partnerBName} Income`} name="pb-income">
            <MoneyInput
              name="pb-income"
              value={draft.inflows.partnerBIncome}
              onValueChange={(n) =>
                update({
                  inflows: { ...draft.inflows, partnerBIncome: n },
                })
              }
            />
          </Field>
          <Field label="Other Income" name="other">
            <MoneyInput
              name="other"
              value={draft.inflows.otherInflows}
              onValueChange={(n) =>
                update({
                  inflows: { ...draft.inflows, otherInflows: n },
                })
              }
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t border-stone-300 pt-6 dark:border-stone-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium tracking-[0.18em] text-stone-700 uppercase dark:text-stone-400">
            Expenses
          </h2>
          {!addFromCard && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAddFromCard(true)}
            >
              Add from card
            </Button>
          )}
        </div>
        {addFromCard ? (
          <AddFromCard
            banks={settings.banks ?? []}
            cards={settings.cards ?? []}
            categories={settings.categories}
            mappings={settings.categoryMappings ?? []}
            outflows={draft.outflows}
            partnerAName={settings.partnerAName}
            partnerBName={settings.partnerBName}
            onCancel={() => setAddFromCard(false)}
            onApply={({ outflows, mappings }) => {
              update({ outflows })
              updateState((s) => ({
                ...s,
                settings: {
                  ...s.settings,
                  categoryMappings: mappings,
                },
              }))
              setAddFromCard(false)
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {draft.outflows.map((o) => (
                <Field
                  key={o.categoryId}
                  label={o.categoryName}
                  name={o.categoryId}
                >
                  <MoneyInput
                    name={o.categoryId}
                    value={o.amount}
                    onValueChange={(n) => {
                      const outflows = draft.outflows.map((x) =>
                        x.categoryId === o.categoryId ? { ...x, amount: n } : x,
                      )
                      update({ outflows })
                    }}
                  />
                </Field>
              ))}
            </div>
            <p className="text-right text-sm font-medium text-stone-700 dark:text-stone-200">
              Total expenses: {money(computed.totalOutflow)}
            </p>
          </>
        )}
      </section>

      <section className="space-y-5 border-t border-stone-300 pt-6 dark:border-stone-700">
        <h2 className="text-xs font-medium tracking-[0.18em] text-stone-700 uppercase dark:text-stone-400">
          Allocations
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Emergency reserve" name="alloc-em">
            <MoneyInput
              name="alloc-em"
              value={draft.allocations.emergencyReserve}
              onValueChange={(n) =>
                update({
                  allocations: {
                    ...draft.allocations,
                    emergencyReserve: n,
                  },
                })
              }
            />
          </Field>
          <Field label="Travel fund" name="alloc-tr">
            <MoneyInput
              name="alloc-tr"
              value={draft.allocations.travelFund}
              onValueChange={(n) =>
                update({
                  allocations: {
                    ...draft.allocations,
                    travelFund: n,
                  },
                })
              }
            />
          </Field>
          <Field label="Investments" name="alloc-inv">
            <MoneyInput
              name="alloc-inv"
              value={draft.allocations.investments}
              onValueChange={(n) =>
                update({
                  allocations: {
                    ...draft.allocations,
                    investments: n,
                  },
                })
              }
            />
          </Field>
        </div>

        <h3 className="pt-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
          Portfolio snapshot (end of month)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['emergencyReserveBalance', 'Emergency balance'],
              ['travelFundBalance', 'Travel fund balance'],
              ['externalInvestmentsBalance', 'External investments'],
              ['liquidCashBalance', 'Liquid cash'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} name={key}>
              <MoneyInput
                name={key}
                value={draft.portfolioSnapshot[key]}
                onValueChange={(n) =>
                  update({
                    portfolioSnapshot: {
                      ...draft.portfolioSnapshot,
                      [key]: n,
                    },
                  })
                }
              />
            </Field>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input
            id="notes"
            value={draft.notes ?? ''}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-300 bg-[var(--surface)]/95 backdrop-blur-md dark:border-stone-700 sm:bottom-0">
        {/* Sit above mobile bottom nav */}
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 pb-[calc(0.75rem+4.5rem)] sm:pb-3">
          <div className="space-y-1.5 rounded-lg border border-teal-200/80 bg-teal-50/90 px-3 py-2 dark:border-teal-900 dark:bg-teal-950/40">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="shrink-0 text-[10px] font-medium tracking-wide text-teal-800 uppercase dark:text-teal-300">
                Split
              </p>
              <div className="flex shrink-0 gap-0.5 rounded-md bg-teal-900/10 p-0.5 dark:bg-teal-950/60">
                {(
                  [
                    { id: 'equal', label: '50/50' },
                    { id: 'income', label: 'Income' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAllowanceSplit(id)}
                    className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      allowanceSplit === id
                        ? 'bg-white text-teal-950 shadow-sm dark:bg-teal-800 dark:text-teal-50'
                        : 'text-teal-800/80 hover:text-teal-950 dark:text-teal-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="min-w-0 flex-1 text-[11px] tabular-nums text-teal-800/75 dark:text-teal-400/75 sm:text-right">
                Left after expenses {money(computed.leftoverAfterExpenses)}
                <span className="mx-1 text-teal-600/40">·</span>
                Pocket {money(computed.discretionarySurplus)}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] tabular-nums text-teal-900 dark:text-teal-100">
              <p>
                <span className="text-teal-700/80 dark:text-teal-400">
                  Expenses{' '}
                </span>
                <span style={{ color: 'var(--partner-a)' }}>
                  {settings.partnerAName}
                </span>{' '}
                {money(computed.expenseSharePartnerA)}
                <span className="mx-1 text-teal-600/40">·</span>
                <span style={{ color: 'var(--partner-b)' }}>
                  {settings.partnerBName}
                </span>{' '}
                {money(computed.expenseSharePartnerB)}
              </p>
              <p>
                <span className="text-teal-700/80 dark:text-teal-400">
                  Pocket{' '}
                </span>
                {allowanceSplit === 'equal' ? (
                  <>{money(computed.personalAllowancePartnerA)} each</>
                ) : (
                  <>
                    <span style={{ color: 'var(--partner-a)' }}>
                      {settings.partnerAName}
                    </span>{' '}
                    {money(computed.personalAllowancePartnerA)}
                    <span className="mx-1 text-teal-600/40">·</span>
                    <span style={{ color: 'var(--partner-b)' }}>
                      {settings.partnerBName}
                    </span>{' '}
                    {money(computed.personalAllowancePartnerB)}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={cancelTracking}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={saving || syncing}>
              {saving || syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Encrypting & syncing…
                </>
              ) : (
                'Save month'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  children,
}: {
  label: string
  name: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
    </div>
  )
}
