# Wandr — AI Trip Planner

An AI-native trip planning app. Plan itineraries, generate packing lists, and chat with an AI travel assistant — all tailored to your destination and interests.

**Live:** [danforthhh.github.io/Wandr](https://danforthhh.github.io/Wandr/)

---

## Features

- **AI Trip Creation** — Describe your destination and preferences; AI generates a trip name, description, and theme
- **AI Itinerary** — Day-by-day schedule with activities, timings, and cost estimates
- **AI Packing List** — Smart, categorized checklist tailored to your destination and activities
- **AI Chat Assistant** — Ask anything about your trip: local tips, customs, hidden gems, logistics
- **Context upload** — Attach PDFs or images (hotel bookings, maps) to enrich AI responses

---

## Tech stack

- React 18 + TypeScript + Vite + Tailwind CSS
- Firebase Auth + Firestore (persistence)
- Anthropic Claude (itinerary, packing list, vision)
- Perplexity (conversational chat + real-time travel search)
- Cloudflare Worker as API gateway (keys stored as secrets — never in the bundle)

---

## Local development

```bash
npm install
npm run dev   # http://localhost:5173
```

No API keys needed locally — the app routes through a Cloudflare Worker.

---

## DEV / PROD toggle

A **DEV · PROD pill** lives in the top-right corner. Click it to switch AI backends at runtime — no restart needed.

| Mode | AI backend | Cost |
|------|-----------|------|
| **☁ PROD** | `wandr.vin-bories.workers.dev` → Claude + Perplexity | Paid per token |
| **🔧 DEV** | `dev-proxy.vin-bories.workers.dev` → Groq Llama 3.3 70B + Tavily | Free |

The pill shows live Tavily usage: `🔧 DEV · 42/1000 🔍 · resets Apr 1`

> DEV mode uses Groq for free iteration — good for testing the pipeline. Switch to PROD to validate final quality.

---

## Deploy

```bash
npm run deploy   # triggers code review → builds → publishes to GitHub Pages
```

Before building, an isolated code-reviewer agent (`.claude/agents/code-reviewer.md`) scans recently changed files for critical bugs and security issues. It blocks the deploy if anything critical is found. To update what gets reviewed, edit `.claude/agents/code-reviewer.md`.

---

## Cloudflare Worker (PROD API gateway)

Stores API keys server-side — never in the JS bundle.

```bash
cd worker/
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put PERPLEXITY_API_KEY
```
