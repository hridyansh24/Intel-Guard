import { motion } from 'framer-motion'

export default function Logo({ size = 34, animated = true, label = 'AI Guard' }) {
  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.8 } : false}
      animate={animated ? { opacity: 1, scale: 1 } : false}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
    >
      <div style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
      }}>
        <motion.div
          animate={animated ? { rotate: 360 } : false}
          transition={{ duration: 14, ease: 'linear', repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #22d3ee, #fbbf24, #8b5cf6, #f472b6, #22d3ee)',
            padding: 2,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
          }}
        />
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
          <path
            d="M12 2.5 L4 6v6c0 4.5 3.2 8.5 8 9.5 4.8-1 8-5 8-9.5V6l-8-3.5z"
            fill="url(#logoGrad)"
            stroke="#fff"
            strokeOpacity="0.3"
            strokeWidth="0.6"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span style={{
        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
        fontWeight: 800,
        fontSize: size * 0.52,
        letterSpacing: '-0.03em',
        color: 'var(--text-bright)',
      }}>
        {label}
      </span>
    </motion.div>
  )
}
