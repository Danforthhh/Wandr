# Wandr — Claude Code context

## Working style

**Always challenge requests** — before implementing, present 2–3 options with different trade-offs (cost, complexity, reversibility, maintenance) and highlight scenarios the user may not have considered. Let the user choose, then implement.

**Decision log discipline** — whenever a significant architectural decision is made collaboratively, record it below using this format:
```
## [Feature] — [date]
**Context:** why this came up
**Options considered:**
- Option A: ... (trade-off)
- Option B: ... (trade-off)
**Chosen:** Option X — because ...
```

**Keep docs alive** — update this CLAUDE.md as decisions are made. It is a living document, not a one-time write-up.

---

## Project overview
AI-powered trip planning app. React 18 + TypeScript + Vite + Tailwind. Firebase Auth + Firestore for persistence.

## Architecture
```
Browser (React)
  └─ src/services/ai.ts  →  getWorkerUrl()  →  Cloudflare Worker PROD (wandr.vin-bories.workers.dev)
                                             →  Cloudflare Worker DEV  (dev-proxy.vin-bories.workers.dev)
                                                  └─ Groq llama-3.3-70b-versatile (free)
                                                  └─ Tavily search (1000/month free) + DuckDuckGo fallback
```

## Key files
| File | Role |
|------|------|
| `src/services/ai.ts` | All AI calls — `callClaude()`, `callPerplexity()`, `generateTripDetails()`, `generateItinerary()`, `generatePackingList()`, `chatAboutTrip()`, `searchTravel()` |
| `src/services/firebase.ts` | Firebase init |
| `src/services/firestore.ts` | Trip CRUD, chat persistence |
| `src/App.tsx` | Root state — trips, view, auth, AI orchestration |
| `src/components/DevModeToggle.tsx` | DEV/PROD toggle pill — polls `/stats` every 5s in DEV mode |
| `src/components/TripWizard.tsx` | Trip creation flow with context upload |
| `src/components/AIChat.tsx` | Chat interface with file attachments |

## AI call patterns
- **Claude** (`/anthropic/v1/messages`): structured JSON generation — trip details, itinerary, packing list; also vision when attachments present
- **Perplexity** (`/perplexity/chat/completions`): conversational chat (no attachments) + real-time travel search

## DEV/PROD toggle
- `localStorage.devMode === 'true'` → DEV (free, online via Cloudflare Worker dev-proxy)
- `getWorkerUrl()` in `ai.ts` — called per request (reads localStorage each time)
- `CLAUDE_URL()` and `PPLX_URL()` are functions (not constants) so the URL is fresh on every call
- Toggle component: `src/components/DevModeToggle.tsx` — polls `GET https://dev-proxy.vin-bories.workers.dev/stats` every 5s in DEV mode; shows `🔧 DEV · N/1000 🔍 · resets Apr 1`
- **DEV mode quality**: Groq (Llama 3.3 70B) is lower quality than Claude. Use DEV to verify the pipeline works, PROD for real quality checks.

## Firebase in DEV mode
Firebase Firestore is still used in DEV mode (trip persistence). Firestore free tier: 50k reads + 20k writes/day — more than enough for iteration. Only AI calls are routed through the free dev proxy.

## Pre-push checklist
1. `npx tsc --noEmit` (automated via `.claude/settings.json` hook — blocks push on failure)
2. Update this CLAUDE.md if architecture changed
3. `npm run deploy` to publish to GitHub Pages

---

## Decision log

## Pre-deployment code review agent — 2026-03-24
**Context:** Needed an automated code review step before every deploy to catch critical bugs, XSS, and security issues without relying on the developer's memory.

**Options considered:**
- **Agent hook in settings.json (inline prompt)** — automatic, blocks deploy on findings, but prompt is buried in JSON and hard to iterate on.
- **Named agent in `.claude/agents/` + hook (chosen)** — review criteria live in a versioned markdown file that's easy to read and update independently; hook reads the file at runtime so changes take effect immediately; agent can also be invoked manually.
- **Git pre-push shell hook calling `claude -p`** — standard DevOps pattern, runs at push not deploy, but `.git/hooks/` is not committed so every developer has to set it up manually.

**Chosen:** Named agent definition at `.claude/agents/code-reviewer.md` + `PreToolUse` agent hook in `settings.json`
- Hook intercepts every `Bash` call; if command is not `npm run deploy`, the agent exits immediately (fast path, no review)
- If command is `npm run deploy`, agent reads `.claude/agents/code-reviewer.md` for criteria, reviews changed files via `git diff`, and either blocks (CRITICAL) or allows (HIGH/LOW)
- Review criteria are in `.claude/agents/code-reviewer.md` — update that file to change what the reviewer checks; no need to touch `settings.json`
- Agent has `tools: Bash, Read, Grep, Glob` only — cannot edit files

## Dev/prod free iteration setup — 2026-03-24
**Context:** Iterating on the product was burning Claude + Perplexity API credits. Needed a way to develop for free without losing the ability to quickly test in production.

**Options considered:**
- **`.env.development.local` file switching** — requires restarting the dev server to switch; no visibility into which mode is active.
- **Ollama local LLM + UI toggle** — free, works offline, no rate limits. But only works on the developer's machine.
- **Cloudflare Worker + Groq + Tavily** — free, always online, works from any device. Rate-limited but sufficient for iteration.

**Chosen:** Cloudflare Worker dev-proxy (`dev-proxy.vin-bories.workers.dev`) + runtime UI toggle
- Groq `llama-3.3-70b-versatile` replaces Claude (free, 12k TPM limit)
- Tavily (1000/month free) replaces Perplexity for web search; DuckDuckGo HTML scraping as fallback
- Search count tracked via Cloudflare KV, displayed in the toggle pill
- PROD mode unchanged — still uses real Claude + Perplexity via `wandr.vin-bories.workers.dev`
