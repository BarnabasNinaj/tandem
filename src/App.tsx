import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ExpensesPage } from '@/components/analytics/ExpensesPage'
import { HistoryPage } from '@/components/analytics/HistoryPage'
import { IncomesPage } from '@/components/analytics/IncomesPage'
import { OutlookPage } from '@/components/analytics/OutlookPage'
import { HomePage } from '@/components/home/HomePage'
import { TrackPage } from '@/components/track/TrackPage'
import { AppShell } from '@/components/layout/AppShell'
import { LockScreen } from '@/components/lock/LockScreen'
import { Settings } from '@/components/settings/Settings'
import { SetupWizard } from '@/components/setup/SetupWizard'
import { useAutoLock } from '@/hooks/use-auto-lock'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useTheme } from '@/hooks/use-theme'
import {
  clearPendingInviteHash,
  consumeInviteHashFromLocation,
} from '@/lib/device-invite'
import { useTandemStore } from '@/store/tandem-store'

function AuthenticatedApp() {
  useAutoLock()
  useKeyboardShortcuts()
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="track" element={<TrackPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="incomes" element={<IncomesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="outlook" element={<OutlookPage />} />
        <Route path="trends" element={<Navigate to="/history" replace />} />
        <Route path="analytics" element={<Navigate to="/outlook" replace />} />
        <Route path="breakdown" element={<Navigate to="/history" replace />} />
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
    // Always strip invite hash from the address bar (even on lock/ready).
    // Only setup can apply it; otherwise drop the stash so ciphertext doesn’t linger.
    const pending = consumeInviteHashFromLocation()
    if (pending) {
      const p = useTandemStore.getState().phase
      if (p !== 'setup' && p !== 'booting') clearPendingInviteHash()
    }
    void boot()
  }, [boot])

  // Quiet session restore: keep the themed body canvas only — no logo-only frame.
  if (phase === 'booting') return null
  if (phase === 'setup') return <SetupWizard />
  if (phase === 'locked' || phase === 'unlocking') return <LockScreen />

  return (
    <BrowserRouter>
      <AuthenticatedApp />
    </BrowserRouter>
  )
}
