import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

export default function TiltCard({ children, className = '', max = 8, style = {}, onClick, glow = false }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotX = useSpring(useTransform(y, (v) => -v * max), { stiffness: 220, damping: 18 })
  const rotY = useSpring(useTransform(x, (v) => v * max), { stiffness: 220, damping: 18 })
  const gx = useSpring(useTransform(x, (v) => (v + 0.5) * 100), { stiffness: 220, damping: 18 })
  const gy = useSpring(useTransform(y, (v) => (v + 0.5) * 100), { stiffness: 220, damping: 18 })

  const handleMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    x.set(nx)
    y.set(ny)
  }

  const reset = () => { x.set(0); y.set(0) }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        transformPerspective: 900,
        rotateX: rotX,
        rotateY: rotY,
        ...style,
      }}
    >
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          borderRadius: 'inherit',
          background: useTransform([gx, gy], ([gxv, gyv]) =>
            `radial-gradient(circle at ${gxv}% ${gyv}%, rgba(255,255,255,0.1), transparent 55%)`
          ),
          opacity: glow ? 1 : 0.7,
          zIndex: 2,
        }}
      />
      {children}
    </motion.div>
  )
}
