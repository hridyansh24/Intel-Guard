import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { listClasses, createClass } from './api'
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

export default function App() {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [newClassName, setNewClassName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const mouseRef = useRef({ x: 0, y: 0 })

  const fetchClasses = async () => {
    try { setClasses(await listClasses()) } catch {}
  }

  useEffect(() => { fetchClasses() }, [])

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
