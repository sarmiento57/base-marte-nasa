import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// General Mars science facts shown while loading (not game values).
const MARS_FACTS = [
  "A day on Mars is called a sol. It lasts about 24 hours and 39 minutes.",
  "Gravity on Mars is about 38% of Earth's, so you could jump about two and a half times higher.",
  "Mars has two small moons, Phobos and Deimos.",
  "Dust storms on Mars can grow until they cover the whole planet.",
  "Mars is farther from the Sun than Earth, so solar panels there get less than half the sunlight.",
  "Mars has a thin atmosphere and no global magnetic field, so it gives astronauts little protection from solar radiation.",
  "Sunsets on Mars look blue because of the way fine dust scatters sunlight.",
] as const

const FACT_EVERY_MS = 2600

type LoadingScreenProps = {
  title: string
  subtitle: string
  steps: readonly string[]
  durationMs: number
  factOffset?: number
  onDone: () => void
}

/**
 * Full-screen game loading screen: planet with an orbiting rocket, progress bar,
 * a short loading step and a Mars fact. Any key, click or tap skips it.
 * It is a modal dialog, so map keyboard controls stay paused while it is shown.
 */
export function LoadingScreen({ title, subtitle, steps, durationMs, factOffset = 0, onDone }: LoadingScreenProps) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const onDoneRef = useRef(onDone)
  const doneRef = useRef(false)
  useLayoutEffect(() => {
    onDoneRef.current = onDone
  })
  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current()
  }, [])

  useEffect(() => {
    const startedAt = performance.now()
    let finishTimer = 0
    const timer = window.setInterval(() => {
      const elapsed = Math.min(durationMs, performance.now() - startedAt)
      setElapsedMs(elapsed)
      if (elapsed >= durationMs) {
        window.clearInterval(timer)
        finishTimer = window.setTimeout(finish, 250)
      }
    }, 50)
    const skip = () => finish()
    window.addEventListener('keydown', skip)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(finishTimer)
      window.removeEventListener('keydown', skip)
    }
  }, [durationMs, finish])

  const ratio = durationMs > 0 ? elapsedMs / durationMs : 1
  const progress = Math.round((1 - (1 - ratio) ** 2) * 100)
  const step = steps[Math.min(steps.length - 1, Math.floor(ratio * steps.length))] ?? ''
  const fact = MARS_FACTS[(factOffset + Math.floor(elapsedMs / FACT_EVERY_MS)) % MARS_FACTS.length]

  return <div role="dialog" aria-modal="true" aria-labelledby="loading-title" onClick={finish} className="fixed inset-0 z-[200] grid cursor-pointer place-items-center overflow-hidden bg-[#1d1830] p-6 font-[Trebuchet_MS,ui-rounded,system-ui,sans-serif] text-white">
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,#fff_0_1px,transparent_2px),radial-gradient(circle_at_28%_72%,#fff_0_1px,transparent_2px),radial-gradient(circle_at_46%_12%,#ffe9c7_0_1.5px,transparent_2.5px),radial-gradient(circle_at_63%_38%,#fff_0_1px,transparent_2px),radial-gradient(circle_at_78%_16%,#fff_0_1.5px,transparent_2.5px),radial-gradient(circle_at_88%_64%,#c9f3ff_0_1px,transparent_2px),radial-gradient(circle_at_8%_86%,#fff_0_1.5px,transparent_2.5px),radial-gradient(circle_at_54%_88%,#fff_0_1px,transparent_2px)] opacity-80"/>
    <div aria-hidden="true" className="absolute -bottom-[55vh] left-1/2 size-[95vh] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#d8714d_0%,#9a4144_48%,#3b2140_68%,transparent_72%)] opacity-70"/>

    <div className="relative w-full max-w-xl text-center">
      <div aria-hidden="true" className="relative mx-auto size-44 sm:size-52">
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
          <defs>
            <radialGradient id="loading-planet" cx=".35" cy=".3" r=".8"><stop stopColor="#f5a06f"/><stop offset=".55" stopColor="#c55a43"/><stop offset="1" stopColor="#6f2f3d"/></radialGradient>
          </defs>
          <circle cx="100" cy="100" r="62" fill="url(#loading-planet)"/>
          <circle cx="78" cy="82" r="11" fill="#9d4840" opacity=".6"/>
          <circle cx="122" cy="118" r="15" fill="#9d4840" opacity=".55"/>
          <circle cx="112" cy="70" r="6" fill="#ffd0a3" opacity=".45"/>
          <path d="M48 112q52 20 104-6" fill="none" stroke="#ffc58f" strokeWidth="5" strokeLinecap="round" opacity=".35"/>
          <circle cx="100" cy="100" r="86" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 8" opacity=".35"/>
        </svg>
        <div className="absolute inset-0 animate-[spin_5s_linear_infinite] motion-reduce:animate-none">
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 rotate-45 text-3xl drop-shadow-[0_0_10px_#ffb36b]">🚀</span>
        </div>
      </div>

      <p className="mt-6 text-[10px] font-black uppercase tracking-[.22em] text-[#ffd491]">NASA Space Apps Challenge 2026</p>
      <h1 id="loading-title" className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-2 text-sm font-semibold text-white/75 sm:text-base">{subtitle}</p>

      <div className="mx-auto mt-8 max-w-md">
        <div className="flex items-end justify-between gap-3 text-xs font-bold">
          <p role="status" aria-live="polite" className="text-left text-white/85">{step}…</p>
          <span aria-hidden="true" className="tabular-nums text-[#ffd491]">{progress}%</span>
        </div>
        <progress aria-label={`Loading ${title}`} max={100} value={progress} className="mt-2 h-3 w-full overflow-hidden rounded-full accent-[#f2955f] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[#f2955f] [&::-webkit-progress-bar]:bg-white/15 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[linear-gradient(90deg,#f2955f,#ffd491)]"/>
      </div>

      <section className="mx-auto mt-8 max-w-md rounded-2xl border border-white/15 bg-white/10 p-4 text-left backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#7fe3e0]">Did you know?</p>
        <p className="mt-1 min-h-10 text-sm leading-5 text-white/90">{fact}</p>
      </section>

      <p className="mt-6 animate-pulse text-[11px] font-bold text-white/60 motion-reduce:animate-none">Press any key or click to skip</p>
    </div>
  </div>
}
