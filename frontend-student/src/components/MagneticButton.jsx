import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function MagneticButton({ children, className = 'btn btn-primary', onClick, disabled, style, strength = 18 }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 320, damping: 22 })
  const sy = useSpring(y, { stiffness: 320, damping: 22 })

  const handleMove = (e) => {
    if (!ref.current || disabled) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    x.set(((e.clientX - cx) / rect.width) * strength)
    y.set(((e.clientY - cy) / rect.height) * strength)

    // update gradient highlight position CSS vars for `.btn::before`
    const mx = ((e.clientX - rect.left) / rect.width) * 100
    const my = ((e.clientY - rect.top) / rect.height) * 100
    ref.current.style.setProperty('--mx', `${mx}%`)
    ref.current.style.setProperty('--my', `${my}%`)
  }

  const reset = () => { x.set(0); y.set(0) }

  return (
    <motion.button
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      style={{ x: sx, y: sy, ...style }}
    >
      {children}
    </motion.button>
  )
}
