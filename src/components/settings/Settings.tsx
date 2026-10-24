import { useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Download,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { InviteQr } from '@/components/invite/InviteQr'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { formatDateTimeDDMMYYYY } from '@/lib/dates'
import { useTandemStore } from '@/store/tandem-store'
import type {
  CardOwner,
  ExpenseCard,
  ExpenseCategory,
  GitHubConfig,
} from '@/types/tandem'

type SettingsTab =
  | 'household'
  | 'categories'
  | 'cards'
  | 'sync'
  | 'security'
  | 'data'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'household', label: 'Household' },
  { id: 'categories', label: 'Categories' },
  { id: 'cards', label: 'Cards' },
  { id: 'sync', label: 'Sync' },
  { id: 'security', label: 'Security' },
  { id: 'data', label: 'Data' },
]

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
  const clearDemoData = useTandemStore((s) => s.clearDemoData)
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
  const [newCardA, setNewCardA] = useState('')
  const [newCardB, setNewCardB] = useState('')
  const [newCardCommon, setNewCardCommon] = useState('')
  const [tab, setTab] = useState<SettingsTab>('household')

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
  const cards = state.settings.cards ?? []
  const mappings = state.settings.categoryMappings ?? []

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

  const addCard = (owner: CardOwner) => {
    const name = (
      owner === 'partnerA'
        ? newCardA
        : owner === 'partnerB'
          ? newCardB
          : newCardCommon
    ).trim()
    if (!name) return
    const card: ExpenseCard = {
      id: `card-${Date.now()}`,
      name,
      owner,
    }
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        cards: [...(s.settings.cards ?? []), card],
      },
    }))
    if (owner === 'partnerA') setNewCardA('')
    else if (owner === 'partnerB') setNewCardB('')
    else setNewCardCommon('')
  }

  const removeCard = (id: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        cards: (s.settings.cards ?? []).filter((c) => c.id !== id),
      },
    }))
  }

  const renameCard = (id: string, name: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        cards: (s.settings.cards ?? []).map((c) =>
          c.id === id ? { ...c, name } : c,
        ),
      },
    }))
  }

  const cardsFor = (owner: CardOwner) =>
    cards.filter((c) => c.owner === owner)

  const setMappingCategory = (key: string, categoryId: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        categoryMappings: (s.settings.categoryMappings ?? []).map((m) =>
          m.key === key ? { ...m, categoryId } : m,
        ),
      },
    }))
  }

  const removeMapping = (key: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        categoryMappings: (s.settings.categoryMappings ?? []).filter(
          (m) => m.key !== key,
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
    <div className="mx-auto max-w-2xl animate-[fadeUp_0.4s_ease-out]">
      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-stone-300/70 bg-[var(--bg)]/90 px-4 py-3 backdrop-blur-md dark:border-stone-800/70">
        <div className="mb-3">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-stone-900 dark:text-stone-50 sm:text-3xl">
            Settings
          </h1>
          <p className="text-sm text-stone-700 dark:text-stone-400">
            Last synced:{' '}
            {lastSyncedAt ? formatDateTimeDDMMYYYY(lastSyncedAt) : '—'}
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id)
                setMsg(null)
                setErr(null)
              }}
              className={`cursor-pointer shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === id
                  ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50'
                  : 'text-stone-700 dark:text-stone-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {(msg || err) && (
        <p
          className={`mb-4 text-sm ${err ? 'text-red-700 dark:text-red-400' : 'text-teal-800 dark:text-teal-300'}`}
          role="status"
        >
          {err || msg}
        </p>
      )}

      <div className="space-y-6">
      {tab === 'household' && (
      <Card className="space-y-4">
        <CardTitle>Household</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Barney (partner A)">
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
          <Field label="Lucka (partner B)">
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Expense & pocket split</Label>
            <div className="flex gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
              {(
                [
                  { id: 'equal' as const, label: '50/50' },
                  { id: 'income' as const, label: 'By income' },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    updateState((s) => ({
                      ...s,
                      settings: { ...s.settings, allowanceSplit: id },
                    }))
                  }
                  className={`cursor-pointer flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    state.settings.allowanceSplit === id
                      ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50'
                      : 'text-stone-700 dark:text-stone-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-700 dark:text-stone-400">
              Splits monthly expenses and leftover pocket money. By income uses
              Barney/Lucka only (Other adds to the leftover, not the ratio).
            </p>
          </div>
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
        <p className="text-xs text-stone-700 dark:text-stone-400">
          Money is always euro (€). Dates: DD/MM/YYYY.
        </p>
        <Button onClick={() => void saveSettings()}>Save & sync</Button>
      </Card>
      )}

      {tab === 'categories' && (
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
        <Button onClick={() => void saveSettings()}>Save & sync</Button>
      </Card>
      )}

      {tab === 'cards' && (
      <>
      <Card className="space-y-5">
        <div>
          <CardTitle>Cards</CardTitle>
          <p className="mt-1 text-xs text-stone-700 dark:text-stone-400">
            Paste sources for Track Data → Add from card. Personal and common
            cards all merge into the same household categories — shared spend
            can sit on any card.
          </p>
        </div>
        {(
          [
            {
              owner: 'common' as const,
              name: 'Common',
              hint: 'Household card you both fund',
              draft: newCardCommon,
              setDraft: setNewCardCommon,
              placeholder: 'Card name (e.g. Joint card)',
            },
            {
              owner: 'partnerA' as const,
              name: state.settings.partnerAName,
              hint: null,
              draft: newCardA,
              setDraft: setNewCardA,
              placeholder: `Card name (e.g. ${state.settings.partnerAName} Visa)`,
            },
            {
              owner: 'partnerB' as const,
              name: state.settings.partnerBName,
              hint: null,
              draft: newCardB,
              setDraft: setNewCardB,
              placeholder: `Card name (e.g. ${state.settings.partnerBName} Visa)`,
            },
          ] as const
        ).map(({ owner, name, hint, draft, setDraft, placeholder }) => {
          const group = cardsFor(owner)
          return (
            <div key={owner} className="space-y-2">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-stone-500 uppercase">
                  {name}
                </p>
                {hint ? (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {hint}
                  </p>
                ) : null}
              </div>
              <ul className="space-y-2">
                {group.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <Input
                      value={c.name}
                      onChange={(e) => renameCard(c.id, e.target.value)}
                      className="min-w-[8rem] flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => removeCard(c.id)}
                      aria-label="Delete card"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  placeholder={placeholder}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCard(owner)}
                  className="min-w-[10rem] flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addCard(owner)}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          )
        })}
        <Button onClick={() => void saveSettings()}>Save & sync</Button>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Category mappings</CardTitle>
        <p className="text-xs text-stone-700 dark:text-stone-400">
          How bank/card labels map onto household categories. New labels are
          learned when you confirm them in Add from card.
        </p>
        {mappings.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No mappings yet — paste a card in Track Data and pick categories
            once.
          </p>
        ) : (
          <ul className="space-y-2">
            {mappings.map((m) => (
              <li key={m.key} className="flex flex-wrap items-center gap-2">
                <span className="min-w-[7rem] flex-1 text-sm text-stone-800 dark:text-stone-200">
                  {m.label}
                </span>
                <Select
                  wrapperClassName="min-w-[8rem] w-auto"
                  className="min-w-[8rem]"
                  value={m.categoryId}
                  onChange={(e) => setMappingCategory(m.key, e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => removeMapping(m.key)}
                  aria-label="Delete mapping"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button onClick={() => void saveSettings()}>Save & sync</Button>
      </Card>
      </>
      )}

      {tab === 'sync' && (
      <>
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

      <InviteQr config={gh} />
      </>
      )}

      {tab === 'security' && (
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
      )}

      {tab === 'data' && (
      <>
      <Card className="space-y-4">
        <CardTitle>Sample data</CardTitle>
        <p className="text-sm text-stone-700 dark:text-stone-400">
          Load or remove a synthetic H1 2026 pack (01/2026–06/2026) so Home and
          History, Incomes, Expenses, and Outlook have something to show. Load overwrites those month keys;
          delete removes only sample keys (including any leftover 09–10/2026
          demos). Real months outside that set are left alone.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={syncing}
            onClick={() => {
              void (async () => {
                try {
                  await loadDemoData()
                  setMsg('H1 2026 sample months loaded and synced.')
                } catch (e) {
                  setErr(
                    e instanceof Error ? e.message : 'Failed to load demo data',
                  )
                }
              })()
            }}
          >
            Load H1 sample data
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={syncing}
            onClick={() => {
              if (
                !window.confirm(
                  'Remove all sample months (H1 2026 and any old Sep/Oct demos)? Other months stay.',
                )
              ) {
                return
              }
              void (async () => {
                try {
                  await clearDemoData()
                  setMsg('Sample months removed and synced.')
                } catch (e) {
                  setErr(
                    e instanceof Error
                      ? e.message
                      : 'Failed to remove demo data',
                  )
                }
              })()
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete sample data
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Backup (unencrypted JSON)</CardTitle>
        <p className="text-sm text-stone-700 dark:text-stone-400">
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
      </>
      )}
      </div>
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
