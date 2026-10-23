import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatDateDDMMYYYY, formatMonthKey, toMonthKey } from '@/lib/dates'
import {
  averageMonthlyOutflow,
  computeMonthly,
  emergencyMonthsCovered,
  emptyDraft,
  getLatestRecord,
  netWorthFromSnapshot,
  savingsRate,
} from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { cn } from '@/lib/utils'
import { useTandemStore } from '@/store/tandem-store'

export function Dashboard() {
  const state = useTandemStore((s) => s.state)!
  const openWizard = useTandemStore((s) => s.openWizard)
  const loadDemoData = useTandemStore((s) => s.loadDemoData)
  const syncing = useTandemStore((s) => s.syncing)
  const latest = getLatestRecord(state)
  const { settings } = state
  const money = formatMoney

  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const netWorth = latest
    ? netWorthFromSnapshot(latest.portfolioSnapshot)
    : 0
  const avgOut = averageMonthlyOutflow(state.history)
  const emMonths = latest
    ? emergencyMonthsCovered(
        latest.portfolioSnapshot.emergencyReserveBalance,
        avgOut,
      )
    : 0
  const emTarget = settings.emergencyTargetMonths
  const emPct = emTarget > 0 ? (emMonths / emTarget) * 100 : 0
  const travelBal = latest?.portfolioSnapshot.travelFundBalance ?? 0
  const splitMode = settings.allowanceSplit
  const allowanceComputed = latest
    ? computeMonthly(
        latest.inflows,
        latest.outflows,
        latest.allocations,
        splitMode,
      )
    : null
  const allowanceA = allowanceComputed?.personalAllowancePartnerA ?? 0
  const allowanceB = allowanceComputed?.personalAllowancePartnerB ?? 0
  const rate = latest ? savingsRate(latest) : null

  return (
    <div className="space-y-14 pb-4">
      {/* Hero — one composition */}
      <section
        className={cn(
          'relative overflow-hidden rounded-2xl transition-all duration-700',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        )}
        style={{
          background:
            'linear-gradient(145deg, #0f3d38 0%, #134e4a 42%, #1a5c56 70%, #2a6b52 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 90% 10%, rgba(153,246,228,0.25), transparent 55%)',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center">
          <div className="grid min-w-0 flex-1 grid-cols-1 items-center gap-3 px-5 py-3 sm:grid-cols-3 sm:gap-6 sm:px-6">
            <h1 className="min-w-0 truncate justify-self-center text-center font-[family-name:var(--font-display)] text-lg font-semibold leading-none tracking-tight text-teal-50 sm:justify-self-start sm:text-left sm:text-xl">
              BALU
            </h1>

            {(
              [
                {
                  label: 'Last updated',
                  value: latest ? formatDateDDMMYYYY(latest.updatedAt) : '—',
                },
                {
                  label: 'Net worth',
                  value: money(netWorth),
                },
              ] as const
            ).map(({ label, value }) => (
              <div
                key={label}
                className="flex w-full flex-col items-end gap-1 text-right"
              >
                <p className="text-[11px] font-medium leading-none tracking-wide text-teal-200/70 uppercase">
                  {label}
                </p>
                <p
                  className={cn(
                    'font-[family-name:var(--font-display)] text-lg font-semibold leading-none tabular-nums text-white sm:text-xl transition-opacity duration-700 delay-100',
                    revealed ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Button area */}
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-white/10 px-5 py-3 sm:justify-start sm:border-t-0 sm:border-l sm:border-white/15 sm:px-5">
            {!latest && (
              <Button
                variant="secondary"
                size="sm"
                disabled={syncing}
                className="bg-white/15 text-white hover:bg-white/25 border-0"
                onClick={() => void loadDemoData()}
              >
                Load samples
              </Button>
            )}
            <Button
              size="sm"
              className="bg-teal-50 text-teal-950 hover:bg-white sm:min-w-[8.5rem]"
              onClick={() =>
                openWizard(
                  emptyDraft(toMonthKey(), settings.categories, latest),
                )
              }
            >
              Track Data
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Tandem split — primary household signal */}
      <section
        className={cn(
          'transition-all duration-700 delay-100',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        )}
      >
        <p className="text-xs font-medium tracking-[0.18em] text-stone-700 dark:text-stone-400 uppercase">
          This month’s pocket
        </p>
        <div className="mt-3 flex flex-col gap-6 border-t border-stone-300 pt-6 dark:border-stone-700 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {splitMode === 'equal' ? (
              <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50 sm:text-6xl">
                {money(allowanceA)}
              </p>
            ) : (
              <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
                {money(allowanceA)}
                <span className="mx-2 text-stone-400">/</span>
                {money(allowanceB)}
              </p>
            )}
            <p className="mt-2 max-w-md text-base text-stone-600 dark:text-stone-400">
              {splitMode === 'equal'
                ? 'Pocket money after expenses and investments — split 50/50.'
                : `Pocket money after expenses and investments — split by ${settings.partnerAName}/${settings.partnerBName} income (Other excluded from the ratio).`}
            </p>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-stone-700 dark:text-stone-400">{settings.partnerAName}</p>
              <p className="font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                {money(allowanceA)}
              </p>
              {allowanceComputed && (
                <p className="mt-1 text-xs text-stone-500">
                  Expenses {money(allowanceComputed.expenseSharePartnerA)}
                </p>
              )}
            </div>
            <div className="w-px bg-stone-400 dark:bg-stone-600" />
            <div>
              <p className="text-stone-700 dark:text-stone-400">{settings.partnerBName}</p>
              <p className="font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                {money(allowanceB)}
              </p>
              {allowanceComputed && (
                <p className="mt-1 text-xs text-stone-500">
                  Expenses {money(allowanceComputed.expenseSharePartnerB)}
                </p>
              )}
            </div>
          </div>
        </div>
        {allowanceComputed && (
          <p className="mt-4 text-xs text-stone-700 dark:text-stone-400">
            Left after expenses {money(allowanceComputed.leftoverAfterExpenses)}
            {' · '}
            Pocket pool {money(allowanceComputed.discretionarySurplus)}
          </p>
        )}
      </section>

      {/* Month flow — single row, not a stat card grid */}
      {latest && (
        <section
          className={cn(
            'transition-all duration-700 delay-200',
            revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
          )}
        >
          <p className="text-xs font-medium tracking-[0.18em] text-stone-700 dark:text-stone-400 uppercase">
            {formatMonthKey(latest.monthKey)} flow
          </p>
          <div className="mt-4 grid grid-cols-2 gap-y-6 border-t border-stone-300 pt-6 dark:border-stone-700 sm:grid-cols-4">
            <FlowStat label="Income" value={money(latest.computed.totalInflow)} />
            <FlowStat
              label="Expenses"
              value={money(latest.computed.totalOutflow)}
            />
            <FlowStat
              label="Liquid"
              value={money(latest.portfolioSnapshot.liquidCashBalance)}
            />
            <FlowStat
              label="Saved"
              value={rate !== null ? `${rate}%` : '—'}
              accent
            />
          </div>
        </section>
      )}

      {/* Goals */}
      <section
        className={cn(
          'transition-all duration-700 delay-300',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        )}
      >
        <p className="text-xs font-medium tracking-[0.18em] text-stone-700 dark:text-stone-400 uppercase">
          Reserves
        </p>
        <div className="mt-4 space-y-8 border-t border-stone-300 pt-6 dark:border-stone-700">
          <GoalRow
            title="Emergency"
            detail={`${emMonths} of ${emTarget} months covered`}
            amount={money(
              latest?.portfolioSnapshot.emergencyReserveBalance ?? 0,
            )}
            progress={emPct}
          />
          <GoalRow
            title="Travel"
            detail="Sink fund balance"
            amount={money(travelBal)}
            progress={
              travelBal > 0 ? Math.min(100, (travelBal / 5000) * 100) : 0
            }
          />
        </div>
      </section>
    </div>
  )
}

function FlowStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <p className="text-xs tracking-wide text-stone-700 dark:text-stone-400 uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums tracking-tight',
          accent
            ? 'text-teal-800 dark:text-teal-300'
            : 'text-stone-900 dark:text-stone-50',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function GoalRow({
  title,
  detail,
  amount,
  progress,
}: {
  title: string
  detail: string
  amount: string
  progress: number
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-medium text-stone-900 dark:text-stone-100">
            {title}
          </p>
          <p className="text-sm text-stone-700 dark:text-stone-400">{detail}</p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-200">
          {amount}
        </p>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  )
}
