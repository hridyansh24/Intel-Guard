import { useEffect, useState } from 'react'

export default function Counter({ value, duration = 1200, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()
    const from = 0
    const to = Number(value) || 0

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display.toFixed(decimals)}{suffix}
    </span>
  )
}
