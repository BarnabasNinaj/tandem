import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import {
  buildHomeOverview,
  type HomeMonthSnap,
} from '@/lib/analytics'
import { formatMonthKey, toMonthKey } from '@/lib/dates'
import { draftForMonth } from '@/lib/finance'
import { formatMoney } from '@/lib/number'
import { cn } from '@/lib/utils'
import { useTandemStore } from '@/store/tandem-store'

export function HomePage() {
  const navigate = useNavigate()
  const state = useTandemStore((s) => s.state)!
  const wizardDraft = useTandemStore((s) => s.wizardDraft)
  const startTracking = useTandemStore((s) => s.startTracking)
  const loadDemoData = useTandemStore((s) => s.loadDemoData)
  const syncing = useTandemStore((s) => s.syncing)
  const money = formatMoney
  const { partnerAName, partnerBName } = state.settings

  const overview = useMemo(
    () => buildHomeOverview(state.history),
    [state.history],
  )

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root || !overview) return

    const syncEdges = () => {
      const max = Math.max(0, root.scrollWidth - root.clientWidth)
      setCanPrev(root.scrollLeft > 4)
      setCanNext(root.scrollLeft < max - 4)
    }

    const centerFocus = () => {
      const focus = root.querySelector<HTMLElement>(
        `[data-month-key="${overview.focusMonthKey}"]`,
      )
      if (focus) {
        const rootRect = root.getBoundingClientRect()
        const focusRect = focus.getBoundingClientRect()
        const delta =
          focusRect.left -
          rootRect.left -
          (root.clientWidth - focusRect.width) / 2
        root.scrollLeft += delta
      }
      syncEdges()
    }

    // Wait for flex layout before centering the calendar month.
    const id = window.setTimeout(centerFocus, 0)

    root.addEventListener('scroll', syncEdges, { passive: true })
    const ro = new ResizeObserver(syncEdges)
    ro.observe(root)
    return () => {
      window.clearTimeout(id)
      root.removeEventListener('scroll', syncEdges)
      ro.disconnect()
    }
  }, [overview])

  // Thumb drag: cards slide with the finger (snap off while dragging), then
  // smooth-settle to a card — same motion as the chevron / Earlier·Later buttons.
  useEffect(() => {
    const root = scrollerRef.current
    if (!root || !overview) return

    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let startScroll = 0
    let startIndex = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0
    let dragging = false
    let axis: 'undecided' | 'x' | 'y' = 'undecided'
    let snapTimer = 0

    const cards = () =>
      Array.from(root.querySelectorAll<HTMLElement>('[data-month-card]'))

    const cardStep = () => {
      const card = cards()[0]
      return (card?.offsetWidth ?? 280) + 12
    }

    /** Index of the card whose center is closest to the scroller midpoint. */
    const nearestIndex = () => {
      const list = cards()
      if (list.length === 0) return 0
      const mid = root.getBoundingClientRect().left + root.clientWidth / 2
      let best = 0
      let bestDist = Infinity
      list.forEach((card, i) => {
        const r = card.getBoundingClientRect()
        const dist = Math.abs(r.left + r.width / 2 - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      return best
    }

    const scrollToIndex = (index: number) => {
      const list = cards()
      if (list.length === 0) return
      const i = Math.max(0, Math.min(list.length - 1, index))
      const card = list[i]!
      const rootRect = root.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      // Match mobile snap-center; on sm+ cards use snap-start but centering still reads well.
      const delta =
        cardRect.left -
        rootRect.left -
        (root.clientWidth - cardRect.width) / 2
      root.scrollTo({
        left: root.scrollLeft + delta,
        behavior: 'smooth',
      })
      window.clearTimeout(snapTimer)
      snapTimer = window.setTimeout(() => {
        root.style.scrollSnapType = ''
      }, 380)
    }

    const restoreSnap = () => {
      root.style.scrollSnapType = ''
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointerId = e.pointerId
      startX = lastX = e.clientX
      startY = e.clientY
      startScroll = root.scrollLeft
      startIndex = nearestIndex()
      lastT = performance.now()
      velocity = 0
      dragging = false
      axis = 'undecided'
      window.clearTimeout(snapTimer)
      // Mandatory CSS snap jumps mid-drag; turn it off while the finger moves.
      root.style.scrollSnapType = 'none'
      try {
        root.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      if (axis === 'undecided') {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
        if (axis === 'y') {
          pointerId = null
          restoreSnap()
          try {
            root.releasePointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          return
        }
        dragging = true
        root.classList.add('cursor-grabbing')
      }

      if (axis !== 'x') return

      const now = performance.now()
      const dt = Math.max(1, now - lastT)
      velocity = (e.clientX - lastX) / dt
      lastX = e.clientX
      lastT = now

      root.scrollLeft = startScroll - dx
      e.preventDefault()
    }

    const endDrag = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return
      const wasDragging = dragging
      const dx = e.clientX - startX
      const vx = velocity
      pointerId = null
      root.classList.remove('cursor-grabbing')
      try {
        root.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }

      if (!wasDragging || axis !== 'x') {
        restoreSnap()
        return
      }

      const step = cardStep()
      const flick = Math.abs(vx) > 0.35
      let index = startIndex
      if (flick) {
        // Finger left (vx < 0) → later months.
        index = startIndex + (vx < 0 ? 1 : -1)
      } else if (Math.abs(dx) > step * 0.22) {
        index = startIndex + (dx < 0 ? 1 : -1)
      } else {
        index = nearestIndex()
      }
      scrollToIndex(index)
    }

    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('pointerup', endDrag)
    root.addEventListener('pointercancel', endDrag)
    return () => {
      window.clearTimeout(snapTimer)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', endDrag)
      root.removeEventListener('pointercancel', endDrag)
    }
  }, [overview])

  const scrollByCard = (dir: -1 | 1) => {
    const root = scrollerRef.current
    if (!root) return
    const list = Array.from(
      root.querySelectorAll<HTMLElement>('[data-month-card]'),
    )
    if (list.length === 0) return
    const mid = root.getBoundingClientRect().left + root.clientWidth / 2
    let current = 0
    let bestDist = Infinity
    list.forEach((card, i) => {
      const r = card.getBoundingClientRect()
      const dist = Math.abs(r.left + r.width / 2 - mid)
      if (dist < bestDist) {
        bestDist = dist
        current = i
      }
    })
    const next = Math.max(0, Math.min(list.length - 1, current + dir))
    const card = list[next]!
    const rootRect = root.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const delta =
      cardRect.left -
      rootRect.left -
      (root.clientWidth - cardRect.width) / 2
    root.style.scrollSnapType = 'none'
    root.scrollTo({
      left: root.scrollLeft + delta,
      behavior: 'smooth',
    })
    window.setTimeout(() => {
      root.style.scrollSnapType = ''
    }, 380)
  }

  const openTrackMonth = (monthKey: string) => {
    startTracking(
      draftForMonth(state.history, monthKey, state.settings.categories),
    )
    navigate('/track')
  }

  const calendarKey = toMonthKey()
  const hasHistory = Object.keys(state.history).length > 0

  return (
    <div className="pb-4">
      <PageHeader
        title="Home"
        subtitle="Drag or swipe month cards. The last card is a rough next-month estimate from your recent averages."
      />

      <div className="space-y-10">
      {wizardDraft && (
        <section
          className={cn(
            'rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/40 transition-all duration-700 delay-75',
            revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-teal-950 dark:text-teal-100">
              Editing{' '}
              <span className="font-medium tabular-nums">
                {formatMonthKey(wizardDraft.monthKey)}
              </span>
            </p>
            <Button size="sm" onClick={() => navigate('/track')}>
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      )}

      {!hasHistory ? (
        <section
          className={cn(
            'space-y-4 border-t border-stone-300 pt-8 dark:border-stone-700 transition-all duration-700 delay-100',
            revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
          )}
        >
          <p className="max-w-md text-sm text-stone-700 dark:text-stone-400">
            No months tracked yet. Start with {formatMonthKey(calendarKey)}, or
            load 2026 samples to fill the overview.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={syncing}
              onClick={() => void loadDemoData()}
            >
              Load samples
            </Button>
            <Button onClick={() => openTrackMonth(calendarKey)}>
              Track {formatMonthKey(calendarKey)}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      ) : overview ? (
        <section
          className={cn(
            'border-t border-stone-300 pt-8 dark:border-stone-700 transition-all duration-700 delay-100',
            revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
          )}
        >
          <div className="relative min-w-0">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                'absolute top-1/2 left-0 z-10 hidden h-9 w-9 -translate-y-1/2 shadow-sm sm:inline-flex',
                !canPrev && 'pointer-events-none opacity-30',
              )}
              aria-label="Previous months"
              disabled={!canPrev}
              onClick={() => scrollByCard(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                'absolute top-1/2 right-0 z-10 hidden h-9 w-9 -translate-y-1/2 shadow-sm sm:inline-flex',
                !canNext && 'pointer-events-none opacity-30',
              )}
              aria-label="Next months"
              disabled={!canNext}
              onClick={() => scrollByCard(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div
              ref={scrollerRef}
              className={cn(
                'flex min-w-0 cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 select-none',
                '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                'sm:px-12',
              )}
              style={{
                WebkitOverflowScrolling: 'touch',
                // Own horizontal pans so the page doesn’t steal the thumb swipe.
                touchAction: 'none',
              }}
            >
              {overview.months.map((snap) => (
                <MonthCard
                  key={snap.monthKey}
                  snap={snap}
                  partnerAName={partnerAName}
                  partnerBName={partnerBName}
                  money={money}
                />
              ))}
            </div>

            <div className="mt-2 flex items-center justify-center gap-3 sm:hidden">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={!canPrev}
                aria-label="Previous months"
                onClick={() => scrollByCard(-1)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Earlier
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={!canNext}
                aria-label="Next months"
                onClick={() => scrollByCard(1)}
              >
                Later
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </section>
      ) : null}
      </div>
    </div>
  )
}

function MonthCard({
  snap,
  partnerAName,
  partnerBName,
  money,
}: {
  snap: HomeMonthSnap
  partnerAName: string
  partnerBName: string
  money: (n: number) => string
}) {
  const eyebrow =
    snap.status === 'projected'
      ? 'Next'
      : snap.isCalendar
        ? 'Current'
        : null

  const statusLabel =
    snap.status === 'recorded'
      ? 'tracked'
      : snap.status === 'projected'
        ? 'estimate'
        : 'not tracked'

  return (
    <article
      data-month-card
      data-month-key={snap.monthKey}
      className={cn(
        'w-[min(100%,17.5rem)] shrink-0 snap-center rounded-xl border px-4 py-4 sm:w-72 sm:snap-start',
        snap.isCalendar
          ? 'border-teal-700/35 bg-teal-800/[0.06] dark:border-teal-400/30 dark:bg-teal-400/10'
          : 'border-stone-300/80 bg-[var(--surface)] dark:border-stone-700 dark:bg-stone-900/40',
      )}
    >
      <div className="min-h-[1rem]">
        {eyebrow ? (
          <p className="text-[10px] font-medium tracking-[0.14em] text-stone-600 uppercase dark:text-stone-400">
            {eyebrow}
          </p>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums tracking-tight sm:text-2xl',
          snap.isCalendar
            ? 'text-stone-950 dark:text-stone-50'
            : 'text-stone-800 dark:text-stone-100',
        )}
      >
        {snap.label}
      </p>
      <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
        {statusLabel}
      </p>

      {snap.leftover === null ? (
        <p className="mt-6 text-sm text-stone-600 dark:text-stone-400">
          {snap.isCalendar ? 'Not tracked yet.' : 'No data for this month.'}
        </p>
      ) : (
        <>
          <p
            className={cn(
              'mt-5 font-[family-name:var(--font-display)] font-semibold tabular-nums tracking-tight',
              snap.isCalendar ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
              snap.leftover < 0
                ? 'text-orange-800 dark:text-orange-300'
                : 'text-stone-900 dark:text-stone-50',
            )}
          >
            {money(snap.leftover)}
          </p>
          <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
            left after expenses
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
                In
              </p>
              <p className="mt-0.5 font-medium tabular-nums text-stone-900 dark:text-stone-50">
                {money(snap.income!)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-stone-600 uppercase dark:text-stone-400">
                Out
              </p>
              <p className="mt-0.5 font-medium tabular-nums text-stone-900 dark:text-stone-50">
                {money(snap.expense!)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-300/70 pt-4 dark:border-stone-700">
            <div>
              <p
                className="truncate text-[10px] font-medium tracking-wide uppercase"
                style={{ color: 'var(--partner-a)' }}
              >
                {partnerAName}
              </p>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                Income{' '}
                <span className="font-medium tabular-nums text-stone-900 dark:text-stone-50">
                  {money(snap.incomeA!)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                Pays{' '}
                <span className="font-medium tabular-nums text-stone-900 dark:text-stone-50">
                  {money(snap.paysA!)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                Keeps{' '}
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    snap.pocketA! < 0
                      ? 'text-orange-800 dark:text-orange-300'
                      : 'text-stone-900 dark:text-stone-50',
                  )}
                >
                  {money(snap.pocketA!)}
                </span>
              </p>
            </div>
            <div>
              <p
                className="truncate text-[10px] font-medium tracking-wide uppercase"
                style={{ color: 'var(--partner-b)' }}
              >
                {partnerBName}
              </p>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                Income{' '}
                <span className="font-medium tabular-nums text-stone-900 dark:text-stone-50">
                  {money(snap.incomeB!)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                Pays{' '}
                <span className="font-medium tabular-nums text-stone-900 dark:text-stone-50">
                  {money(snap.paysB!)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                Keeps{' '}
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    snap.pocketB! < 0
                      ? 'text-orange-800 dark:text-orange-300'
                      : 'text-stone-900 dark:text-stone-50',
                  )}
                >
                  {money(snap.pocketB!)}
                </span>
              </p>
            </div>
          </div>

          {snap.settlement ? (
            <p className="mt-3 text-[11px] leading-snug text-stone-600 dark:text-stone-400">
              {snap.settlement.direction === 'settled' ? (
                <>Settled</>
              ) : snap.settlement.direction === 'b_to_a' ? (
                <>
                  Settle {money(snap.settlement.transferAmount)}: {partnerBName}{' '}
                  → {partnerAName}
                </>
              ) : (
                <>
                  Settle {money(snap.settlement.transferAmount)}: {partnerAName}{' '}
                  → {partnerBName}
                </>
              )}
            </p>
          ) : null}
        </>
      )}
    </article>
  )
}
