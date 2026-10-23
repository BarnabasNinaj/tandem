import { PiggyBank, TrendingUp, Users, Wallet } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatDateTimeDDMMYYYY, formatMonthKey } from '@/lib/dates'
import {
  averageMonthlyOutflow,
  emergencyMonthsCovered,
  emptyDraft,
  getLatestRecord,
  netWorthFromSnapshot,
  savingsRate,
} from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { toMonthKey } from '@/lib/dates'
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

  return (
    <div className="space-y-6 animate-[fadeUp_0.4s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Cockpit
          </h1>
          <p className="text-sm text-stone-500">
            {latest
              ? `${formatMonthKey(latest.monthKey)} · updated ${formatDateTimeDDMMYYYY(latest.updatedAt)}`
              : 'No months closed yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!latest && (
            <Button
              variant="secondary"
              disabled={syncing}
              onClick={() => void loadDemoData()}
            >
              Load sample data
            </Button>
          )}
          <Button
            onClick={() =>
              openWizard(
                emptyDraft(toMonthKey(), settings.categories, latest),
              )
            }
          >
            End-of-Month Close
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Wallet className="h-4 w-4" />}
          label="Net worth"
          value={money(netWorth)}
        />
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label="Inflows (latest)"
          value={latest ? money(latest.computed.totalInflow) : '—'}
        />
        <Stat
          icon={<PiggyBank className="h-4 w-4" />}
          label="Outflows (latest)"
          value={latest ? money(latest.computed.totalOutflow) : '—'}
        />
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Savings rate"
          value={latest ? `${savingsRate(latest)}%` : '—'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="relative overflow-hidden border-teal-200/70 bg-gradient-to-br from-teal-50 to-white dark:border-teal-900 dark:from-teal-950/50 dark:to-stone-900">
          <CardTitle className="text-teal-900 dark:text-teal-200">
            Tandem split · 50/50
          </CardTitle>
          <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold text-teal-950 dark:text-teal-50">
            {latest
              ? money(latest.computed.personalAllowancePerPartner)
              : money(0)}
          </p>
          <p className="mt-2 text-sm text-teal-800/80 dark:text-teal-300/80">
            Equal personal allowance for {settings.partnerAName} and{' '}
            {settings.partnerBName}
          </p>
          {latest && (
            <p className="mt-4 text-xs text-stone-500">
              Discretionary surplus{' '}
              {money(latest.computed.discretionarySurplus)}
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>Goal progress</CardTitle>
          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-stone-600 dark:text-stone-300">
                  Emergency reserve
                </span>
                <span className="font-medium tabular-nums">
                  {emMonths} / {emTarget} months
                </span>
              </div>
              <Progress value={emPct} />
              <p className="mt-1 text-xs text-stone-500">
                Balance{' '}
                {money(latest?.portfolioSnapshot.emergencyReserveBalance ?? 0)}
              </p>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-stone-600 dark:text-stone-300">
                  Travel sink fund
                </span>
                <span className="font-medium tabular-nums">
                  {money(travelBal)}
                </span>
              </div>
              <Progress
                value={travelBal > 0 ? Math.min(100, (travelBal / 5000) * 100) : 0}
              />
            </div>
          </div>
        </Card>
      </div>

      {latest && (
        <Card>
          <CardTitle>Current month snapshot</CardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Total inflow" value={money(latest.computed.totalInflow)} />
            <Metric label="Total outflow" value={money(latest.computed.totalOutflow)} />
            <Metric
              label="Liquid cash"
              value={money(latest.portfolioSnapshot.liquidCashBalance)}
            />
          </div>
        </Card>
      )}
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2 text-stone-500">
        {icon}
        <span className="text-xs font-medium tracking-wide uppercase">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
        {value}
      </p>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stone-500 uppercase">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
