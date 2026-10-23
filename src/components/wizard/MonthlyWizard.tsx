import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { formatMonthKey, listRecentMonthKeys, toMonthKey } from '@/lib/dates'
import {
  computeMonthly,
  emptyDraft,
  getLatestRecord,
  type WizardDraft,
} from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { useTandemStore } from '@/store/tandem-store'

const STEP_LABELS = ['Incomes', 'Expenses', 'Allocations'] as const

export function MonthlyWizard() {
  const open = useTandemStore((s) => s.wizardOpen)
  const closeWizard = useTandemStore((s) => s.closeWizard)
  const state = useTandemStore((s) => s.state)
  const draft = useTandemStore((s) => s.wizardDraft)
  const setWizardDraft = useTandemStore((s) => s.setWizardDraft)
  const saveMonth = useTandemStore((s) => s.saveMonth)
  const autosaveDraft = useTandemStore((s) => s.autosaveDraft)
  const restoreDraft = useTandemStore((s) => s.restoreDraft)
  const updateState = useTandemStore((s) => s.updateState)
  const syncing = useTandemStore((s) => s.syncing)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !state) return
    let cancelled = false
    void (async () => {
      if (draft) return
      const restored = await restoreDraft()
      if (cancelled) return
      if (restored) {
        setWizardDraft(restored)
        return
      }
      const latest = getLatestRecord(state)
      setWizardDraft(
        emptyDraft(toMonthKey(), state.settings.categories, latest),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [open, state, draft, restoreDraft, setWizardDraft])

  useEffect(() => {
    if (!open || !draft) return
    const id = setInterval(() => void autosaveDraft(), 5000)
    return () => clearInterval(id)
  }, [open, draft, autosaveDraft])

  const allowanceSplit = state?.settings.allowanceSplit ?? 'equal'

  const computed = useMemo(
    () =>
      draft
        ? computeMonthly(
            draft.inflows,
            draft.outflows,
            draft.allocations,
            allowanceSplit,
          )
        : null,
    [draft, allowanceSplit],
  )

  if (!open || !state || !draft || !computed) return null

  const { settings } = state
  const money = formatMoney

  const setAllowanceSplit = (mode: 'equal' | 'income') => {
    updateState((s) => ({
      ...s,
      settings: { ...s.settings, allowanceSplit: mode },
    }))
  }

  const update = (patch: Partial<WizardDraft>) => {
    setWizardDraft({ ...draft, ...patch })
  }

  const onComplete = async () => {
    setSaving(true)
    try {
      await saveMonth(draft)
    } finally {
      setSaving(false)
    }
  }

  const monthOptions = listRecentMonthKeys(36)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-stone-300 bg-[var(--surface)] shadow-2xl animate-[fadeUp_0.35s_ease-out] dark:border-stone-700 sm:max-h-[90dvh] sm:rounded-2xl"
        role="dialog"
        aria-labelledby="wizard-title"
      >
        <header className="flex items-center justify-between border-b border-stone-300 px-5 py-4 dark:border-stone-700">
          <div>
            <h2
              id="wizard-title"
              className="text-lg font-semibold text-stone-900 dark:text-stone-100"
            >
              Track Data
            </h2>
            <p className="text-xs text-stone-700 dark:text-stone-400">
              Step {step + 1} of 3 · {STEP_LABELS[step]} ·{' '}
              {formatMonthKey(draft.monthKey)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={closeWizard} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex gap-1 px-5 pt-4">
          {STEP_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-teal-700 text-white'
                  : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="month">Month (MM/YYYY)</Label>
                <select
                  id="month"
                  autoFocus
                  className="flex h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900"
                  value={draft.monthKey}
                  onChange={(e) => update({ monthKey: e.target.value })}
                >
                  {monthOptions.map((k) => (
                    <option key={k} value={k}>
                      {formatMonthKey(k)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Field
                  label={`${settings.partnerAName} Income`}
                  name="pa-income"
                >
                  <MoneyInput
                    name="pa-income"
                    value={draft.inflows.partnerASalary}
                    onValueChange={(n) =>
                      update({
                        inflows: { ...draft.inflows, partnerASalary: n },
                      })
                    }
                  />
                </Field>
                <Field
                  label={`${settings.partnerBName} Income`}
                  name="pb-income"
                >
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
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {draft.outflows.map((o, idx) => (
                <Field key={o.categoryId} label={o.categoryName} name={o.categoryId}>
                  <MoneyInput
                    name={o.categoryId}
                    autoFocus={idx === 0}
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
              <p className="pt-2 text-right text-sm font-medium text-stone-700 dark:text-stone-200">
                Total expenses: {money(computed.totalOutflow)}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
                  Monthly allocations
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Emergency reserve" name="alloc-em">
                    <MoneyInput
                      name="alloc-em"
                      autoFocus
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
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-stone-800 dark:text-stone-100">
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={draft.notes ?? ''}
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-stone-300 bg-stone-50/80 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/80 sm:px-5">
          <div className="mb-3 space-y-1.5 rounded-lg border border-teal-200/80 bg-teal-50/90 px-3 py-2 dark:border-teal-900 dark:bg-teal-950/40">
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
                {settings.partnerAName} {money(computed.expenseSharePartnerA)}
                <span className="mx-1 text-teal-600/40">·</span>
                {settings.partnerBName} {money(computed.expenseSharePartnerB)}
              </p>
              <p>
                <span className="text-teal-700/80 dark:text-teal-400">
                  Pocket{' '}
                </span>
                {allowanceSplit === 'equal' ? (
                  <>{money(computed.personalAllowancePartnerA)} each</>
                ) : (
                  <>
                    {settings.partnerAName}{' '}
                    {money(computed.personalAllowancePartnerA)}
                    <span className="mx-1 text-teal-600/40">·</span>
                    {settings.partnerBName}{' '}
                    {money(computed.personalAllowancePartnerB)}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <Button
              variant="secondary"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button
                onClick={() => void onComplete()}
                disabled={saving || syncing}
              >
                {saving || syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Encrypting & syncing…
                  </>
                ) : (
                  'Complete Month'
                )}
              </Button>
            )}
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
