import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

interface Props {
  onGetStarted: () => void
}

// ── Compass logo ──────────────────────────────────────────────────────────────
const CompassLogo = ({ size = 32, color = '#f97316' }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="13" fill="none" stroke={color} strokeWidth="1.2" opacity="0.5"/>
    <line x1="16" y1="3"  x2="16" y2="6.5"  stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="16" y1="25.5" x2="16" y2="29" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
    <line x1="3"  y1="16" x2="6.5"  y2="16" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
    <line x1="25.5" y1="16" x2="29" y2="16" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
    <polygon points="16,6 18.5,16 16,14 13.5,16" fill={color}/>
    <polygon points="16,26 18.5,16 16,18 13.5,16" fill={color} opacity="0.3"/>
    <circle cx="16" cy="16" r="1.8" fill={color}/>
  </svg>
)

// ── Types ─────────────────────────────────────────────────────────────────────
interface Destination {
  flag: string
  name: string
}

interface Step {
  num: string
  icon: string
  title: string
  desc: string
}

interface Feature {
  icon: string
  title: string
  desc: string
}

interface IncludedItem {
  icon: string
  label: string
}

export default function LandingPage({ onGetStarted }: Props) {
  const { t } = useTranslation('landing')

  const destinations = t('destinations.list', { returnObjects: true }) as Destination[]
  const steps = t('howItWorks.steps', { returnObjects: true }) as Step[]
  const features = t('features.list', { returnObjects: true }) as Feature[]
  const includedItems = t('included.items', { returnObjects: true }) as IncludedItem[]

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0b0b10]/80 backdrop-blur-md border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CompassLogo size={26}/>
            <span className="text-sm font-bold tracking-tight text-white">Wandr</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={onGetStarted}
              className="text-sm text-stone-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
            >
              {t('nav.signIn')}
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-white rounded-full transition-colors cursor-pointer border-0"
            >
              {t('nav.planTrip')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        {/* Hero photo — Santorini sunset */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1920&q=80&auto=format&fit=crop')" }}
        />
        {/* Dark gradient overlay: semi-transparent top → fully opaque bottom (blends into page bg) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b10]/55 via-[#0b0b10]/70 to-[#0b0b10]" />
        {/* Warm atmospheric tint on top of photo */}
        <div className="absolute top-0 right-0 w-[700px] h-[500px] bg-orange-600/8 blur-[140px] rounded-full pointer-events-none"/>

        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"/>
              {t('badge')}
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              {t('hero.line1')}<br/>
              {t('hero.line2')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                {t('hero.line3')}
              </span>
            </h1>

            <p className="text-lg text-stone-400 leading-relaxed mb-10 max-w-lg">
              {t('hero.desc')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-3.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors cursor-pointer border-0 text-base shadow-lg shadow-orange-900/30"
              >
                {t('hero.ctaPrimary')}
              </button>
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-3.5 bg-white/5 hover:bg-white/8 border border-white/10 text-white font-semibold rounded-xl transition-colors cursor-pointer text-base"
              >
                {t('hero.ctaSecondary')}
              </button>
            </div>
            <p className="text-xs text-stone-600">{t('hero.disclaimer')}</p>
          </div>
        </div>
      </section>

      {/* ── Destination chips ─────────────────────────────────────────────── */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs text-stone-600 uppercase tracking-widest mb-4 font-medium">{t('destinations.heading')}</p>
          <div className="flex flex-wrap gap-2.5">
            {destinations.map(d => (
              <button
                key={d.name}
                onClick={onGetStarted}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-orange-500/30 hover:bg-orange-500/5 text-sm text-stone-300 hover:text-white transition-all cursor-pointer"
              >
                <span>{d.flag}</span>
                <span>{d.name}</span>
              </button>
            ))}
            <button
              onClick={onGetStarted}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300 hover:text-orange-200 transition-all cursor-pointer"
            >
              {t('destinations.anywhere')}
            </button>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-[#0e0c09]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">{t('howItWorks.heading')}</p>
            <h2 className="text-3xl font-bold">{t('howItWorks.title1')}<br/>{t('howItWorks.title2')}</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-px bg-white/[0.05] rounded-2xl overflow-hidden">
            {steps.map((step, i) => (
              <div key={i} className="bg-[#0e0c09] p-8 hover:bg-white/[0.02] transition-colors">
                <div className="text-3xl mb-5">{step.icon}</div>
                <div className="text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-2">{step.num}</div>
                <h3 className="font-semibold text-base mb-3 leading-snug">{step.title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-widest mb-3">{t('features.heading')}</p>
            <h2 className="text-3xl font-bold">{t('features.title1')}<br/>{t('features.title2')}</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-orange-500/20 hover:bg-white/[0.05] transition-all group"
              >
                <div className="text-2xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-sm mb-2 group-hover:text-orange-200 transition-colors">{f.title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Included banner ──────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-[#0e0c09]">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-white/[0.07] overflow-hidden">
            {/* Top strip */}
            <div className="bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-teal-500/10 px-8 py-5 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{t('pricing.title')}</p>
              <p className="text-xs text-stone-400 mt-0.5">{t('pricing.desc')}</p>
            </div>
            {/* Features grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-white/[0.05]">
              {includedItems.map(item => (
                <div key={item.label} className="px-6 py-5 flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm text-stone-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl overflow-hidden border border-white/[0.07]">
            {/* Warm gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/15 via-amber-600/8 to-teal-600/8 pointer-events-none"/>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none"/>

            <div className="relative">
              <CompassLogo size={44} color="#fb923c"/>
              <h2 className="text-3xl font-extrabold mt-6 mb-3 leading-tight">
                {t('cta.line1')}<br/>{t('cta.line2')}
              </h2>
              <p className="text-stone-400 text-sm mb-8 max-w-sm mx-auto">
                {t('cta.desc')}
              </p>
              <button
                onClick={onGetStarted}
                className="px-10 py-3.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors cursor-pointer border-0 text-base shadow-lg shadow-orange-900/30"
              >
                {t('cta.button')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CompassLogo size={20}/>
            <span className="text-sm text-stone-500">{t('footer.tagline')}</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-stone-600">
            <a
              href="https://github.com/Danforthhh/Wandr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-300 transition-colors"
            >
              {t('footer.github')}
            </a>
            <button
              onClick={onGetStarted}
              className="hover:text-stone-300 transition-colors cursor-pointer bg-transparent border-0 text-xs text-stone-600"
            >
              {t('footer.signIn')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
