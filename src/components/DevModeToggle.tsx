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

// ── Shared button style ────────────────────────────────────────────────────────

const BASE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7,
  padding: '5px 13px', border: 'none', borderRadius: 20,
  color: '#fff', fontSize: 12, fontFamily: 'monospace',
  fontWeight: 600, letterSpacing: 0.4,
  cursor: 'pointer', transition: 'filter 0.15s', lineHeight: 1.4,
}

// ── Usage bar ──────────────────────────────────────────────────────────────────

function UsageBar({ pct, color }: { pct: number; color: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 32, height: 3,
      background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden',
    }}>
      <span style={{
        display: 'block', width: `${pct}%`, height: '100%',
        background: color, borderRadius: 2, transition: 'width 0.4s',
      }} />
    </span>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

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

  const hover = (e: React.MouseEvent<HTMLButtonElement>, on: boolean) =>
    (e.currentTarget.style.filter = on ? 'brightness(1.2)' : 'brightness(1)')

  // ── Claude mode ─────────────────────────────────────────────────────────────

  if (!devMode) {
    return (
      <button
        onClick={() => onToggle(true)}
        title={[
          'Claude + Perplexity — full quality',
          '  · Claude (Anthropic) — generation, itinerary, vision',
          '  · Perplexity — real-time travel search & chat',
          'Click to switch to Free mode',
        ].join('\n')}
        style={{ ...BASE, background: '#4f46e5' }}
        onMouseEnter={e => hover(e, true)}
        onMouseLeave={e => hover(e, false)}
      >
        ✦ Claude
      </button>
    )
  }

  // ── Free mode — offline ──────────────────────────────────────────────────────

  if (offline) {
    return (
      <button
        onClick={() => onToggle(false)}
        title={'Free mode — proxy unreachable\nClick to switch to Claude mode'}
        style={{ ...BASE, background: '#dc2626' }}
        onMouseEnter={e => hover(e, true)}
        onMouseLeave={e => hover(e, false)}
      >
        ⚠ Offline
      </button>
    )
  }

  // ── Free mode — with stats ───────────────────────────────────────────────────

  const searches = stats ? stats.tavilySearches + stats.ddgSearches : 0
  const limit    = stats?.limit ?? 1000
  const pct      = stats ? Math.min(100, Math.round((searches / limit) * 100)) : 0
  const reset    = stats ? formatResetDate(stats.resetDate) : ''

  // Bar color: green → amber → red as limit approaches
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#86efac'

  const tooltip = stats
    ? [
        'Free mode',
        `  · 🤖 Groq Llama 3.3 70B — generation (TPM-limited, not tracked)`,
        `  · 🔍 Tavily — web search: ${searches} / ${limit} used (${pct}%) · resets ${reset}`,
        `     ${stats.remaining} searches remaining`,
        'Click to switch to Claude + Perplexity mode',
      ].join('\n')
    : 'Free mode — Groq (generation) + Tavily (search)\nLoading usage…\nClick to switch to Claude + Perplexity mode'

  return (
    <button
      onClick={() => onToggle(false)}
      title={tooltip}
      style={{ ...BASE, background: '#15803d' }}
      onMouseEnter={e => hover(e, true)}
      onMouseLeave={e => hover(e, false)}
    >
      <span>Free</span>

      {stats ? (
        <>
          <span style={{ opacity: 0.4 }}>·</span>
          {/* 🔍 Tavily quota — Groq has TPM limits but no monthly quota to display */}
          <span style={{ opacity: 0.7, fontSize: 10 }}>🔍</span>
          <span style={{ color: barColor, fontWeight: 700 }}>
            {searches}
            <span style={{ opacity: 0.6, fontWeight: 400 }}>/{limit}</span>
          </span>
          <UsageBar pct={pct} color={barColor} />
        </>
      ) : (
        <span style={{ opacity: 0.5 }}>···</span>
      )}
    </button>
  )
}
