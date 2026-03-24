# Wandr — Claude Code context

## Project overview
AI-powered trip planning app. React 18 + TypeScript + Vite + Tailwind. Firebase Auth + Firestore for persistence.

## Architecture
```
Browser (React)
  └─ src/services/ai.ts  →  getWorkerUrl()  →  Cloudflare Worker (PROD)
                                             →  localhost:8788    (DEV)
                                                  └─ Ollama qwen2.5:7b
                                                  └─ Brave / DuckDuckGo search
```

## Key files
| File | Role |
|------|------|
| `src/services/ai.ts` | All AI calls — `callClaude()`, `callPerplexity()`, `generateTripDetails()`, `generateItinerary()`, `generatePackingList()`, `chatAboutTrip()`, `searchTravel()` |
| `src/services/firebase.ts` | Firebase init |
| `src/services/firestore.ts` | Trip CRUD, chat persistence |
| `src/App.tsx` | Root state — trips, view, auth, AI orchestration |
| `src/components/DevModeToggle.tsx` | DEV/PROD toggle pill |
| `src/components/TripWizard.tsx` | Trip creation flow with context upload |
| `src/components/AIChat.tsx` | Chat interface with file attachments |

## AI call patterns
- **Claude** (`/anthropic/v1/messages`): structured JSON generation — trip details, itinerary, packing list; also vision when attachments present
- **Perplexity** (`/perplexity/chat/completions`): conversational chat (no attachments) + real-time travel search

## DEV/PROD toggle
- `localStorage.devMode === 'true'` → DEV (free, local proxy)
- `getWorkerUrl()` in `ai.ts` — called per request (reads localStorage each time)
- `CLAUDE_URL()` and `PPLX_URL()` are functions (not constants) so the URL is fresh on every call
- Toggle component: `src/components/DevModeToggle.tsx` — polls `GET http://localhost:8788/stats` every 5s in DEV mode; shows `🔧 DEV · N/2000 🔍 · resets Apr 1` or `⚠ Proxy offline`

## Firebase in DEV mode
Firebase Firestore is still used in DEV mode (trip persistence). Firestore free tier: 50k reads + 20k writes/day — more than enough for iteration. Only AI calls are free via the local proxy.

---

## Decision log

## Dev/prod free iteration setup — 2026-03-24
**Context:** Iterating on the product was burning Claude + Perplexity API credits. Needed a way to develop for free without losing the ability to quickly test in production.

**Options considered:**
- **`.env.development.local` file switching** — Vite picks up a different `VITE_WORKER_URL` in dev mode, no code changes. Problem: requires restarting the dev server to switch, no visibility into which mode is active.
- **OpenRouter / Groq free cloud tiers** — no local setup, but rate-limited (could be hit during heavy iteration) and still requires API keys.
- **Ollama local LLM + UI toggle** — truly free forever, works offline, no rate limits. Toggle in the UI switches between local proxy and Cloudflare Worker at runtime (no restart). Chosen for its simplicity and zero ongoing cost.

**Chosen:** Ollama (`qwen2.5:7b`) via local proxy + runtime UI toggle
- Port 8788 chosen (not 8787) to avoid conflict with Wrangler dev server
- Firebase kept as-is in DEV mode (free tier is sufficient)
- Brave Search API (2000/month free) for web search; DuckDuckGo HTML scraping as fallback
- Search count + monthly limit displayed in the toggle pill (`🔧 DEV · 42/2000 🔍 · resets Apr 1`)
