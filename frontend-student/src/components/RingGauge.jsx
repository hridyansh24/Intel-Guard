import Counter from './Counter'

export default function RingGauge({
  value = 0,              // 0..1
  size = 180,
  strokeWidth = 14,
  color = '#a855f7',
  secondaryColor = '#22d3ee',
  label,
  sublabel,
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  const offset = circ * (1 - pct)
  const id = `grad-${Math.round(Math.random() * 1e6)}`

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
        </defs>
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
          stroke={`url(#${id})`}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ color, transform: `rotate(-90deg)`, transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="ring-center">
        <div style={{
          fontSize: size > 150 ? 38 : 28,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          background: `linear-gradient(135deg, ${color}, ${secondaryColor})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
        }}>
          <Counter value={value * 100} decimals={0} suffix="%" />
        </div>
        {label && (
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 6,
          }}>{label}</div>
        )}
        {sublabel && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sublabel}</div>
        )}
      </div>
    </div>
  )
}
