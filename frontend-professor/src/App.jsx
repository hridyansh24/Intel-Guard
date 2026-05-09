import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  listClasses, createClass,
  registerProfessor, loginProfessor, getProfessor,
} from './api'
import ClassDashboard from './pages/ClassDashboard'
import ShieldOrb from './three/ShieldOrb'
import ParticleField from './three/ParticleField'
import Logo from './components/Logo'
import TiltCard from './components/TiltCard'
import MagneticButton from './components/MagneticButton'
import Counter from './components/Counter'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
}

const PROFESSOR_LS_KEY = 'ai_guard_professor'

export default function App() {
  const [professor, setProfessor] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [newClassName, setNewClassName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const mouseRef = useRef({ x: 0, y: 0 })

  // Restore session from localStorage on first paint.
  useEffect(() => {
    const saved = localStorage.getItem(PROFESSOR_LS_KEY)
    if (!saved) { setAuthLoading(false); return }
    try {
      const parsed = JSON.parse(saved)
      getProfessor(parsed.professor_id)
        .then(p => { setProfessor(p); setAuthLoading(false) })
        .catch(() => { localStorage.removeItem(PROFESSOR_LS_KEY); setAuthLoading(false) })
    } catch {
      localStorage.removeItem(PROFESSOR_LS_KEY); setAuthLoading(false)
    }
  }, [])

  const fetchClasses = async () => {
    try { setClasses(await listClasses()) } catch {}
  }

  useEffect(() => { if (professor) fetchClasses() }, [professor])

  const handleAuth = (result) => {
    localStorage.setItem(PROFESSOR_LS_KEY, JSON.stringify(result))
    setProfessor(result)
  }

  const handleLogout = () => {
    localStorage.removeItem(PROFESSOR_LS_KEY)
    setProfessor(null)
    setSelectedClass(null)
    setClasses([])
  }

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      mouseRef.current = { x, y }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleCreate = async () => {
    if (!newClassName.trim()) return
    setCreating(true)
    setError('')
    try {
      const cls = await createClass(newClassName.trim())
      setNewClassName('')
      setShowCreate(false)
      await fetchClasses()
      setSelectedClass(cls.class_id)
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="loader-dots"><span /><span /><span /></div>
      </div>
    )
  }

  if (!professor) {
    return <ProfessorAuthPage onAuth={handleAuth} />
  }

  if (selectedClass) {
    return <ClassDashboard classId={selectedClass} onBack={() => { setSelectedClass(null); fetchClasses() }} />
  }

  const totalStudents = classes.reduce((s, c) => s + (c.students?.length || 0), 0)
  const totalAssignments = classes.reduce((s, c) => s + (c.contexts?.length || 0), 0)

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="aurora" aria-hidden />
      <div className="noise" aria-hidden />
      <ParticleField />

      {/* Top nav */}
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pro-nav"
      >
        <Logo size={34} />
        <span className="badge badge-cyan">Professor Console</span>
        <div style={{ flex: 1 }} />
        <div className="pro-nav-stats">
          <div className="nav-stat">
            <div className="nav-stat-num"><Counter value={classes.length} /></div>
            <div className="nav-stat-lbl">Classes</div>
          </div>
          <div className="nav-stat">
            <div className="nav-stat-num"><Counter value={totalStudents} /></div>
            <div className="nav-stat-lbl">Students</div>
          </div>
          <div className="nav-stat">
            <div className="nav-stat-num"><Counter value={totalAssignments} /></div>
            <div className="nav-stat-lbl">Assignments</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-bright)', fontWeight: 600 }}>{professor.name}</span>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: 12 }}>
            Sign out
          </button>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="pro-hero">
        <div className="pro-hero-copy">
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Academic integrity · live
            </span>
          </motion.div>
          <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="show" className="pro-hero-title">
            The command deck for{' '}
            <span className="grad-text">honest scholarship</span>.
          </motion.h1>
          <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" className="pro-hero-sub">
            Detect AI-generated work with 8-layer forensic analysis. Fingerprint every student's writing style.
            Verify comprehension. Turn suspicion into evidence — without the accusations.
          </motion.p>
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="pro-hero-chips">
            <div className="chip"><span className="chip-dot chip-dot-cyan" />8-layer detection</div>
            <div className="chip"><span className="chip-dot chip-dot-amber" />Style fingerprinting</div>
            <div className="chip"><span className="chip-dot chip-dot-violet" />MCQ comprehension checks</div>
            <div className="chip"><span className="chip-dot chip-dot-emerald" />Per-class analytics</div>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="pro-hero-orb"
        >
          <ShieldOrb height={420} mouseRef={mouseRef} />
          <div className="orb-caption">
            <div className="orb-caption-num">0.50·0.35·0.15</div>
            <div className="orb-caption-lbl">AI · Style · Time weights</div>
          </div>
        </motion.div>
      </section>

      {/* Classes grid */}
      <section className="pro-classes">
        <div className="pro-classes-head">
          <div>
            <h2 className="pro-classes-title">Your classes</h2>
            <p className="pro-classes-sub">
              {classes.length === 0
                ? 'Create your first class to start tracking submissions.'
                : `${classes.length} ${classes.length === 1 ? 'class' : 'classes'} · ${totalStudents} students enrolled`}
            </p>
          </div>
          <MagneticButton
            onClick={() => setShowCreate(true)}
            className="btn btn-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New class
          </MagneticButton>
        </div>

        {classes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="pro-empty"
          >
            <div className="pro-empty-glow" />
            <div style={{ fontSize: 56, marginBottom: 10 }}>🎓</div>
            <div className="pro-empty-title">No classes yet</div>
            <div className="pro-empty-sub">Classes hold students, assignments, and submissions. Spin one up above.</div>
          </motion.div>
        ) : (
          <div className="pro-classes-grid">
            {classes.map((cls, i) => (
              <motion.div
                key={cls.class_id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
              >
                <TiltCard
                  className="pro-class-card"
                  onClick={() => setSelectedClass(cls.class_id)}
                  glow
                >
                  <div className="pro-class-ring" aria-hidden />
                  <div className="pro-class-glyph" aria-hidden>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="pro-class-name">{cls.name}</div>
                  <div className="pro-class-meta">
                    <div className="pro-class-metric">
                      <span className="pro-class-metric-num">{cls.students?.length || 0}</span>
                      <span className="pro-class-metric-lbl">students</span>
                    </div>
                    <div className="pro-class-metric-divider" />
                    <div className="pro-class-metric">
                      <span className="pro-class-metric-num">{cls.contexts?.length || 0}</span>
                      <span className="pro-class-metric-lbl">assignments</span>
                    </div>
                  </div>
                  <div className="pro-class-cta">
                    Open console
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Create class modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="pro-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !creating && setShowCreate(false)}
          >
            <motion.div
              className="pro-modal glass-card"
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pro-modal-glow" aria-hidden />
              <h3 className="pro-modal-title">Create a new class</h3>
              <p className="pro-modal-sub">Give it a name students will recognize. You can link assignments next.</p>
              <input
                autoFocus
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                placeholder="e.g., CS 201 — Spring 2026"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="pro-modal-input"
              />
              {error && <div className="pro-modal-err">{error}</div>}
              <div className="pro-modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowCreate(false)} disabled={creating}>
                  Cancel
                </button>
                <MagneticButton onClick={handleCreate} disabled={creating || !newClassName.trim()}>
                  {creating ? 'Creating…' : 'Create class'}
                </MagneticButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   PROFESSOR AUTH PAGE — demo-grade signup / login
   ============================================================ */
function ProfessorAuthPage({ onAuth }) {
  const [mode, setMode] = useState('signup')
  const [name, setName] = useState('')
  const [professorId, setProfessorId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [justRegisteredId, setJustRegisteredId] = useState('')
  const mouseRef = useRef({ x: 0, y: 0 })

  const onMouseMove = (e) => {
    const { innerWidth: w, innerHeight: h } = window
    mouseRef.current = { x: (e.clientX - w / 2) / w * 2, y: (e.clientY - h / 2) / h * 2 }
  }

  const switchMode = (m) => { setMode(m); setError(''); setPassword('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'signup') {
        if (!name.trim()) return setError('Enter your name')
        if (password.length < 4) return setError('Password must be at least 4 characters')
        setLoading(true)
        const p = await registerProfessor(name.trim(), password)
        setJustRegisteredId(p.professor_id)
        onAuth(p)
      } else {
        if (!professorId.trim()) return setError('Enter your professor ID')
        if (!password) return setError('Enter your password')
        setLoading(true)
        const p = await loginProfessor(professorId.trim(), password)
        onAuth(p)
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div onMouseMove={onMouseMove} style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="aurora" aria-hidden />
      <div className="noise" aria-hidden />
      <ParticleField />

      <div style={{
        position: 'relative', zIndex: 2, minHeight: '100vh',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
        maxWidth: 1380, margin: '0 auto', padding: '48px 40px',
        alignItems: 'center', gap: 48,
      }} className="auth-grid">

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Logo size={36} />
          <span className="badge badge-cyan" style={{ alignSelf: 'flex-start' }}>Professor Console</span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="pro-hero-title"
            style={{ marginTop: 4 }}
          >
            The command deck for <span className="grad-text">honest scholarship</span>.
          </motion.h1>

          <p className="pro-hero-sub" style={{ maxWidth: 560 }}>
            Sign up to create classes, link assignments, and review submissions with AI-detection,
            style-deviation, and confidence signals. Demo authentication — locally hosted.
          </p>

          <div className="pro-hero-chips">
            <div className="chip"><span className="chip-dot chip-dot-cyan" />8-layer detection</div>
            <div className="chip"><span className="chip-dot chip-dot-amber" />Style fingerprinting</div>
            <div className="chip"><span className="chip-dot chip-dot-violet" />Per-assignment quizzes</div>
          </div>

          <div style={{ position: 'relative', width: 360, height: 220, marginTop: 8 }}>
            <ShieldOrb height={220} mouseRef={mouseRef} />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: 460,
            marginLeft: 'auto',
            padding: 32,
            borderRadius: 20,
            position: 'relative',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>
              {mode === 'signup' ? 'Create professor account' : 'Welcome back'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {mode === 'signup'
                ? 'Sign up to access the professor console.'
                : 'Sign in with your professor ID and password.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(10, 6, 24, 0.6)', borderRadius: 12, marginBottom: 22, border: '1px solid var(--border)' }}>
            {['signup', 'login'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '10px 12px',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
                  borderRadius: 8,
                  background: mode === m ? 'var(--grad-primary)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                  transition: 'all 200ms',
                }}
              >
                {m === 'signup' ? 'Sign Up' : 'Log In'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' ? (
              <div style={{ marginBottom: 14 }}>
                <div className="label">Full Name</div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Alex Morgan" autoFocus />
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <div className="label">Professor ID</div>
                <input value={professorId} onChange={e => setProfessorId(e.target.value)} placeholder="paste the id from signup" autoFocus />
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <div className="label">Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Choose a password (min 4 chars)' : 'Your password'} />
            </div>

            {error && (
              <div style={{
                color: 'var(--rose-bright)', fontSize: 13, marginBottom: 12,
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--rose-soft)', border: '1px solid rgba(244,63,94,0.3)',
              }}>{error}</div>
            )}

            <MagneticButton className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px 22px', fontSize: 14 }}>
              {loading ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Log in')}
            </MagneticButton>
          </form>

          {justRegisteredId && (
            <div style={{
              marginTop: 16, padding: 14, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(34,211,238,0.1))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: 12.5, color: 'var(--text)',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--emerald-bright)', marginBottom: 4 }}>Account created</div>
              Your Professor ID:{' '}
              <code style={{
                background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 6,
                fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-bright)',
              }}>{justRegisteredId}</code>
              <div style={{ marginTop: 4, color: 'var(--text-dim)' }}>Save this — you'll need it to log in next time.</div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-dim)', fontSize: 12 }}>
            {mode === 'signup' ? 'Already registered? ' : 'New here? '}
            <button type="button" onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
              style={{ color: 'var(--cyan-bright)', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
              {mode === 'signup' ? 'Log in' : 'Create an account'}
            </button>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .auth-grid { grid-template-columns: 1fr !important; padding: 32px 20px !important; }
        }
      `}</style>
    </div>
  )
}
