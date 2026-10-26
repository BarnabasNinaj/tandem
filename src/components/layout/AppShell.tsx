import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Compass,
  LayoutDashboard,
  Lock,
  Moon,
  PenLine,
  Receipt,
  RefreshCw,
  Settings,
  Sun,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConflictDialog } from '@/components/sync/ConflictDialog'
import { useTheme } from '@/hooks/use-theme'
import { formatDateTimeDDMMYYYY } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useTandemStore } from '@/store/tandem-store'

const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/track', label: 'Track', icon: PenLine },
  { to: '/history', label: 'History', icon: BarChart3 },
  { to: '/incomes', label: 'Incomes', icon: Wallet },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/outlook', label: 'Outlook', icon: Compass },
]

/**
 * Selected = teal fill + teal type.
 * Hover (idle) = soft stone wash only — not the same as selected.
 * Pending uses selected so click doesn’t flash through hover first.
 */
function navTone({
  isActive,
  isPending,
}: {
  isActive: boolean
  isPending: boolean
}) {
  return isActive || isPending
    ? 'bg-teal-700/15 text-teal-900 dark:bg-teal-400/15 dark:text-teal-200'
    : 'text-stone-700 hover:bg-stone-200/80 dark:text-stone-400 dark:hover:bg-stone-800'
}

export function AppShell() {
  const lock = useTandemStore((s) => s.lock)
  const pull = useTandemStore((s) => s.pull)
  const syncing = useTandemStore((s) => s.syncing)
  const localDirty = useTandemStore((s) => s.localDirty)
  const lastSyncedAt = useTandemStore((s) => s.lastSyncedAt)
  const error = useTandemStore((s) => s.error)
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-dvh overflow-x-clip bg-[var(--bg)] text-stone-900 dark:text-stone-100">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 0% 0%, rgba(15,118,110,0.08), transparent), radial-gradient(ellipse 40% 30% at 100% 0%, rgba(120,113,108,0.08), transparent)',
        }}
      />

      <header className="sticky top-0 z-40 border-b border-stone-300 bg-[var(--surface)]/85 backdrop-blur-md dark:border-stone-800">
        <div className="mx-auto flex h-14 min-w-0 max-w-6xl items-center justify-between gap-2 px-5 sm:gap-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            <NavLink
              to="/"
              end
              className="logo-mark shrink-0 cursor-pointer text-xl"
              title="Home"
              aria-label="Home"
            >
              Tandem
            </NavLink>
            <nav className="hidden min-w-0 items-center gap-1 sm:flex">
              {NAV.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={(state) =>
                    cn(
                      'inline-flex shrink-0 cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-sm font-medium',
                      navTone(state),
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <NavLink
              to="/settings"
              title="Settings"
              aria-label="Settings"
              className={(state) =>
                cn(
                  'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg',
                  navTone(state),
                )
              }
            >
              <Settings className="h-4 w-4" />
            </NavLink>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void pull()}
              disabled={syncing}
              title={
                syncing
                  ? 'Syncing…'
                  : localDirty
                    ? lastSyncedAt
                      ? `Unsaved local edits — will push then pull. Last Synced ${formatDateTimeDDMMYYYY(lastSyncedAt)}`
                      : 'Unsaved local edits — will push then pull'
                    : lastSyncedAt
                      ? `Last Synced ${formatDateTimeDDMMYYYY(lastSyncedAt)}`
                      : 'Pull from GitHub'
              }
              aria-label={
                syncing
                  ? 'Syncing'
                  : localDirty
                    ? 'Sync vault. Unsaved local edits will be pushed first'
                    : lastSyncedAt
                      ? `Pull from GitHub. Last Synced ${formatDateTimeDDMMYYYY(lastSyncedAt)}`
                      : 'Pull from GitHub'
              }
            >
              <RefreshCw
                className={cn('h-4 w-4', syncing && 'animate-spin')}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              aria-label={
                theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
              }
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={lock}
              title="Lock"
              aria-label="Lock vault"
            >
              <Lock className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {error && (
          <div className="border-t border-red-200 bg-red-50 px-5 py-1.5 text-center text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 sm:px-8">
            {error}
          </div>
        )}
      </header>

      <main className="mx-auto min-w-0 max-w-6xl px-5 py-6 pb-24 sm:px-8 sm:pb-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-stone-300 bg-[var(--surface)]/95 backdrop-blur-md dark:border-stone-800 sm:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive, isPending }) =>
              cn(
                'flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                isActive || isPending
                  ? 'text-teal-800 dark:text-teal-300'
                  : 'text-stone-700 dark:text-stone-400',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <ConflictDialog />
    </div>
  )
}
