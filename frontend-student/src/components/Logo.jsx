import { motion } from 'framer-motion'

export default function Logo({ size = 34, animated = true }) {
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
        {/* rotating outer ring */}
        <motion.div
          animate={animated ? { rotate: 360 } : false}
          transition={{ duration: 14, ease: 'linear', repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #a855f7, #22d3ee, #ec4899, #fbbf24, #a855f7)',
            padding: 2,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
          }}
        />
        {/* inner glyph */}
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#22d3ee" />
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
        AI Guard
      </span>
    </motion.div>
  )
}
