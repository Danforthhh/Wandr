import { useState, useEffect, useCallback } from 'react'

const PROXY_URL = 'https://dev-proxy.vin-bories.workers.dev'
const POLL_MS   = 5000

interface ProxyStats {
  tavilySearches: number
  ddgSearches:    number
  limit:          number
  remaining:      number
  resetDate:      string
}

interface Props {
  devMode:  boolean
  onToggle: (next: boolean) => void
}

async function fetchStats(): Promise<ProxyStats | null> {
  try {
    const res = await fetch(`${PROXY_URL}/stats`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return null
    return await res.json() as ProxyStats
  } catch {
    return null
  }
}

function formatResetDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DevModeToggle({ devMode, onToggle }: Props) {
  const [stats,   setStats]   = useState<ProxyStats | null>(null)
  const [offline, setOffline] = useState(false)

  const refreshStats = useCallback(async () => {
    if (!devMode) return
    const data = await fetchStats()
    if (data) { setStats(data); setOffline(false) }
    else       { setStats(null); setOffline(true) }
  }, [devMode])

  useEffect(() => {
    if (!devMode) { setStats(null); setOffline(false); return }
    refreshStats()
    const id = setInterval(refreshStats, POLL_MS)
    return () => clearInterval(id)
  }, [devMode, refreshStats])

  // ── Pill appearance ────────────────────────────────────────────────────────
  const searches = stats ? stats.tavilySearches + stats.ddgSearches : 0

  let pillBg:    string
  let pillLabel: string
  let tooltip:   string

  if (!devMode) {
    pillBg    = '#2563eb'
    pillLabel = 'PROD'
    tooltip   = 'Production — Cloudflare Worker (Claude + Perplexity)\nClick to switch to free DEV mode'
  } else if (offline) {
    pillBg    = '#dc2626'
    pillLabel = '⚠ DEV'
    tooltip   = 'DEV mode — Cloudflare Worker unreachable\nCheck: dev-proxy.vin-bories.workers.dev/stats\nClick to switch to PROD'
  } else if (stats) {
    const reset = formatResetDate(stats.resetDate)
    pillBg    = '#15803d'
    pillLabel = 'DEV'
    tooltip   = `DEV mode — Groq + Tavily (free)\n${searches}/${stats.limit} searches used · resets ${reset}\n${stats.remaining} Tavily remaining\nClick to switch to PROD`
  } else {
    pillBg    = '#15803d'
    pillLabel = 'DEV'
    tooltip   = 'DEV mode — Groq + Tavily (free)\nClick to switch to PROD'
  }

  return (
    <button
      onClick={() => onToggle(!devMode)}
      title={tooltip}
      style={{
        padding: '5px 14px', background: pillBg, border: 'none',
        borderRadius: 20, color: '#fff', fontSize: 12,
        fontFamily: 'monospace', fontWeight: 600, letterSpacing: 0.5,
        cursor: 'pointer', transition: 'filter 0.15s',
        lineHeight: 1.4,
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.2)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
    >
      {pillLabel}
    </button>
  )
}
