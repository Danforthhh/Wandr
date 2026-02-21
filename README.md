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

## Tech stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Anthropic Claude API (`claude-opus-4-6`)
- lucide-react icons