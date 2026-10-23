import { useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Download,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateTimeDDMMYYYY } from '@/lib/dates'
import { useTandemStore } from '@/store/tandem-store'
import type { ExpenseCategory, GitHubConfig } from '@/types/tandem'

export function Settings() {
  const state = useTandemStore((s) => s.state)!
  const updateState = useTandemStore((s) => s.updateState)
  const push = useTandemStore((s) => s.push)
  const github = useTandemStore((s) => s.github)
  const updateGithub = useTandemStore((s) => s.updateGithub)
  const changePassword = useTandemStore((s) => s.changePassword)
  const exportJson = useTandemStore((s) => s.exportJson)
  const importJson = useTandemStore((s) => s.importJson)
  const loadDemoData = useTandemStore((s) => s.loadDemoData)
  const syncing = useTandemStore((s) => s.syncing)
  const lastSyncedAt = useTandemStore((s) => s.lastSyncedAt)
  const fileRef = useRef<HTMLInputElement>(null)

  const [gh, setGh] = useState<GitHubConfig>(
    github ?? { username: '', repo: '', pat: '' },
  )
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [newCat, setNewCat] = useState('')

  const saveSettings = async () => {
    await push('chore: update settings')
    setMsg('Settings synced.')
  }

  const saveGithub = () => {
    updateGithub(gh)
    setMsg('GitHub configuration saved locally.')
  }

  const onChangePassword = async () => {
    setErr(null)
    try {
      await changePassword(curPw, newPw)
      setCurPw('')
      setNewPw('')
      setMsg('Password rotated and vault re-encrypted.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Password change failed')
    }
  }

  const categories = state.settings.categories

  const moveCat = (index: number, dir: -1 | 1) => {
    const next = [...categories]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j]!, next[index]!]
    updateState((s) => ({
      ...s,
      settings: { ...s.settings, categories: next },
    }))
  }

  const removeCat = (id: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        categories: s.settings.categories.filter((c) => c.id !== id),
      },
    }))
  }

  const addCat = () => {
    const name = newCat.trim()
    if (!name) return
    const cat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name,
      isDefault: false,
    }
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        categories: [...s.settings.categories, cat],
      },
    }))
    setNewCat('')
  }

  const renameCat = (id: string, name: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        categories: s.settings.categories.map((c) =>
          c.id === id ? { ...c, name } : c,
        ),
      },
    }))
  }

  const downloadBackup = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tandem-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File) => {
    const text = await file.text()
    await importJson(text)
    setMsg('Backup imported and synced.')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-[fadeUp_0.4s_ease-out]">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-stone-900 dark:text-stone-50">
          Settings
        </h1>
        <p className="text-sm text-stone-500">
          Last synced:{' '}
          {lastSyncedAt ? formatDateTimeDDMMYYYY(lastSyncedAt) : '—'}
        </p>
      </div>

      {(msg || err) && (
        <p
          className={`text-sm ${err ? 'text-red-700 dark:text-red-400' : 'text-teal-800 dark:text-teal-300'}`}
          role="status"
        >
          {err || msg}
        </p>
      )}

      <Card className="space-y-4">
        <CardTitle>Household</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Partner A">
            <Input
              value={state.settings.partnerAName}
              onChange={(e) =>
                updateState((s) => ({
                  ...s,
                  settings: { ...s.settings, partnerAName: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Partner B">
            <Input
              value={state.settings.partnerBName}
              onChange={(e) =>
                updateState((s) => ({
                  ...s,
                  settings: { ...s.settings, partnerBName: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Currency symbol">
            <Input
              value={state.settings.currencySymbol}
              onChange={(e) =>
                updateState((s) => ({
                  ...s,
                  settings: { ...s.settings, currencySymbol: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Locale">
            <Input
              value={state.settings.currencyLocale}
              onChange={(e) =>
                updateState((s) => ({
                  ...s,
                  settings: { ...s.settings, currencyLocale: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Emergency target (months)">
            <Input
              type="number"
              min={1}
              value={state.settings.emergencyTargetMonths}
              onChange={(e) =>
                updateState((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    emergencyTargetMonths: Number(e.target.value) || 6,
                  },
                }))
              }
            />
          </Field>
          <Field label="Auto-lock (minutes)">
            <Input
              type="number"
              min={1}
              value={state.settings.autoLockMinutes}
              onChange={(e) =>
                updateState((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    autoLockMinutes: Number(e.target.value) || 30,
                  },
                }))
              }
            />
          </Field>
        </div>
        <p className="text-xs text-stone-500">
          Date format enforced: DD/MM/YYYY
        </p>
        <Button onClick={() => void saveSettings()}>Save & sync</Button>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Expense categories</CardTitle>
        <ul className="space-y-2">
          {categories.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2">
              <Input
                value={c.name}
                onChange={(e) => renameCat(c.id, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => moveCat(i, -1)}
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => moveCat(i, 1)}
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => removeCat(c.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            placeholder="New category"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCat()}
          />
          <Button type="button" variant="secondary" onClick={addCat}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle>GitHub sync</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Username">
            <Input
              value={gh.username}
              onChange={(e) => setGh({ ...gh, username: e.target.value })}
            />
          </Field>
          <Field label="Repository">
            <Input
              value={gh.repo}
              onChange={(e) => setGh({ ...gh, repo: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Fine-grained PAT">
          <Input
            type="password"
            value={gh.pat}
            onChange={(e) => setGh({ ...gh, pat: e.target.value })}
            placeholder="github_pat_…"
          />
        </Field>
        <Button type="button" variant="secondary" onClick={saveGithub}>
          Update credentials
        </Button>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Change master password</CardTitle>
        <Field label="Current password">
          <Input
            type="password"
            value={curPw}
            onChange={(e) => setCurPw(e.target.value)}
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
        </Field>
        <Button
          type="button"
          onClick={() => void onChangePassword()}
          disabled={!curPw || newPw.length < 8}
        >
          Re-encrypt vault
        </Button>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Sample data</CardTitle>
        <p className="text-sm text-stone-500">
          Loads two demo months (09/2026 and 10/2026) so Cockpit and Trajectory
          have something to show. Overwrites those month keys if they already
          exist.
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={syncing}
          onClick={() => {
            void (async () => {
              try {
                await loadDemoData()
                setMsg('Sample months loaded and synced.')
              } catch (e) {
                setErr(e instanceof Error ? e.message : 'Failed to load demo data')
              }
            })()
          }}
        >
          Load 2 months of sample data
        </Button>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Backup (unencrypted JSON)</CardTitle>
        <p className="text-sm text-stone-500">
          Emergency fallback only. Store exports offline and delete after
          restore.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={downloadBackup}>
            <Download className="h-4 w-4" /> Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImportFile(f)
            }}
          />
        </div>
      </Card>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
