import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTandemStore } from '@/store/tandem-store'

export function AnalyticsEmpty({ blurb }: { blurb: string }) {
  const loadDemoData = useTandemStore((s) => s.loadDemoData)
  const syncing = useTandemStore((s) => s.syncing)
  const [loadingDemo, setLoadingDemo] = useState(false)

  const onLoadDemo = async () => {
    setLoadingDemo(true)
    try {
      await loadDemoData()
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm text-stone-600 dark:text-stone-400">{blurb}</p>
      <Button
        type="button"
        disabled={syncing || loadingDemo}
        onClick={() => void onLoadDemo()}
      >
        {loadingDemo || syncing ? 'Loading & syncing…' : 'Load H1 sample data'}
      </Button>
    </Card>
  )
}
