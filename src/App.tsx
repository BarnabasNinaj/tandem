import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@/components/analytics/Analytics'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { AppShell } from '@/components/layout/AppShell'
import { LockScreen } from '@/components/lock/LockScreen'
import { Settings } from '@/components/settings/Settings'
import { SetupWizard } from '@/components/setup/SetupWizard'
import { useAutoLock } from '@/hooks/use-auto-lock'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useTheme } from '@/hooks/use-theme'
import { useTandemStore } from '@/store/tandem-store'

function BootSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
      <p className="logo-mark text-3xl">Tandem</p>
    </div>
  )
}

function AuthenticatedApp() {
  useAutoLock()
  useKeyboardShortcuts()
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const phase = useTandemStore((s) => s.phase)
  const boot = useTandemStore((s) => s.boot)
  useTheme()

  useEffect(() => {
    void boot()
  }, [boot])

  if (phase === 'booting') return <BootSplash />
  if (phase === 'setup') return <SetupWizard />
  if (phase === 'locked' || phase === 'unlocking') return <LockScreen />

  return (
    <BrowserRouter>
      <AuthenticatedApp />
    </BrowserRouter>
  )
}
