import { useEffect, useState } from 'react'
import { loadTheme, saveTheme } from '@/lib/storage'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    saveTheme(theme)
  }, [theme])

  return {
    theme,
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    setTheme,
  }
}
