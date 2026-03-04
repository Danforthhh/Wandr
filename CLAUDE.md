# Wandr — Claude Code Guide

## Project Overview

Wandr is an AI-native trip planning web app. Users can create trips, generate AI-powered itineraries and packing lists, chat with an AI assistant, and search for travel information. All user data is stored in Firebase Firestore.

## Tech Stack

- **React 18 + TypeScript** — UI framework
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Styling
- **Firebase** — Authentication (email/password) and Firestore (data persistence)
- **Anthropic Claude API** (`claude-opus-4-6`) — Trip generation, itinerary, packing list
- **Perplexity API** — Real-time web search and AI chat
- **Leaflet / react-leaflet** — Interactive trip maps
- **lucide-react** — Icons
- **gh-pages** — GitHub Pages deployment

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server at http://localhost:5173
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview production build locally
npm run deploy     # Build and deploy to GitHub Pages (/Wandr/ base path)
```

There is no test suite or linter configured. TypeScript type-checking runs as part of `npm run build`.

## Project Structure

```
src/
├── App.tsx                  # Root component; all state and routing logic
├── main.tsx                 # React entry point
├── index.css                # Global styles (Tailwind imports)
├── types/
│   └── index.ts             # Shared TypeScript types (Trip, Activity, PackingItem, etc.)
├── components/
│   ├── AuthPage.tsx         # Login / sign-up screen
│   ├── ApiKeyModal.tsx      # Modal for saving Anthropic & Perplexity API keys
│   ├── Dashboard.tsx        # Trip list / home screen
│   ├── TripWizard.tsx       # Multi-step trip creation flow
│   ├── TripDetail.tsx       # Trip detail wrapper with tab navigation
│   ├── Itinerary.tsx        # Day-by-day itinerary view
│   ├── PackingList.tsx      # Packing checklist view
│   ├── AIChat.tsx           # Perplexity-powered trip chat
│   ├── TripSearch.tsx       # Perplexity-powered destination search
│   ├── TripMap.tsx          # Leaflet map with activity pins
│   ├── ActivityLog.tsx      # In-app activity/notification log overlay
│   └── DebugPanel.tsx       # Developer debug panel
├── hooks/
│   └── useAuth.ts           # Firebase auth state hook
└── services/
    ├── firebase.ts          # Firebase app initialisation
    ├── firestore.ts         # Firestore CRUD helpers (trips, chats, API keys)
    ├── ai.ts                # Anthropic & Perplexity API calls
    ├── activityLog.ts       # In-app activity log store
    └── logger.ts            # Console logging utility
```

## Key Patterns

### Routing
There is no React Router. Navigation is handled by a `view` state (`'dashboard' | 'wizard' | 'detail'`) in `App.tsx`, with `selectedTrip` and `activeTab` for sub-navigation.

### AI Services (`src/services/ai.ts`)
- **`generateTripDetails`** — Uses Claude to create trip name, emoji, description, and theme colour
- **`generateItinerary`** — Uses Claude to build a day-by-day itinerary
- **`generatePackingList`** — Uses Claude to generate a categorised packing list
- Perplexity is used for the chat assistant and destination search (requires a separate Perplexity API key)

### Firebase / Firestore (`src/services/firestore.ts`)
- All data is scoped to `users/{uid}/...`
- Collections: `trips`, `chats/{tripId}/messages`, `settings` (API keys)
- API keys are stored encrypted in Firestore (not just localStorage)

### API Keys
The app requires two API keys entered by the user via the Settings modal:
- **Anthropic API key** — for trip generation features
- **Perplexity API key** — for search and chat features

Keys are persisted in Firestore under the user's account.

### Vite Base Path
The `base` in `vite.config.ts` is `/Wandr/` for production builds and `/` for dev, so assets and routing work correctly on GitHub Pages.

## Firebase Configuration
Firebase config is in `src/services/firebase.ts`. Firestore security rules are in `firestore.rules`. The project does not use Firebase Hosting (deployed via GitHub Pages instead).

## Deployment
```bash
npm run deploy   # Runs: npm run build && gh-pages -d dist
```
Deploys to the `gh-pages` branch, served at `https://<username>.github.io/Wandr/`.
