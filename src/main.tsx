import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { loadTheme } from '@/lib/storage'
import App from './App.tsx'

// Keep in sync with the inline script in index.html (covers module load path).
document.documentElement.classList.toggle('dark', loadTheme() === 'dark')

// Claim updates immediately so a deploy doesn’t leave a stale shell on screen.
registerSW({ immediate: true })

// Stale hashed chunks after deploy → one clean reload (not a half-rendered app).
window.addEventListener('vite:preloadError', () => {
  const key = 'tandem.preload-reload'
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* private mode */
  }
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
