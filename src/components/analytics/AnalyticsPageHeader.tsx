import { PageHeader } from '@/components/layout/PageHeader'
import { RangeToggle } from '@/components/analytics/RangeToggle'
import type { AnalyticsRange } from '@/lib/analytics'

/** Analytics title + range filter — shared sticky PageHeader shell. */
export function AnalyticsPageHeader({
  title,
  subtitle,
  range,
  onRangeChange,
}: {
  title: string
  subtitle: string
  range: AnalyticsRange
  onRangeChange: (r: AnalyticsRange) => void
}) {
  return (
    <PageHeader title={title} subtitle={subtitle}>
      <RangeToggle value={range} onChange={onRangeChange} />
    </PageHeader>
  )
}
