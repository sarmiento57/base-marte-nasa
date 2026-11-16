import { useEffect, useLayoutEffect, useRef } from 'react'

/** Night falls for a moment while the crew sleeps, then the next sol starts. */
export function SleepOverlay({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone)
  useLayoutEffect(() => {
    onDoneRef.current = onDone
  })
  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), 2400)
    return () => window.clearTimeout(timer)
  }, [])
  return <div role="dialog" aria-modal="true" aria-label="The crew is sleeping" className="fixed inset-0 z-[150] grid animate-[night-fade_2.4s_ease-in-out_forwards] place-items-center bg-[#0f0c22] text-white motion-reduce:animate-none">
    <div className="text-center">
      <p aria-hidden="true" className="text-7xl">🌙</p>
      <p className="mt-4 text-4xl font-black tracking-wide">Zzz…</p>
      <p className="mt-2 text-lg font-semibold text-white/80">The night passes. The panels rest, the plants keep growing.</p>
    </div>
  </div>
}
