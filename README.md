# Wandr — AI Trip Planner

An AI-native trip planning app powered by Claude. Plan itineraries, generate packing lists, and chat with an AI assistant — all tailored to your destination and interests.

## Features

- **AI Trip Creation** — Describe your destination and preferences; AI generates a trip name, description, and theme
- **AI Itinerary** — Day-by-day schedule with activities, timings, and cost estimates
- **AI Packing List** — Smart, categorized checklist tailored to your destination and activities
- **AI Chat Assistant** — Ask anything about your trip: local tips, customs, hidden gems, logistics
- **Local storage** — All trips saved in your browser, no account needed

## Setup

### 1. Install Node.js
Download from [nodejs.org](https://nodejs.org) (LTS version recommended).

### 2. Install dependencies
```bash
npm install
```

### 3. Get an Anthropic API key
Sign up at [console.anthropic.com](https://console.anthropic.com) and create an API key.

### 4. Run the app
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Enter your Anthropic API key when prompted — it's stored locally in your browser only.

## Build for production
```bash
npm run build
npm run preview
```

## Development mode (free)

A **DEV/PROD toggle** pill lives in the top-right corner of the app. Click it to switch between:

| Mode | AI backend | Cost |
|------|-----------|------|
| **☁ PROD** | Cloudflare Worker → Claude + Perplexity | Paid per token |
| **🔧 DEV** | Local proxy → Ollama `qwen2.5:7b` + Brave Search | Free |

The pill shows live search usage: `🔧 DEV · 42/2000 🔍 · resets Apr 1`

**Setup** — see [`../dev-proxy/README.md`](../dev-proxy/README.md) for one-time Ollama installation and proxy startup instructions.

> DEV mode uses `qwen2.5:7b` locally — good for iteration, not production-quality. Switch to PROD to validate final results.

## Tech stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Anthropic Claude API (`claude-haiku-4-5-20251001`) + Perplexity (sonar-pro / sonar)
- Firebase Auth + Firestore
- lucide-react icons