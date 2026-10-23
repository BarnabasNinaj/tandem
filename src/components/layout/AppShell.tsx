import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  Lock,
  Moon,
  RefreshCw,
  Settings,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthlyWizard } from '@/components/wizard/MonthlyWizard'
import { ConflictDialog } from '@/components/sync/ConflictDialog'
import { useTheme } from '@/hooks/use-theme'
import { formatDateTimeDDMMYYYY } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useTandemStore } from '@/store/tandem-store'

const NAV = [
  { to: '/', label: 'Cockpit', icon: LayoutDashboard, end: true },
  { to: '/analytics', label: 'Trajectory', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  const lock = useTandemStore((s) => s.lock)
  const pull = useTandemStore((s) => s.pull)
  const syncing = useTandemStore((s) => s.syncing)
  const lastSyncedAt = useTandemStore((s) => s.lastSyncedAt)
  const error = useTandemStore((s) => s.error)
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-stone-900 dark:text-stone-100">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 0% 0%, rgba(15,118,110,0.08), transparent), radial-gradient(ellipse 40% 30% at 100% 0%, rgba(120,113,108,0.08), transparent)',
        }}
      />

      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[var(--surface)]/85 backdrop-blur-md dark:border-stone-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-teal-900 dark:text-teal-300">
              Tandem
            </span>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-teal-700/10 text-teal-900 dark:bg-teal-400/10 dark:text-teal-200'
                        : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1">
            {lastSyncedAt && (
              <span className="mr-2 hidden text-[11px] text-stone-400 md:inline">
                Synced {formatDateTimeDDMMYYYY(lastSyncedAt)}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void pull()}
              disabled={syncing}
              aria-label="Pull from GitHub"
            >
              <RefreshCw
                className={cn('h-4 w-4', syncing && 'animate-spin')}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={lock} aria-label="Lock">
              <Lock className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-1.5 text-center text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-stone-200 bg-[var(--surface)]/95 backdrop-blur-md dark:border-stone-800 sm:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                isActive
                  ? 'text-teal-800 dark:text-teal-300'
                  : 'text-stone-500',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <MonthlyWizard />
      <ConflictDialog />
    </div>
  )
}
