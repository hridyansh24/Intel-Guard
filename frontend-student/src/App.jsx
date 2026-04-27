import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { registerStudent, loginStudent, getStudent } from './api'
import Dashboard from './pages/Dashboard'
import ShieldOrb from './three/ShieldOrb'
import ParticleField from './three/ParticleField'
import Logo from './components/Logo'
import MagneticButton from './components/MagneticButton'

export default function App() {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('ai_guard_student')
    if (saved) {
      const parsed = JSON.parse(saved)
      getStudent(parsed.student_id)
        .then(s => { setStudent(s); setLoading(false) })
        .catch(() => { localStorage.removeItem('ai_guard_student'); setLoading(false) })
    } else {
      setLoading(false)
    }
  }, [])

  const handleAuth = async (result) => {
    localStorage.setItem('ai_guard_student', JSON.stringify(result))
    setStudent(result)
  }

  const handleLogout = () => {
    localStorage.removeItem('ai_guard_student')
    setStudent(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="loader-dots"><span /><span /><span /></div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {!student ? (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <AuthPage onAuth={handleAuth} />
        </motion.div>
      ) : (
        <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Dashboard student={student} onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ============================================================
   AUTH PAGE — hero-style landing with 3D orb + glass form
   ============================================================ */
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('signup')
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [justRegisteredId, setJustRegisteredId] = useState('')
  const mouseRef = useRef({ x: 0, y: 0 })

  const handleMouse = (e) => {
    const { innerWidth: w, innerHeight: h } = window
    mouseRef.current = { x: (e.clientX - w / 2) / w * 2, y: (e.clientY - h / 2) / h * 2 }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'signup') {
        if (!name.trim()) return setError('Enter your name')
        if (password.length < 4) return setError('Password must be at least 4 characters')
        setLoading(true)
        const s = await registerStudent(name.trim(), password)
        setJustRegisteredId(s.student_id)
        await onAuth(s)
      } else {
        if (!studentId.trim()) return setError('Enter your student ID')
        if (!password) return setError('Enter your password')
        setLoading(true)
        const s = await loginStudent(studentId.trim(), password)
        await onAuth(s)
      }
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const switchMode = (m) => { setMode(m); setError(''); setPassword('') }

  return (
    <div onMouseMove={handleMouse} style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="aurora" />
      <ParticleField />

      <div style={{
        position: 'relative', zIndex: 2, minHeight: '100vh',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
        maxWidth: 1380, margin: '0 auto', padding: '48px 40px',
        alignItems: 'center', gap: 48,
      }} className="auth-grid">

        {/* LEFT — hero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Logo size={38} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{ position: 'relative' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'var(--violet-soft)', border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600, color: 'var(--violet-bright)', marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald-bright)', boxShadow: '0 0 10px var(--emerald-bright)' }} />
              Academic integrity, reimagined
            </div>

            <h1 style={{
              fontSize: 'clamp(40px, 5vw, 64px)',
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: 'var(--text-bright)',
              marginBottom: 20,
            }}>
              Prove your work.<br/>
              <span className="gradient-text">Not your prompts.</span>
            </h1>

            <p style={{ fontSize: 17, color: 'var(--text-muted)', maxWidth: 520, lineHeight: 1.6 }}>
              Submit assignments, get instant AI-detection feedback, and verify your own understanding
              through interactive comprehension checks. Built for the AI era.
            </p>
          </motion.div>

          {/* feature row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 560, marginTop: 12 }}
          >
            <Feature
              icon="🛡"
              title="8-layer detection"
              color="linear-gradient(135deg,#a855f7,#ec4899)"
            />
            <Feature
              icon="⚡"
              title="Instant MCQ quiz"
              color="linear-gradient(135deg,#22d3ee,#06b6d4)"
            />
            <Feature
              icon="✍"
              title="Style profiling"
              color="linear-gradient(135deg,#fbbf24,#f472b6)"
            />
          </motion.div>

          {/* 3D shield behind/below hero */}
          <div style={{ position: 'absolute', right: -100, top: 40, width: 520, height: 520, pointerEvents: 'none', zIndex: -1, display: 'none' }}>
            <ShieldOrb height={520} mouseRef={mouseRef} />
          </div>
        </div>

        {/* RIGHT — auth card + orb */}
        <div style={{ position: 'relative' }}>
          {/* 3D orb floats above the card on larger screens */}
          <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 360, height: 260, pointerEvents: 'none', zIndex: 0 }}>
            <ShieldOrb height={260} mouseRef={mouseRef} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="card card-glow"
            style={{
              width: '100%',
              maxWidth: 440,
              marginLeft: 'auto',
              marginTop: 140,
              padding: 36,
              borderRadius: 22,
              border: '1px solid var(--border-strong)',
              background: 'linear-gradient(135deg, rgba(22,15,43,0.85), rgba(10,6,24,0.92))',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* border-glow ring */}
            <div aria-hidden style={{
              position: 'absolute', inset: -1, borderRadius: 23,
              background: 'conic-gradient(from 180deg at 50% 50%, rgba(139,92,246,0.45), rgba(34,211,238,0.3), rgba(236,72,153,0.4), rgba(139,92,246,0.45))',
              filter: 'blur(16px)',
              opacity: 0.45,
              zIndex: -1,
            }} />

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>
                {mode === 'signup' ? 'Get started' : 'Welcome back'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {mode === 'signup' ? 'Create your student account — takes 10 seconds' : 'Sign in to continue where you left off'}
              </p>
            </div>

            {/* Mode tabs */}
            <div style={{ position: 'relative', display: 'flex', gap: 0, padding: 4, background: 'rgba(10, 6, 24, 0.6)', borderRadius: 12, marginBottom: 22, border: '1px solid var(--border)' }}>
              <motion.div
                initial={false}
                animate={{ x: mode === 'signup' ? 0 : '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                style={{
                  position: 'absolute',
                  top: 4, bottom: 4,
                  width: 'calc(50% - 4px)',
                  left: 4,
                  borderRadius: 8,
                  background: 'var(--grad-primary)',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
                }}
              />
              {['signup', 'login'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  style={{
                    flex: 1, padding: '10px 12px', position: 'relative', zIndex: 1,
                    fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
                    color: mode === m ? '#fff' : 'var(--text-muted)',
                    transition: 'color 200ms',
                  }}
                >
                  {m === 'signup' ? 'Sign Up' : 'Log In'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'signup' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'signup' ? 20 : -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {mode === 'signup' ? (
                    <div style={{ marginBottom: 14 }}>
                      <div className="label">Full Name</div>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Morgan" autoFocus />
                    </div>
                  ) : (
                    <div style={{ marginBottom: 14 }}>
                      <div className="label">Student ID</div>
                      <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="a1b2c3d4" autoFocus />
                    </div>
                  )}

                  <div style={{ marginBottom: 18 }}>
                    <div className="label">Password</div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Choose a strong password' : 'Your password'} />
                  </div>
                </motion.div>
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    color: 'var(--rose-bright)', fontSize: 13, marginBottom: 12,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--rose-soft)', border: '1px solid rgba(244,63,94,0.3)',
                  }}
                >
                  {error}
                </motion.div>
              )}

              <MagneticButton className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px 22px', fontSize: 14 }}>
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                    {mode === 'signup' ? 'Creating account…' : 'Signing in…'}
                  </>
                ) : (
                  <>
                    {mode === 'signup' ? 'Create account' : 'Log in'}
                    <span style={{ fontSize: 16, lineHeight: 0 }}>→</span>
                  </>
                )}
              </MagneticButton>
            </form>

            {justRegisteredId && mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(34,211,238,0.1))',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: 12.5,
                  color: 'var(--text)',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--emerald-bright)', marginBottom: 4 }}>✓ Account created</div>
                Your Student ID: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-bright)' }}>{justRegisteredId}</code>
                <div style={{ marginTop: 4, color: 'var(--text-dim)' }}>Save this — you'll need it to log in next time.</div>
              </motion.div>
            )}

            <div style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-dim)', fontSize: 12 }}>
              {mode === 'signup' ? 'Already have an account? ' : 'New to AI Guard? '}
              <button type="button" onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                style={{ color: 'var(--cyan-bright)', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
                {mode === 'signup' ? 'Log in' : 'Create one'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .auth-grid { grid-template-columns: 1fr !important; padding: 32px 20px !important; }
        }
      `}</style>
    </div>
  )
}

function Feature({ icon, title, color }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: 14,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: color,
        display: 'grid', placeItems: 'center',
        fontSize: 16,
      }}>{icon}</div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-bright)' }}>{title}</span>
    </motion.div>
  )
}
