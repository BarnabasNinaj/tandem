import { useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Download,
  Landmark,
  Pencil,
  Plus,
  Tags,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { InviteQr } from '@/components/invite/InviteQr'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { Select } from '@/components/ui/select'
import { mappingsForBank, normalizeBankLabel } from '@/lib/card-expenses'
import { formatDateTimeDDMMYYYY } from '@/lib/dates'
import { nextOwner } from '@/lib/partners'
import { useTandemStore } from '@/store/tandem-store'
import type {
  CardOwner,
  ExpenseBank,
  ExpenseCard,
  ExpenseCategory,
  GitHubConfig,
} from '@/types/tandem'

type SettingsTab =
  | 'household'
  | 'categories'
  | 'banks'
  | 'vault'
  | 'security'
  | 'data'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'household', label: 'Household' },
  { id: 'categories', label: 'Categories' },
  { id: 'banks', label: 'Banks' },
  { id: 'vault', label: 'Vault' },
  { id: 'security', label: 'Security' },
  { id: 'data', label: 'Data' },
]

/** Name fields size to glyphs, not oversized `ch` estimates. */
const FIT_NAME =
  'w-auto min-w-[2.5rem] max-w-[10rem] [field-sizing:content]' as const

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
  const [newBank, setNewBank] = useState('')
  /** bankId → draft new card (name + owner) */
  const [newCardDraft, setNewCardDraft] = useState<
    Record<string, { name: string; owner: CardOwner }>
  >({})
  /** bankId → add-card form open */
  const [addingCardFor, setAddingCardFor] = useState<Record<string, boolean>>(
    {},
  )
  /** bankId → show delete controls */
  const [editingBank, setEditingBank] = useState<Record<string, boolean>>({})
  const [newLabelDraft, setNewLabelDraft] = useState<
    Record<string, { label: string; categoryId: string }>
  >({})
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
  const banks = state.settings.banks ?? []
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

  const cardDraft = (bankId: string) =>
    newCardDraft[bankId] ?? { name: '', owner: 'partnerA' as CardOwner }

  const labelDraft = (bankId: string) =>
    newLabelDraft[bankId] ?? {
      label: '',
      categoryId: categories[0]?.id ?? '',
    }

  const addBank = () => {
    const name = newBank.trim()
    if (!name) return
    const bank: ExpenseBank = {
      id: `bank-${Date.now()}`,
      name,
    }
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        banks: [...(s.settings.banks ?? []), bank],
      },
    }))
    setNewBank('')
  }

  const renameBank = (id: string, name: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        banks: (s.settings.banks ?? []).map((b) =>
          b.id === id ? { ...b, name } : b,
        ),
      },
    }))
  }

  const removeBank = (id: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        banks: (s.settings.banks ?? []).filter((b) => b.id !== id),
        cards: (s.settings.cards ?? []).filter((c) => c.bankId !== id),
        categoryMappings: (s.settings.categoryMappings ?? []).filter(
          (m) => m.bankId !== id,
        ),
      },
    }))
  }

  const addCard = (bankId: string) => {
    const draft = cardDraft(bankId)
    const name = draft.name.trim()
    if (!name) return
    const card: ExpenseCard = {
      id: `card-${Date.now()}`,
      name,
      bankId,
      owner: draft.owner,
    }
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        cards: [...(s.settings.cards ?? []), card],
      },
    }))
    setNewCardDraft((prev) => ({
      ...prev,
      [bankId]: { name: '', owner: draft.owner },
    }))
    setAddingCardFor((prev) => ({ ...prev, [bankId]: false }))
  }

  const cancelAddCard = (bankId: string) => {
    const draft = cardDraft(bankId)
    setNewCardDraft((prev) => ({
      ...prev,
      [bankId]: { name: '', owner: draft.owner },
    }))
    setAddingCardFor((prev) => ({ ...prev, [bankId]: false }))
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

  const setCardOwner = (id: string, owner: CardOwner) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        cards: (s.settings.cards ?? []).map((c) =>
          c.id === id ? { ...c, owner } : c,
        ),
      },
    }))
  }

  const addBankLabel = (bankId: string) => {
    const draft = labelDraft(bankId)
    const label = draft.label.trim()
    const key = normalizeBankLabel(label)
    if (!key || !draft.categoryId) return
    updateState((s) => {
      const others = (s.settings.categoryMappings ?? []).filter(
        (m) => !(m.bankId === bankId && m.key === key),
      )
      return {
        ...s,
        settings: {
          ...s.settings,
          categoryMappings: [
            ...others,
            {
              bankId,
              key,
              label,
              categoryId: draft.categoryId,
            },
          ].sort((a, b) => a.label.localeCompare(b.label)),
        },
      }
    })
    setNewLabelDraft((prev) => ({
      ...prev,
      [bankId]: { label: '', categoryId: draft.categoryId },
    }))
  }

  const setMappingCategory = (
    bankId: string,
    key: string,
    categoryId: string,
  ) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        categoryMappings: (s.settings.categoryMappings ?? []).map((m) =>
          m.bankId === bankId && m.key === key ? { ...m, categoryId } : m,
        ),
      },
    }))
  }

  const removeMapping = (bankId: string, key: string) => {
    updateState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        categoryMappings: (s.settings.categoryMappings ?? []).filter(
          (m) => !(m.bankId === bankId && m.key === key),
        ),
      },
    }))
  }

  const cardsForBank = (bankId: string) =>
    cards
      .filter((c) => c.bankId === bankId)
      .sort((a, b) => {
        const order = { common: 0, partnerA: 1, partnerB: 2 }
        const d = order[a.owner] - order[b.owner]
        return d !== 0 ? d : a.name.localeCompare(b.name)
      })

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
        <div>
          <CardTitle>Household</CardTitle>
          <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-400">
            Names show in Track and charts. Money is always euro (€); dates use
            DD/MM/YYYY.
          </p>
        </div>
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
              How you share bills and leftover pocket money each month. Example:
              €3,000 left with 50/50 → each keeps €1,500. “By income” uses
              Barney/Lucka salaries only — Other income still adds to the
              leftover, but not the split ratio.
            </p>
          </div>
        </div>
        <Button onClick={() => void saveSettings()}>Save & sync</Button>
      </Card>
      )}

      {tab === 'categories' && (
      <Card className="space-y-3">
        <div>
          <CardTitle>Expense categories</CardTitle>
          <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-400">
            Household buckets for spend — groceries, rent, travel, and so on.
            Bank labels map onto these under Banks.
          </p>
        </div>
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

      {tab === 'banks' && (
      <Card className="space-y-3">
        <div>
          <CardTitle>Banks</CardTitle>
          <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-400">
            Add a bank (e.g. Revolut), then its cards (whose card it is). Map
            each bank’s statement labels — “Restaurants” → Food — so Track can
            roll spend into household categories. Labels are shared by every
            card of that bank.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="New bank (e.g. Revolut)"
            value={newBank}
            onChange={(e) => setNewBank(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBank()}
            className="h-8 min-w-[8rem] flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addBank}
          >
            <Landmark className="h-3.5 w-3.5" /> Bank
          </Button>
        </div>

        {banks.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">
            No banks yet.
          </p>
        ) : (
          <div className="space-y-3">
            {banks.map((bank) => {
              const bankMaps = mappingsForBank(mappings, bank.id)
              const draft = cardDraft(bank.id)
              const lDraft = labelDraft(bank.id)
              const bankCards = cardsForBank(bank.id)
              const editing = Boolean(editingBank[bank.id])
              const catName = (id: string) =>
                categories.find((c) => c.id === id)?.name ?? id
              return (
                <section
                  key={bank.id}
                  className="overflow-hidden rounded-lg border border-stone-300 dark:border-stone-600"
                >
                  {/* Bank + cards; edits/deletes only with pencil */}
                  <header className="flex flex-wrap items-center gap-1 border-b border-teal-800/15 bg-teal-800/[0.07] px-2.5 py-1.5 dark:border-teal-400/20 dark:bg-teal-400/10">
                    <Landmark
                      className="h-3.5 w-3.5 shrink-0 text-teal-800 dark:text-teal-300"
                      aria-hidden
                    />
                    {editing ? (
                      <Input
                        value={bank.name}
                        onChange={(e) => renameBank(bank.id, e.target.value)}
                        className={`h-7 shrink-0 rounded-md border border-transparent bg-white/70 px-2 text-sm font-semibold shadow-none focus-visible:border-teal-700/40 focus-visible:ring-1 focus-visible:ring-teal-700/30 dark:bg-white/10 dark:focus-visible:border-teal-400/40 ${FIT_NAME}`}
                        aria-label="Bank name"
                      />
                    ) : (
                      <span
                        className={`truncate px-2 text-sm font-semibold text-stone-900 dark:text-stone-50 ${FIT_NAME}`}
                      >
                        {bank.name}
                      </span>
                    )}
                    <span
                      className="mx-0.5 hidden h-4 w-px bg-teal-800/20 sm:block dark:bg-teal-400/25"
                      aria-hidden
                    />
                    {bankCards.map((c) => (
                      <div
                        key={c.id}
                        className="flex h-7 w-fit max-w-full items-center gap-1.5 rounded-md border border-stone-300/80 bg-white/80 px-2 dark:border-stone-500/60 dark:bg-white/10"
                      >
                        {editing ? (
                          <Input
                            value={c.name}
                            onChange={(e) => renameCard(c.id, e.target.value)}
                            className={`h-5 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 dark:bg-transparent ${FIT_NAME}`}
                            aria-label="Card name"
                          />
                        ) : (
                          <span
                            className={`truncate text-xs text-stone-800 dark:text-stone-100 ${FIT_NAME}`}
                          >
                            {c.name}
                          </span>
                        )}
                        <OwnerBadge
                          owner={c.owner}
                          partnerAName={state.settings.partnerAName}
                          partnerBName={state.settings.partnerBName}
                          onClick={
                            editing
                              ? () => setCardOwner(c.id, nextOwner(c.owner))
                              : undefined
                          }
                        />
                        {editing ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-5 w-5 shrink-0"
                            onClick={() => removeCard(c.id)}
                            aria-label="Delete card"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    {editing ? (
                      addingCardFor[bank.id] ? (
                        <div className="flex h-7 w-fit max-w-full items-center gap-1.5 rounded-md border border-dashed border-stone-300 bg-white/60 px-2 dark:border-stone-500/60 dark:bg-white/10">
                          <Input
                            autoFocus
                            placeholder="Name"
                            value={draft.name}
                            onChange={(e) =>
                              setNewCardDraft((prev) => ({
                                ...prev,
                                [bank.id]: {
                                  ...draft,
                                  name: e.target.value,
                                },
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addCard(bank.id)
                              if (e.key === 'Escape') cancelAddCard(bank.id)
                            }}
                            className={`h-5 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 dark:bg-transparent ${FIT_NAME}`}
                          />
                          <OwnerBadge
                            owner={draft.owner}
                            partnerAName={state.settings.partnerAName}
                            partnerBName={state.settings.partnerBName}
                            onClick={() =>
                              setNewCardDraft((prev) => ({
                                ...prev,
                                [bank.id]: {
                                  ...draft,
                                  owner: nextOwner(draft.owner),
                                },
                              }))
                            }
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => addCard(bank.id)}
                            disabled={!draft.name.trim()}
                            aria-label="Save card"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => cancelAddCard(bank.id)}
                            aria-label="Cancel add card"
                          >
                            <X className="h-3 w-3 text-stone-600 dark:text-stone-400" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 rounded border border-dashed border-stone-300 dark:border-stone-600"
                          onClick={() =>
                            setAddingCardFor((prev) => ({
                              ...prev,
                              [bank.id]: true,
                            }))
                          }
                          aria-label="Add card"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )
                    ) : null}
                    <div className="ml-auto flex items-center gap-0.5">
                      {editing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-7 w-7 shrink-0"
                            onClick={() => removeBank(bank.id)}
                            aria-label="Delete bank"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                              setEditingBank((prev) => ({
                                ...prev,
                                [bank.id]: false,
                              }))
                              cancelAddCard(bank.id)
                            }}
                            aria-label="Done editing bank"
                          >
                            <Check className="h-3.5 w-3.5 text-teal-800 dark:text-teal-300" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="h-7 w-7 shrink-0"
                          onClick={() =>
                            setEditingBank((prev) => ({
                              ...prev,
                              [bank.id]: true,
                            }))
                          }
                          aria-label="Edit bank"
                        >
                          <Pencil className="h-3.5 w-3.5 text-stone-600 dark:text-stone-400" />
                        </Button>
                      )}
                    </div>
                  </header>

                  {/* Labels — read-only until pencil; edit mode = map / add / delete */}
                  <div className="space-y-1.5 bg-white p-2.5 dark:bg-stone-900/40">
                    <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                      <Tags className="h-3.5 w-3.5" aria-hidden />
                      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                        Labels → categories
                      </p>
                      <span className="text-[10px] font-normal tracking-normal text-stone-600 normal-case dark:text-stone-400">
                        {bankMaps.length
                          ? `${bankMaps.length} mapped`
                          : 'none yet'}
                      </span>
                    </div>
                    {bankMaps.length === 0 ? (
                      <p className="text-xs text-stone-600 dark:text-stone-400">
                        {editing
                          ? 'Add how this bank names spend (e.g. Lebensmittel → Groceries).'
                          : 'No labels yet — tap the pencil to add mappings.'}
                      </p>
                    ) : null}
                    <div className="space-y-0.5">
                      {bankMaps.map((m) =>
                        editing ? (
                          <div
                            key={m.key}
                            className="grid grid-cols-[minmax(0,1fr)_0.75rem_9rem_1.75rem] items-center gap-x-1.5 rounded-md bg-stone-100 px-2 py-0.5 dark:bg-stone-800/70"
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                              {m.label}
                            </span>
                            <ArrowRight
                              className="mx-auto h-3 w-3 text-stone-400"
                              aria-hidden
                            />
                            <Select
                              wrapperClassName="w-full"
                              className="h-7 min-w-0 border-stone-300 bg-white pr-7 pl-2 text-xs dark:border-stone-600 dark:bg-stone-900"
                              value={m.categoryId}
                              onChange={(e) =>
                                setMappingCategory(
                                  bank.id,
                                  m.key,
                                  e.target.value,
                                )
                              }
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
                              className="h-7 w-7"
                              onClick={() => removeMapping(bank.id, m.key)}
                              aria-label="Delete label"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            key={m.key}
                            className="grid grid-cols-[minmax(0,1fr)_0.75rem_minmax(0,9rem)] items-center gap-x-1.5 rounded-md bg-stone-100 px-2 py-1 dark:bg-stone-800/70"
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                              {m.label}
                            </span>
                            <ArrowRight
                              className="mx-auto h-3 w-3 text-stone-400"
                              aria-hidden
                            />
                            <span className="min-w-0 truncate text-xs text-stone-600 dark:text-stone-300">
                              {catName(m.categoryId)}
                            </span>
                          </div>
                        ),
                      )}
                      {editing ? (
                        <div className="grid grid-cols-[minmax(0,1fr)_0.75rem_9rem_1.75rem] items-center gap-x-1.5 rounded-md border border-dashed border-teal-800/25 bg-teal-800/[0.03] px-2 py-0.5 dark:border-teal-400/30 dark:bg-teal-400/5">
                          <Input
                            placeholder="New bank label"
                            value={lDraft.label}
                            onChange={(e) =>
                              setNewLabelDraft((prev) => ({
                                ...prev,
                                [bank.id]: {
                                  ...lDraft,
                                  label: e.target.value,
                                },
                              }))
                            }
                            onKeyDown={(e) =>
                              e.key === 'Enter' && addBankLabel(bank.id)
                            }
                            className="h-7 min-w-0 w-full border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
                          />
                          <ArrowRight
                            className="mx-auto h-3 w-3 text-stone-400"
                            aria-hidden
                          />
                          <Select
                            wrapperClassName="w-full"
                            className="h-7 min-w-0 border-stone-300 bg-white pr-7 pl-2 text-xs dark:border-stone-600 dark:bg-stone-800"
                            value={lDraft.categoryId}
                            onChange={(e) =>
                              setNewLabelDraft((prev) => ({
                                ...prev,
                                [bank.id]: {
                                  ...lDraft,
                                  categoryId: e.target.value,
                                },
                              }))
                            }
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => addBankLabel(bank.id)}
                            aria-label="Add label"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        )}

        <Button onClick={() => void saveSettings()}>Save & sync</Button>
      </Card>
      )}

      {tab === 'vault' && (
      <>
      <Card className="space-y-4">
        <div>
          <CardTitle>Private vault</CardTitle>
          <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-400">
            Your encrypted household file lives in a private GitHub repo — not
            on any Tandem server. Keep that repo private; the PAT only needs
            Contents read/write on it.
          </p>
        </div>
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
      <>
      <Card className="space-y-4">
        <div>
          <CardTitle>Auto-lock</CardTitle>
          <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-400">
            After this many quiet minutes, Tandem locks and clears the password
            from this browser tab. Example: 30 → walk away for half an hour and
            you’ll unlock again to open the vault.
          </p>
        </div>
        <Field label="Minutes">
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
        <Button onClick={() => void saveSettings()}>Save & sync</Button>
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>Change master password</CardTitle>
          <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-400">
            Re-encrypts the vault with a new password. Both partners must use
            the new one after this — share it out of band (not in the invite
            QR).
          </p>
        </div>
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
      </>
      )}

      {tab === 'data' && (
      <>
      <Card className="space-y-4">
        <CardTitle>Sample data</CardTitle>
        <p className="text-sm text-stone-700 dark:text-stone-400">
          Fake Jan–Jun 2026 months so charts aren’t empty while you try the
          app. Load overwrites those months only; delete removes the samples
          (and any leftover Sep/Oct demos). Your other months stay.
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
          Escape hatch if GitHub sync fails — the file is readable plaintext.
          Keep it offline, restore if needed, then delete the file.
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
