import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageShell } from '@/components/layout/PageShell'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { Select } from '@/components/ui/select'
import {
  CardExpenses,
  type CardExpensesHandle,
} from '@/components/track/CardExpenses'
import { ALLOWANCE_SPLIT_OPTIONS } from '@/lib/allowance-split'
import { formatMonthKey, listRecentMonthKeys } from '@/lib/dates'
import { registerCardSheetFlush } from '@/lib/card-sheet'
import {
  bumpPaymentByOwner,
  computeMonthly,
  draftForMonth,
  emptyPaymentByOwner,
  normalizePaymentByOwner,
  settleExpenseShares,
  type WizardDraft,
} from '@/lib/finance'
import { formatMoney, netCaption } from '@/lib/number'
import { useTandemStore } from '@/store/tandem-store'
import type { AllowanceSplit } from '@/types/tandem'

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
  const cardExpensesRef = useRef<CardExpensesHandle>(null)

  useEffect(() => {
    const id = setInterval(() => void autosaveDraft(), 5000)
    return () => clearInterval(id)
  }, [autosaveDraft])

  useEffect(() => {
    registerCardSheetFlush(() => cardExpensesRef.current?.flush() ?? false)
    return () => registerCardSheetFlush(null)
  }, [])

  const allowanceSplit = state.settings.allowanceSplit
  const { settings } = state
  const money = formatMoney

  const computed = useMemo(
    () => computeMonthly(draft.inflows, draft.outflows, allowanceSplit),
    [draft.inflows, draft.outflows, allowanceSplit],
  )

  const paymentByOwner = useMemo(
    () => normalizePaymentByOwner(draft.paymentByOwner),
    [draft.paymentByOwner],
  )

  const settlement = useMemo(
    () =>
      settleExpenseShares(
        paymentByOwner,
        draft.inflows,
        computed.expenseSharePartnerA,
        computed.expenseSharePartnerB,
        allowanceSplit,
      ),
    [
      paymentByOwner,
      draft.inflows,
      computed.expenseSharePartnerA,
      computed.expenseSharePartnerB,
      allowanceSplit,
    ],
  )

  const setAllowanceSplit = (mode: AllowanceSplit) => {
    updateState((s) => ({
      ...s,
      settings: { ...s.settings, allowanceSplit: mode },
    }))
  }

  const update = (patch: Partial<WizardDraft>) => {
    setWizardDraft({ ...draft, ...patch })
  }

  const onSave = async () => {
    // Sheet amounts live in CardExpenses until Add — flush so Save still picks them up
    // (sticky footer often covers Add to month). Zustand set is sync, then read latest.
    cardExpensesRef.current?.flush()
    const latest = useTandemStore.getState().wizardDraft
    if (!latest) return
    setSaving(true)
    try {
      await saveMonth(latest)
    } finally {
      setSaving(false)
    }
  }

  const monthOptions = listRecentMonthKeys(36)
  const editingSaved = Boolean(state.history[draft.monthKey])

  const loadMonth = (key: string) => {
    if (key === draft.monthKey) return
    // Discard unapplied sheet amounts for the previous month (not yet in outflows).
    setWizardDraft(draftForMonth(state.history, key, settings.categories))
  }

  const leftoverNegative = computed.leftoverAfterExpenses < 0

  return (
    <>
    <PageShell
      className="pb-[calc(11rem+4.5rem)] sm:pb-52"
      bodyClassName="space-y-8"
      header={
        <PageHeader
          title={formatMonthKey(draft.monthKey)}
          subtitle={
            <>
              {editingSaved ? 'Editing saved month' : 'New month'}
              {' · '}
              autosaves while you work
            </>
          }
          leading={
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 shrink-0 self-center"
              onClick={cancelTracking}
            >
              <ArrowLeft className="h-4 w-4" />
              Months
            </Button>
          }
        >
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
        </PageHeader>
      }
    >
      <section className="space-y-4">
        <SectionHeading
          title="Incomes"
          subtitle="Partner salaries plus anything else that landed this month — gifts, refunds, side work."
        />
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
        <SectionHeading
          title="Expenses"
          subtitle="Pick a card, type that bank’s labels, then Add to month. Totals below roll into household categories."
        />
        <CardExpenses
          key={draft.monthKey}
          ref={cardExpensesRef}
          banks={settings.banks ?? []}
          cards={settings.cards ?? []}
          categories={settings.categories}
          mappings={settings.categoryMappings ?? []}
          outflows={draft.outflows}
          partnerAName={settings.partnerAName}
          partnerBName={settings.partnerBName}
          onApply={({ outflows, mappings, payment }) => {
            update({
              outflows,
              ...(payment
                ? {
                    paymentByOwner: bumpPaymentByOwner(
                      draft.paymentByOwner ?? emptyPaymentByOwner(),
                      payment.owner,
                      payment.amount,
                    ),
                  }
                : {}),
            })
            // Avoid dirtying vault settings when only outflows changed (Add to month).
            if (mappings === settings.categoryMappings) return
            updateState((s) => ({
              ...s,
              settings: {
                ...s.settings,
                categoryMappings: mappings,
              },
            }))
          }}
        />
      </section>

      <section className="space-y-4 border-t border-stone-300 pt-6 dark:border-stone-700">
        <SectionHeading title="Notes" />
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="sr-only">
            Notes (optional)
          </Label>
          <Input
            id="notes"
            placeholder="Optional notes for this month"
            value={draft.notes ?? ''}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </div>
      </section>
    </PageShell>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-300 bg-[var(--surface)] dark:border-stone-700">
        {/* Sit above mobile bottom nav */}
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-5 py-2 pb-[calc(0.5rem+4.5rem)] sm:gap-3 sm:px-8 sm:py-3 sm:pb-3">
          <div className="flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-stone-200 dark:sm:divide-stone-700">
            <SummaryPart
              title="Household"
              metrics={[
                {
                  label: 'Expenses',
                  shortLabel: 'Expenses',
                  value: money(computed.totalOutflow),
                },
                {
                  label: netCaption(computed.leftoverAfterExpenses, 'label'),
                  shortLabel: 'Net',
                  value: money(computed.leftoverAfterExpenses),
                  negative: leftoverNegative,
                },
              ]}
            />
            <SummaryPart
              title={settings.partnerAName}
              titleColor="var(--partner-a)"
              metrics={[
                {
                  label: 'Fair share of expenses',
                  shortLabel: 'Pays',
                  value: money(computed.expenseSharePartnerA),
                },
                {
                  label: 'Fair share of Net',
                  shortLabel: 'Net share',
                  value: money(computed.personalAllowancePartnerA),
                },
              ]}
            />
            <SummaryPart
              title={settings.partnerBName}
              titleColor="var(--partner-b)"
              metrics={[
                {
                  label: 'Fair share of expenses',
                  shortLabel: 'Pays',
                  value: money(computed.expenseSharePartnerB),
                },
                {
                  label: 'Fair share of Net',
                  shortLabel: 'Net share',
                  value: money(computed.personalAllowancePartnerB),
                },
              ]}
            />
          </div>

          {settlement.hasPaymentData ? (
            <p
              className="text-center text-xs text-stone-600 dark:text-stone-400"
              title="Card entry (who paid) vs fair share of expenses — common-card spend is split like expenses"
            >
              {settlement.direction === 'settled' ? (
                <>Settled — card payments match fair shares</>
              ) : settlement.direction === 'b_to_a' ? (
                <>
                  Settle{' '}
                  <span className="font-medium tabular-nums text-stone-800 dark:text-stone-200">
                    {money(settlement.transferAmount)}
                  </span>
                  : {settings.partnerBName} → {settings.partnerAName}
                </>
              ) : (
                <>
                  Settle{' '}
                  <span className="font-medium tabular-nums text-stone-800 dark:text-stone-200">
                    {money(settlement.transferAmount)}
                  </span>
                  : {settings.partnerAName} → {settings.partnerBName}
                </>
              )}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-1.5 sm:pt-3 dark:border-stone-700">
            <div
              className="flex items-center gap-1.5"
              title="How Pays and Net share are split — Pays is fair share of expenses; Net share is fair share of household leftover (not each person’s bank balance). Change the default in Settings"
            >
              <span className="text-[11px] text-stone-600 dark:text-stone-400">
                Split
              </span>
              <div className="flex gap-0.5 rounded-md bg-stone-200/80 p-0.5 dark:bg-stone-800">
                {ALLOWANCE_SPLIT_OPTIONS.map(({ id, label, shortLabel }) => (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => setAllowanceSplit(id)}
                    className={`cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 ${
                      allowanceSplit === id
                        ? 'bg-[var(--surface)] text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50'
                        : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                    }`}
                  >
                    {shortLabel}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={cancelTracking}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void onSave()}
                disabled={saving || syncing}
              >
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
    </>
  )
}

type SummaryMetric = {
  label: string
  shortLabel: string
  value: string
  negative?: boolean
}

function SummaryPart({
  title,
  titleColor,
  metrics,
}: {
  title: string
  titleColor?: string
  metrics: SummaryMetric[]
}) {
  const titleClass = `truncate text-[10px] font-medium tracking-[0.14em] uppercase ${
    titleColor ? '' : 'text-stone-600 dark:text-stone-400'
  }`
  const titleStyle = titleColor ? { color: titleColor } : undefined

  return (
    <div className="min-w-0 sm:px-4 first:sm:pl-0 last:sm:pr-0">
      {/* Mobile: 3 equal columns — title | metric | metric */}
      <div className="grid grid-cols-3 items-baseline gap-1.5 sm:hidden">
        <p className={`min-w-0 truncate ${titleClass}`} style={titleStyle} title={title}>
          {title}
        </p>
        {metrics.map((m) => (
          <p
            key={m.label}
            className="min-w-0 truncate text-[12px] tabular-nums"
            title={`${m.label} ${m.value}`}
          >
            <span className="text-stone-600 dark:text-stone-400">
              {m.shortLabel}{' '}
            </span>
            <span
              className={`font-semibold ${
                m.negative
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-stone-900 dark:text-stone-50'
              }`}
            >
              {m.value}
            </span>
          </p>
        ))}
      </div>

      {/* sm+: titled columns */}
      <div className="hidden sm:block">
        <p className={`mb-1.5 ${titleClass}`} style={titleStyle} title={title}>
          {title}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-0">
              <p className="text-[11px] text-stone-600 dark:text-stone-400">
                {m.label}
              </p>
              <p
                className={`font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums tracking-tight ${
                  m.negative
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-stone-900 dark:text-stone-50'
                }`}
              >
                {m.value}
              </p>
            </div>
          ))}
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
