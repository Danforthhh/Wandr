interface Props {
  onGetStarted: () => void
}

const WandrLogo = ({ size = 32, color = '#6366f1' }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="13" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"/>
    <path d="M16 5 L21 16 L16 14 L11 16 Z" fill={color}/>
    <path d="M13 17 L16 14 L19 17 L16 26 Z" fill={color} opacity="0.7"/>
    <path d="M9 12.5 L16 14 L23 12.5 L21 16 L16 14 L11 16 Z" fill={color} opacity="0.45"/>
  </svg>
)

const Check = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mt-0.5">
    <circle cx="8" cy="8" r="8" fill="#6366f1" opacity="0.15"/>
    <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const FEATURES = [
  {
    icon: '⚡',
    title: 'AI itinerary generation',
    desc: 'Day-by-day plans tailored to your destination, interests, and budget — generated in seconds.',
  },
  {
    icon: '🗺️',
    title: 'Interactive map',
    desc: 'Every activity pinned on a live map. Explore your trip visually before you even leave home.',
  },
  {
    icon: '🧳',
    title: 'Smart packing lists',
    desc: 'Context-aware checklists based on your destination, season, and trip type. Never forget a thing.',
  },
  {
    icon: '💬',
    title: 'AI travel chat',
    desc: 'Ask anything about your destination — local tips, weather, culture, restaurants — in real time.',
  },
  {
    icon: '🔍',
    title: 'Live travel search',
    desc: 'Real-time flight, hotel, and activity search powered by Perplexity. Always up to date.',
  },
  {
    icon: '🔒',
    title: 'Your trips, your data',
    desc: 'All trips saved to your account and synced across devices. Private by default.',
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Describe your trip',
    desc: 'Enter destination, dates, travelers, interests, and budget. Upload inspiration or notes.',
  },
  {
    n: '2',
    title: 'AI builds your plan',
    desc: 'Claude generates a full itinerary, packing list, and trip overview tailored to your style.',
  },
  {
    n: '3',
    title: 'Explore & adjust',
    desc: 'Chat with AI, search real-time info, view everything on an interactive map. Ready to go.',
  },
]

const FREE_FEATURES = ['Unlimited trips', 'Groq Llama 3.3 70B (DEV)', 'Itinerary & packing list', 'AI chat + map']
const PRO_FEATURES  = ['Unlimited trips', 'Claude + Perplexity (PROD)', 'Real-time travel search', 'AI chat + map', 'File & photo upload']

export default function LandingPage({ onGetStarted }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <WandrLogo size={28}/>
            <span className="text-sm font-bold tracking-tight">Wandr</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-colors cursor-pointer border-0"
            >
              Start planning free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"/>
        <div className="absolute top-20 left-1/4 w-[300px] h-[200px] bg-violet-600/10 blur-[80px] rounded-full pointer-events-none"/>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
            AI-powered trip planning
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Plan your next adventure.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Powered by AI.
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
            Wandr builds your full trip itinerary, packing list, and real-time travel recommendations
            in seconds — so you can spend less time planning and more time exploring.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors cursor-pointer border-0 text-base shadow-lg shadow-indigo-900/50"
            >
              Start planning free
            </button>
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-colors cursor-pointer text-base"
            >
              See how it works →
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Free tier included · No credit card · Real AI recommendations
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 bg-[#0d0d1f]">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold mb-2">How it works</h2>
            <p className="text-slate-400 text-sm">From idea to full trip plan in 3 steps</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-7 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-gradient-to-r from-indigo-500/20 via-indigo-500/40 to-indigo-500/20"/>

            {STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl font-black text-indigo-400 mb-4 relative z-10">
                  {step.n}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto pt-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold mb-2">Everything you need for your next trip</h2>
            <p className="text-slate-400 text-sm">Built for solo travelers, couples, families, and groups</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 bg-[#0d0d1f]">
        <div className="max-w-3xl mx-auto pt-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold mb-2">Simple pricing</h2>
            <p className="text-slate-400 text-sm">Start free in DEV mode. Switch to PROD for Claude-quality plans.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Free card */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col">
              <div className="mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Free — DEV mode</div>
                <div className="text-4xl font-extrabold">$0</div>
                <div className="text-xs text-slate-500 mt-1">No credit card required</div>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check/>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-semibold hover:bg-white/5 transition-colors cursor-pointer bg-transparent"
              >
                Start free
              </button>
            </div>

            {/* Pro card */}
            <div className="p-6 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                Best quality
              </div>
              <div className="mb-4">
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">PROD mode</div>
                <div className="text-4xl font-extrabold">Free</div>
                <div className="text-xs text-slate-400 mt-1">Powered by Cloudflare Worker</div>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                    <Check/>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors cursor-pointer border-0"
              >
                Get started →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto pt-20 text-center">
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent border border-indigo-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none"/>
            <WandrLogo size={40} color="#818cf8"/>
            <h2 className="text-2xl font-bold mt-4 mb-3">
              Ready to plan your next adventure?
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              Free tier included. No credit card. Setup in 30 seconds.
            </p>
            <button
              onClick={onGetStarted}
              className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors cursor-pointer border-0 text-base shadow-lg shadow-indigo-900/50"
            >
              Start planning free
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <WandrLogo size={22}/>
            <span className="text-sm text-slate-400">AI trip planning, anywhere you go.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <a
              href="https://github.com/Danforthhh/Wandr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
            <button
              onClick={onGetStarted}
              className="hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0 text-xs text-slate-500"
            >
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
