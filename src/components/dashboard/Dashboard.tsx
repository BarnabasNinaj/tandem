import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatDateTimeDDMMYYYY, formatMonthKey, toMonthKey } from '@/lib/dates'
import {
  averageMonthlyOutflow,
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
  const money = (n: number) =>
    formatMoney(n, settings.currencySymbol, settings.currencyLocale)

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
  const allowance = latest?.computed.personalAllowancePerPartner ?? 0
  const rate = latest ? savingsRate(latest) : null

  return (
    <div className="space-y-14 pb-4">
      {/* Hero — one composition */}
      <section
        className={cn(
          'relative overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-12 transition-all duration-700',
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
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-medium tracking-[0.2em] text-teal-200/80 uppercase">
              Home
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-teal-50 sm:text-5xl">
              {settings.partnerAName} & {settings.partnerBName}
            </h1>
            <p className="mt-3 text-sm text-teal-100/75">
              {latest
                ? `Latest close ${formatMonthKey(latest.monthKey)} · ${formatDateTimeDDMMYYYY(latest.updatedAt)}`
                : 'Your household ledger is ready — close a month or load samples.'}
            </p>

            <div className="mt-8">
              <p className="text-xs font-medium tracking-wide text-teal-200/70 uppercase">
                Household net worth
              </p>
              <p
                className={cn(
                  'mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums text-white sm:text-5xl transition-all duration-1000 delay-150',
                  revealed ? 'opacity-100' : 'opacity-0',
                )}
              >
                {money(netWorth)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
            {!latest && (
              <Button
                variant="secondary"
                disabled={syncing}
                className="bg-white/15 text-white hover:bg-white/25 border-0"
                onClick={() => void loadDemoData()}
              >
                Load sample data
              </Button>
            )}
            <Button
              className="bg-teal-50 text-teal-950 hover:bg-white"
              onClick={() =>
                openWizard(
                  emptyDraft(toMonthKey(), settings.categories, latest),
                )
              }
            >
              Close month
              <ArrowRight className="h-4 w-4" />
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
          This month’s split
        </p>
        <div className="mt-3 flex flex-col gap-6 border-t border-stone-300 pt-6 dark:border-stone-700 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50 sm:text-6xl">
              {money(allowance)}
            </p>
            <p className="mt-2 max-w-md text-base text-stone-600 dark:text-stone-400">
              Equal personal allowance — 50/50 for each of you after shared
              costs and reserves.
            </p>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-stone-700 dark:text-stone-400">{settings.partnerAName}</p>
              <p className="font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                {money(allowance)}
              </p>
            </div>
            <div className="w-px bg-stone-400 dark:bg-stone-600" />
            <div>
              <p className="text-stone-700 dark:text-stone-400">{settings.partnerBName}</p>
              <p className="font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                {money(allowance)}
              </p>
            </div>
          </div>
        </div>
        {latest && (
          <p className="mt-4 text-xs text-stone-700 dark:text-stone-400">
            Surplus after expenses & allocations:{' '}
            {money(latest.computed.discretionarySurplus)}
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
            <FlowStat label="In" value={money(latest.computed.totalInflow)} />
            <FlowStat label="Out" value={money(latest.computed.totalOutflow)} />
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
