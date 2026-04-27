import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  listClasses, joinClass, getStudentClasses, getClass,
  submitWork, evaluateAnswer, listSubmissions,
} from '../api'
import Logo from '../components/Logo'
import Counter from '../components/Counter'
import RingGauge from '../components/RingGauge'
import TiltCard from '../components/TiltCard'
import MagneticButton from '../components/MagneticButton'
import AIGauge3D from '../three/AIGauge3D'
import Trophy3D from '../three/Trophy3D'
import { burst, cannons, fireworks, shake } from '../components/Confetti'

/* ============================================================
   DASHBOARD SHELL
   ============================================================ */
export default function Dashboard({ student, onLogout }) {
  const [tab, setTab] = useState('submit')
  const [myClasses, setMyClasses] = useState([])
  const [allClasses, setAllClasses] = useState([])
  const [stats, setStats] = useState({ submissions: 0, passed: 0 })
  const [joinError, setJoinError] = useState('')

  const fetchData = async () => {
    try {
      const [classes, mine, subs] = await Promise.all([
        listClasses(),
        getStudentClasses(student.student_id),
        listSubmissions(student.student_id).catch(() => []),
      ])
      setAllClasses(classes)
      setMyClasses(mine)
      const passed = (subs || []).filter(s => s.quiz_results?.passed === s.quiz_results?.total).length
      setStats({ submissions: (subs || []).length, passed })
    } catch {}
  }

  useEffect(() => { fetchData() }, [])

  const handleJoin = async (classId) => {
    setJoinError('')
    try {
      await joinClass(classId, student.student_id)
      fetchData()
    } catch (e) { setJoinError(e.message) }
  }

  const myClassIds = new Set(myClasses.map(c => c.class_id))
  const availableClasses = allClasses.filter(c => !myClassIds.has(c.class_id))

  const tabs = useMemo(() => {
    const t = [
      { id: 'submit', label: 'Submit Work', icon: '↑' },
      { id: 'history', label: 'History', icon: '⟲' },
    ]
    if (availableClasses.length > 0 && myClasses.length > 0) t.push({ id: 'join', label: 'Join Classes', icon: '+' })
    return t
  }, [availableClasses.length, myClasses.length])

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          borderBottom: '1px solid var(--border)',
          padding: '14px 28px',
          background: 'rgba(6, 4, 15, 0.75)',
          backdropFilter: 'blur(28px) saturate(140%)',
          WebkitBackdropFilter: 'blur(28px) saturate(140%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Logo size={30} />
          <span className="badge badge-blue badge-dot">Student</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-pill" title="Submissions">
            <span>✓</span><strong><Counter value={stats.submissions} /></strong>
            <span style={{ color: 'var(--text-muted)' }}>submitted</span>
          </div>
          <div className="stat-pill" title="Perfect quizzes">
            <span style={{ color: 'var(--amber-bright)' }}>★</span>
            <strong><Counter value={stats.passed} /></strong>
            <span style={{ color: 'var(--text-muted)' }}>aced</span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-bright)', fontWeight: 500 }}>{student.name}</span>
          <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize: 12 }}>
            Sign out
          </button>
        </div>
      </motion.nav>

      <div className="page">
        {/* Class membership gate */}
        {myClasses.length === 0 ? (
          <EmptyClassCard
            availableClasses={availableClasses}
            onJoin={handleJoin}
            joinError={joinError}
          />
        ) : (
          <>
            {/* Class chips */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Enrolled in
              </span>
              {myClasses.map((c, i) => (
                <motion.span
                  key={c.class_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                  className="badge badge-blue"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                >
                  {c.name}
                </motion.span>
              ))}
              {availableClasses.length > 0 && <JoinDropdown classes={availableClasses} onJoin={handleJoin} />}
            </motion.div>

            {/* Tabs — animated sliding indicator */}
            <AnimatedTabs tabs={tabs} active={tab} onChange={setTab} />

            <div style={{ marginTop: 28 }}>
              <AnimatePresence mode="wait">
                {tab === 'submit' && (
                  <motion.div key="submit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                    <SubmitTab student={student} myClasses={myClasses} />
                  </motion.div>
                )}
                {tab === 'history' && (
                  <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                    <HistoryTab student={student} />
                  </motion.div>
                )}
                {tab === 'join' && (
                  <motion.div key="join" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                    <JoinClassesTab classes={availableClasses} onJoin={handleJoin} error={joinError} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Animated tab bar with sliding pill
   ============================================================ */
function AnimatedTabs({ tabs, active, onChange }) {
  return (
    <LayoutGroup>
      <div className="tab-bar" role="tablist">
        {tabs.map(t => {
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onChange(t.id)}
              style={{ position: 'relative' }}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-pill"
                  className="tab-indicator"
                  style={{ left: 6, right: 6, top: 6, bottom: 6, position: 'absolute' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1, marginRight: 8, opacity: 0.85 }}>{t.icon}</span>
              <span style={{ position: 'relative', zIndex: 1 }}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

/* ============================================================
   Empty-state welcome card
   ============================================================ */
function EmptyClassCard({ availableClasses, onJoin, joinError }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="card card-highlight"
      style={{ maxWidth: 640, margin: '48px auto', padding: 36, textAlign: 'center', position: 'relative' }}
    >
      <div style={{ fontSize: 46, marginBottom: 12, filter: 'drop-shadow(0 0 16px rgba(139,92,246,0.5))' }}>👋</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-bright)', marginBottom: 8 }}>
        Welcome to <span className="gradient-text">AI Guard</span>
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
        Join a class to start submitting work. Your professor will share a class code or invite you.
      </p>

      {availableClasses.length === 0 ? (
        <div style={{ padding: 20, borderRadius: 14, background: 'var(--bg-input)', border: '1px dashed var(--border)', color: 'var(--text-dim)', fontSize: 13 }}>
          No classes available yet — ask your professor to create one.
        </div>
      ) : (
        <div className="stack-sm" style={{ maxWidth: 440, margin: '0 auto' }}>
          {availableClasses.map((c, i) => (
            <motion.div
              key={c.class_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              style={{
                padding: '14px 18px', borderRadius: 12,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{c.name}</span>
              <MagneticButton className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}
                onClick={() => onJoin(c.class_id)}>
                Join →
              </MagneticButton>
            </motion.div>
          ))}
        </div>
      )}
      {joinError && <div style={{ color: 'var(--rose-bright)', fontSize: 13, marginTop: 12 }}>{joinError}</div>}
    </motion.div>
  )
}

function JoinDropdown({ classes, onJoin }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost"
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 12, padding: '4px 12px', borderRadius: 999,
          border: '1px dashed var(--border-strong)', color: 'var(--violet-bright)',
        }}
      >
        + Join more
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 10,
              marginTop: 6, minWidth: 220,
              background: 'var(--bg-card-solid)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--border-strong)',
              borderRadius: 12, padding: 6,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {classes.map(c => (
              <button key={c.class_id} className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13, padding: '8px 12px' }}
                onClick={() => { onJoin(c.class_id); setOpen(false) }}>
                {c.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function JoinClassesTab({ classes, onJoin, error }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 14 }}>Available Classes</h3>
      {error && <div style={{ color: 'var(--rose-bright)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <div className="stack-sm">
        {classes.map((c, i) => (
          <motion.div
            key={c.class_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{
              padding: '14px 18px', borderRadius: 12,
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: 14 }}>{c.name}</span>
            <MagneticButton className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}
              onClick={() => onJoin(c.class_id)}>
              Join Class →
            </MagneticButton>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   SUBMIT TAB
   ============================================================ */
function SubmitTab({ student, myClasses }) {
  const [step, setStep] = useState('upload')
  const [selectedClass, setSelectedClass] = useState('')
  const [assignments, setAssignments] = useState([])
  const [contextId, setContextId] = useState('')
  const [files, setFiles] = useState([])
  const [mode, setMode] = useState('quiz')
  const [error, setError] = useState('')
  const [submitResult, setSubmitResult] = useState(null)
  const [quizState, setQuizState] = useState(null)

  useEffect(() => {
    if (!selectedClass) { setAssignments([]); return }
    getClass(selectedClass).then(cls => {
      const entries = (cls.contexts || []).map(e => typeof e === 'string' ? e : e.context_id).filter(Boolean)
      if (entries.length > 0) {
        Promise.all(entries.map(cid =>
          fetch(`/api/context/${cid}`).then(r => r.json()).catch(() => null)
        )).then(r => setAssignments(r.filter(Boolean)))
      } else setAssignments([])
    }).catch(() => setAssignments([]))
  }, [selectedClass])

  const handleSubmit = async () => {
    if (!selectedClass) return setError('Select a class')
    if (!contextId) return setError('Select an assignment')
    if (files.length === 0) return setError('Upload your submission')
    setError('')
    setStep('loading')
    try {
      const res = await submitWork(contextId, files, mode, 3, student.student_id, selectedClass)
      setSubmitResult(res)
      setStep('results')
    } catch (e) {
      setError(e.message)
      setStep('upload')
    }
  }

  const startQuiz = () => {
    const questions = submitResult.quiz?.questions || []
    setQuizState({ questions, currentIndex: 0, answers: [], evaluations: [] })
    setStep('quiz')
  }

  const reset = () => {
    setStep('upload')
    setFiles([])
    setSubmitResult(null)
    setQuizState(null)
    setError('')
  }

  return (
    <div>
      <StepIndicator step={step} mode={mode} />

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <UploadForm
              myClasses={myClasses}
              selectedClass={selectedClass} setSelectedClass={setSelectedClass}
              assignments={assignments}
              contextId={contextId} setContextId={setContextId}
              files={files} setFiles={setFiles}
              mode={mode} setMode={setMode}
              error={error}
              onSubmit={handleSubmit}
            />
          </motion.div>
        )}
        {step === 'loading' && <LoadingStep key="loading" />}
        {step === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <ResultsStep result={submitResult} onStartQuiz={startQuiz} onViewSummary={() => setStep('summary')} onReset={reset} mode={mode} />
          </motion.div>
        )}
        {step === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <QuizStep
              quizState={quizState} setQuizState={setQuizState}
              contextId={contextId}
              submissionText={submitResult?.extracted_text || ''}
              onComplete={() => setStep('done')}
            />
          </motion.div>
        )}
        {step === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <SummaryStep summary={submitResult?.summary} onDone={() => setStep('done')} />
          </motion.div>
        )}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DoneStep quizState={quizState} onReset={reset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   STEP INDICATOR
   ============================================================ */
function StepIndicator({ step, mode }) {
  const steps = [
    { id: 'upload', label: 'Upload' },
    { id: 'analyzing', label: 'Analyzing', match: ['loading'] },
    { id: 'results', label: 'Results', match: ['results'] },
    { id: 'check', label: mode === 'summary' ? 'Summary' : 'Quiz', match: ['quiz', 'summary'] },
    { id: 'done', label: 'Done', match: ['done'] },
  ]
  const activeIdx = steps.findIndex(s => s.id === step || (s.match && s.match.includes(step)))
  return (
    <div className="step-indicator" style={{ flexWrap: 'wrap' }}>
      {steps.map((s, i) => {
        const active = i === activeIdx
        const done = i < activeIdx
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
              <span style={{
                width: 20, height: 20, borderRadius: 999,
                background: active ? 'var(--grad-primary)' : done ? 'var(--emerald)' : 'var(--bg-input)',
                border: active || done ? 'none' : '1px solid var(--border)',
                display: 'grid', placeItems: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
              }}>{done ? '✓' : i + 1}</span>
              {s.label}
            </div>
            {i < steps.length - 1 && <div className={`step-sep ${done ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   UPLOAD FORM
   ============================================================ */
function UploadForm({ myClasses, selectedClass, setSelectedClass, assignments, contextId, setContextId, files, setFiles, mode, setMode, error, onSubmit }) {
  const [dragOver, setDragOver] = useState(false)

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files || [])
    if (dropped.length) setFiles(dropped)
  }

  return (
    <div className="card card-hover" style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--grad-primary)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-bright)' }}>Submit your work</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drop your files below. We'll handle the rest.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div>
          <div className="label">Class</div>
          <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setContextId('') }}>
            <option value="">Select a class…</option>
            {myClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <div className="label">Assignment</div>
          <select value={contextId} onChange={e => setContextId(e.target.value)}>
            <option value="">Select an assignment…</option>
            {assignments.map(a => <option key={a.context_id} value={a.context_id}>{a.title}</option>)}
          </select>
          {selectedClass && assignments.length === 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 6 }}>
              No assignments linked to this class yet
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div className="label">Your submission</div>
        <label
          className={`upload-area ${files.length > 0 ? 'has-files' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={dragOver ? { borderColor: 'var(--violet-bright)', background: 'var(--violet-soft)', transform: 'scale(1.01)' } : {}}
        >
          <input type="file" multiple style={{ display: 'none' }}
            onChange={e => setFiles(Array.from(e.target.files))} />
          {files.length === 0 ? (
            <div>
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: 40, marginBottom: 10, filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.5))' }}
              >📄</motion.div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-bright)', marginBottom: 4 }}>
                Drop files here or click to browse
              </div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>PDF · Python · Java · C++ · plain text (up to 10 files)</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                {files.length} file{files.length > 1 ? 's' : ''} ready
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                {files.map(f => f.name).join(' · ')}
              </div>
            </div>
          )}
        </label>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div className="label">Verification mode</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { id: 'quiz', label: 'Quiz', desc: '4-option MCQ', icon: '❓' },
            { id: 'summary', label: 'Summary', desc: 'Reflection', icon: '📝' },
            { id: 'both', label: 'Both', desc: 'Quiz + summary', icon: '✨' },
          ].map(opt => (
            <motion.button
              key={opt.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode(opt.id)}
              style={{
                padding: 14, textAlign: 'left', borderRadius: 12,
                background: mode === opt.id ? 'var(--violet-soft)' : 'var(--bg-input)',
                border: `1px solid ${mode === opt.id ? 'var(--violet)' : 'var(--border)'}`,
                transition: 'all 200ms',
                cursor: 'pointer',
                boxShadow: mode === opt.id ? '0 0 0 3px rgba(139,92,246,0.15), 0 8px 24px rgba(139,92,246,0.15)' : 'none',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: mode === opt.id ? 'var(--violet-bright)' : 'var(--text-bright)' }}>{opt.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{opt.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            color: 'var(--rose-bright)', fontSize: 13, marginBottom: 14,
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--rose-soft)', border: '1px solid rgba(244,63,94,0.3)',
          }}
        >
          {error}
        </motion.div>
      )}

      <MagneticButton className="btn btn-primary" onClick={onSubmit} style={{ padding: '14px 28px', fontSize: 14 }}>
        <span>Run analysis</span>
        <span style={{ fontSize: 16 }}>→</span>
      </MagneticButton>
    </div>
  )
}

/* ============================================================
   LOADING
   ============================================================ */
function LoadingStep() {
  const phases = [
    { icon: '📖', text: 'Extracting text from files' },
    { icon: '🔍', text: 'Running 8-layer AI detection' },
    { icon: '✍', text: 'Analyzing writing style' },
    { icon: '❓', text: 'Generating comprehension questions' },
  ]
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setPhase(p => (p + 1) % phases.length), 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card"
      style={{ padding: '56px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 24px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #a855f7, #22d3ee, #ec4899, #fbbf24, #a855f7)',
            padding: 4,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
          }}
        />
        <div style={{
          position: 'absolute', inset: 18, borderRadius: '50%',
          background: 'var(--bg-card-solid)',
          display: 'grid', placeItems: 'center',
          boxShadow: 'inset 0 0 40px rgba(139,92,246,0.3)',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 30 }}
              transition={{ duration: 0.4 }}
              style={{ fontSize: 36 }}
            >{phases[phase].icon}</motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 8 }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {phases[phase].text}…
          </motion.span>
        </AnimatePresence>
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        This usually takes 5–15 seconds
      </div>

      <div className="loader-dots" style={{ justifyContent: 'center' }}>
        <span /><span /><span />
      </div>
    </motion.div>
  )
}

/* ============================================================
   RESULTS — AI gauge + confidence ring
   ============================================================ */
function ResultsStep({ result, onStartQuiz, onViewSummary, onReset, mode }) {
  const detection = result.ai_detection
  const hasQuiz = result.quiz?.questions?.length > 0
  const hasSummary = !!result.summary
  const prob = detection?.ai_probability ?? null

  return (
    <div className="stack">
      {/* Hero result strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="results-grid">
        {detection && <DetectionCard detection={detection} />}
        {result.confidence_score && <ConfidenceCard score={result.confidence_score} />}
      </div>

      {/* Style deviation (optional) */}
      {result.style_analysis && (
        <StyleCard analysis={result.style_analysis} />
      )}

      {/* Next step */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
        style={{
          border: '1px solid transparent',
          background: `
            linear-gradient(var(--bg-card-solid), var(--bg-card-solid)) padding-box,
            linear-gradient(135deg, rgba(139,92,246,0.6), rgba(34,211,238,0.4)) border-box
          `,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'var(--grad-success)',
            display: 'grid', placeItems: 'center', fontSize: 20,
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
          }}>✓</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>
              Comprehension check
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 14, lineHeight: 1.6 }}>
              {prob !== null && prob > 0.5
                ? 'Your submission was flagged — complete the check below to confirm your understanding.'
                : 'Show you understand what you submitted. This helps verify authorship.'}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {hasQuiz && (
                <MagneticButton className="btn btn-primary" onClick={onStartQuiz}>
                  Take quiz · {result.quiz.questions.length} question{result.quiz.questions.length > 1 ? 's' : ''}
                </MagneticButton>
              )}
              {hasSummary && (
                <button className="btn btn-secondary" onClick={onViewSummary}>View summary</button>
              )}
              <button className="btn btn-ghost" onClick={onReset}>Start over</button>
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 720px) { .results-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

function DetectionCard({ detection }) {
  const prob = detection.ai_probability ?? 0
  const color = prob > 0.7 ? '#f43f5e' : prob > 0.4 ? '#fbbf24' : '#10b981'
  const secondary = prob > 0.7 ? '#f472b6' : prob > 0.4 ? '#f59e0b' : '#22d3ee'
  const label = prob > 0.7 ? 'High risk' : prob > 0.4 ? 'Medium' : 'Low risk'
  const badgeClass = prob > 0.7 ? 'badge-red' : prob > 0.4 ? 'badge-yellow' : 'badge-green'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card"
      style={{ padding: 24, position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="label" style={{ margin: 0, fontSize: 10.5 }}>AI detection</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>8-layer heuristic model</div>
        </div>
        <span className={`badge ${badgeClass}`}>{label}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
        <div style={{ flex: '0 0 160px' }}>
          <AIGauge3D value={prob} height={160} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: "'Space Grotesk', sans-serif", color, lineHeight: 1 }}>
            <Counter value={prob * 100} decimals={0} suffix="%" />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 12 }}>AI probability</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{
              width: `${prob * 100}%`,
              background: `linear-gradient(90deg, ${color}, ${secondary})`,
              color,
            }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ConfidenceCard({ score }) {
  const conf = score.confidence ?? 0
  const level = score.level || 'low'
  const colorMap = {
    low: ['#10b981', '#22d3ee'],
    moderate: ['#fbbf24', '#f59e0b'],
    elevated: ['#fb923c', '#f43f5e'],
    high: ['#f43f5e', '#ec4899'],
  }
  const [c1, c2] = colorMap[level] || colorMap.low
  const badgeMap = { low: 'badge-green', moderate: 'badge-yellow', elevated: 'badge-orange', high: 'badge-red' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="card"
      style={{ padding: 24 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div className="label" style={{ margin: 0, fontSize: 10.5 }}>Overall confidence</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Weighted composite score</div>
        </div>
        <span className={`badge ${badgeMap[level] || 'badge-blue'}`}>{level}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 10 }}>
        <RingGauge value={conf} size={150} strokeWidth={12} color={c1} secondaryColor={c2} label="Likelihood" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MiniMetric label="AI probability" value={score.components?.ai_probability} color={c1} />
          <MiniMetric label="Style deviation" value={score.components?.style_deviation} color={c2} />
          <MiniMetric label="Time anomaly" value={score.components?.time_anomaly || 0} color="#fbbf24" />
        </div>
      </div>
    </motion.div>
  )
}

function MiniMetric({ label, value, color }) {
  const v = value || 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{(v * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(139,92,246,0.08)', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v * 100}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  )
}

function StyleCard({ analysis }) {
  if (!analysis) return null
  const dev = analysis.deviation_score ?? 0
  const color = dev > 0.7 ? '#f43f5e' : dev > 0.4 ? '#fbbf24' : '#10b981'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card"
      style={{ padding: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ fontSize: 20 }}>✍</div>
        <div className="label" style={{ margin: 0 }}>Writing style comparison</div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Compared against your historical writing profile
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif" }}>
          <Counter value={dev * 100} decimals={0} suffix="%" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${dev * 100}%`, background: color, color }} /></div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>deviation from baseline</div>
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================================
   QUIZ — MCQ with animated cards and confetti
   ============================================================ */
function QuizStep({ quizState, setQuizState, contextId, submissionText, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [wobble, setWobble] = useState(false)

  const { questions, currentIndex, evaluations } = quizState
  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const progress = (currentIndex / questions.length) * 100
  const options = current?.options || []

  const handleEvaluate = async () => {
    if (selected == null) return
    setEvaluating(true)
    setFeedback(null)
    try {
      const res = await evaluateAnswer(contextId, submissionText, current.question, selected)
      setFeedback(res)
      if (res.passed) burst({ origin: { y: 0.3 } })
      else { shake(); setWobble(true); setTimeout(() => setWobble(false), 600) }
      setQuizState(prev => ({ ...prev, evaluations: [...prev.evaluations, { ...res, chosenIndex: selected }] }))
    } catch (e) {
      setFeedback({ passed: false, score: 0, feedback: e.message, correct_index: -1, chosen_index: selected })
    } finally {
      setEvaluating(false)
    }
  }

  const handleNext = () => {
    setSelected(null)
    setFeedback(null)
    if (isLast) onComplete()
    else setQuizState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }))
  }

  return (
    <div className="stack">
      {/* progress header */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-blue">Q{currentIndex + 1} / {questions.length}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Answer carefully — these verify comprehension
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
            <Counter value={evaluations.filter(e => e.passed).length} /> / {evaluations.length || 0} passed so far
          </div>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: 'var(--grad-primary)', color: '#a855f7' }}
          />
        </div>
      </div>

      {/* question card */}
      <motion.div
        key={currentIndex}
        animate={wobble ? { x: [0, -10, 10, -8, 8, -4, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="card"
        style={{ padding: 32 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: 'var(--grad-primary)',
            display: 'grid', placeItems: 'center',
            fontWeight: 800, fontSize: 16, color: '#fff',
            boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
          }}>{currentIndex + 1}</div>
          <div style={{
            fontSize: 17, fontWeight: 500, color: 'var(--text-bright)', lineHeight: 1.6,
            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          }}>
            {current?.question || current?.formatted || 'Loading…'}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!feedback ? (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="stack-sm">
                {options.map((opt, i) => {
                  const isSelected = selected === i
                  return (
                    <motion.label
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{ x: 4 }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16,
                        borderRadius: 12, cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--violet-bright)' : 'var(--border)'}`,
                        background: isSelected ? 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(34,211,238,0.08))' : 'var(--bg-input)',
                        transition: 'all 200ms',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: isSelected ? '0 0 0 3px rgba(139,92,246,0.18), 0 8px 24px rgba(139,92,246,0.15)' : 'none',
                      }}
                    >
                      <input type="radio" name="mcq" checked={isSelected}
                        onChange={() => setSelected(i)}
                        style={{ display: 'none' }} />
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: isSelected ? 'var(--grad-primary)' : 'rgba(139,92,246,0.08)',
                        border: isSelected ? 'none' : '1px solid var(--border)',
                        display: 'grid', placeItems: 'center',
                        fontSize: 12, fontWeight: 800,
                        color: isSelected ? '#fff' : 'var(--text-muted)',
                        transition: 'all 200ms',
                      }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span style={{ flex: 1, fontSize: 14.5, color: 'var(--text-bright)', lineHeight: 1.55, paddingTop: 4 }}>
                        {opt}
                      </span>
                    </motion.label>
                  )
                })}
              </div>

              <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
                <MagneticButton className="btn btn-primary" onClick={handleEvaluate} disabled={evaluating || selected == null}>
                  {evaluating ? (<><div className="spinner" style={{ width: 14, height: 14 }} />Checking…</>) : 'Submit answer'}
                </MagneticButton>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div style={{
                padding: 18, borderRadius: 14,
                background: feedback.passed
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(34,211,238,0.08))'
                  : 'linear-gradient(135deg, rgba(244,63,94,0.14), rgba(236,72,153,0.08))',
                border: `1px solid ${feedback.passed ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: feedback.passed ? 'var(--grad-success)' : 'var(--grad-danger)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 14, fontWeight: 800, color: '#fff',
                  }}>{feedback.passed ? '✓' : '✗'}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: feedback.passed ? 'var(--emerald-bright)' : 'var(--rose-bright)' }}>
                    {feedback.passed ? 'Correct!' : 'Not quite'}
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)' }}>
                    Score: <strong style={{ color: 'var(--text-bright)' }}>{(feedback.score * 100).toFixed(0)}%</strong>
                  </span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {feedback.feedback}
                </div>
              </div>
              <MagneticButton className="btn btn-primary" onClick={handleNext}>
                {isLast ? 'Finish quiz →' : 'Next question →'}
              </MagneticButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* ============================================================
   SUMMARY
   ============================================================ */
function SummaryStep({ summary, onDone }) {
  return (
    <div className="stack">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ padding: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-bright)' }}>Submission summary</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Review what we read — this verifies your understanding</p>
          </div>
          <span className="badge badge-cyan">Comprehension review</span>
        </div>
        <div style={{
          fontSize: 14.5, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap',
          padding: 18, borderRadius: 12,
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
        }}>
          {summary || 'No summary available.'}
        </div>
      </motion.div>
      <MagneticButton className="btn btn-primary" onClick={onDone} style={{ alignSelf: 'flex-start' }}>
        I've read the summary →
      </MagneticButton>
    </div>
  )
}

/* ============================================================
   DONE — celebration
   ============================================================ */
function DoneStep({ quizState, onReset }) {
  const evals = quizState?.evaluations || []
  const passed = evals.filter(e => e.passed).length
  const total = evals.length
  const allPassed = total > 0 && passed === total
  const score = total > 0 ? passed / total : 1

  useEffect(() => {
    if (allPassed) fireworks(2500)
    else if (total > 0) burst({ origin: { y: 0.4 } })
    else cannons()
  }, [allPassed, total])

  return (
    <div style={{ textAlign: 'center', padding: '40px 0 0', position: 'relative' }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Trophy3D celebrate={allPassed} height={220} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={allPassed ? 'gradient-text-warm' : 'gradient-text-cool'}
        style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}
      >
        {allPassed ? 'Comprehension verified!' : total > 0 ? 'Partially verified' : 'Summary reviewed'}
      </motion.h2>

      {total > 0 ? (
        <>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 24 }}
          >
            You passed <strong style={{ color: 'var(--text-bright)' }}>{passed}</strong> of <strong style={{ color: 'var(--text-bright)' }}>{total}</strong> question{total > 1 ? 's' : ''}
          </motion.p>

          <div style={{ maxWidth: 600, margin: '0 auto 28px' }}>
            <RingGauge
              value={score}
              size={160}
              strokeWidth={14}
              color={allPassed ? '#fbbf24' : '#a855f7'}
              secondaryColor={allPassed ? '#f472b6' : '#22d3ee'}
              label={allPassed ? 'Perfect' : 'Passed'}
            />
          </div>

          <div style={{ maxWidth: 520, margin: '0 auto 32px', textAlign: 'left' }}>
            <div className="stack-sm">
              {evals.map((ev, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.08 }}
                  className="card"
                  style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: ev.passed ? 'var(--grad-success)' : 'var(--grad-danger)',
                    display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 14,
                    flexShrink: 0,
                  }}>{ev.passed ? '✓' : '✗'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--text-bright)', fontWeight: 600 }}>Question {i + 1}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                      {ev.passed ? 'Correct answer' : 'Incorrect'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: ev.passed ? 'var(--emerald-bright)' : 'var(--rose-bright)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {(ev.score * 100).toFixed(0)}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28 }}>
          Nice work reading through — your submission is recorded
        </p>
      )}

      <MagneticButton className="btn btn-primary" onClick={onReset} style={{ fontSize: 14, padding: '14px 28px' }}>
        Submit another →
      </MagneticButton>
    </div>
  )
}

/* ============================================================
   HISTORY TAB
   ============================================================ */
function HistoryTab({ student }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSubmissions(student.student_id)
      .then(setSubmissions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <div className="loader-dots" style={{ justifyContent: 'center' }}><span /><span /><span /></div>
    </div>
  )

  if (submissions.length === 0) return (
    <div className="card" style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 42, marginBottom: 12, filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.4))' }}>📚</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 6 }}>No submissions yet</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>
        Submit your first assignment to see it appear here
      </div>
    </div>
  )

  // aggregate stats
  const total = submissions.length
  const avgAI = submissions.reduce((acc, s) => acc + (s.ai_detection?.ai_probability || 0), 0) / total
  const perfectQuizzes = submissions.filter(s => s.quiz_results?.passed === s.quiz_results?.total && s.quiz_results?.total > 0).length

  return (
    <div className="stack">
      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="stats-grid">
        <StatTile icon="📊" label="Total submissions" value={total} color="#a855f7" />
        <StatTile icon="🤖" label="Avg AI probability" value={avgAI * 100} suffix="%" decimals={0} color="#22d3ee" />
        <StatTile icon="🏆" label="Perfect quizzes" value={perfectQuizzes} color="#fbbf24" />
      </div>

      {/* Timeline */}
      <div className="stack-sm">
        {submissions.map((s, i) => <SubmissionCard key={s.submission_id} s={s} index={i} />)}
      </div>

      <style>{`
        @media (max-width: 720px) { .stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

function StatTile({ icon, label, value, suffix = '', decimals = 0, color }) {
  return (
    <TiltCard
      className="card"
      max={5}
      style={{ padding: 20, borderRadius: 16, position: 'relative', overflow: 'hidden' }}
    >
      <div aria-hidden style={{
        position: 'absolute', top: -20, right: -20, width: 100, height: 100,
        borderRadius: '50%', background: `radial-gradient(circle, ${color}33, transparent 70%)`,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{
        fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
        fontFamily: "'Space Grotesk', sans-serif",
        color: 'var(--text-bright)', lineHeight: 1,
      }}>
        <Counter value={value} decimals={decimals} suffix={suffix} />
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
    </TiltCard>
  )
}

function SubmissionCard({ s, index }) {
  const ai = s.ai_detection?.ai_probability ?? 0
  const conf = s.confidence_score?.confidence ?? null
  const quiz = s.quiz_results

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ x: 4 }}
      className="card card-hover"
      style={{ padding: 18 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: 14.5, marginBottom: 2 }}>
            {s.context_title || 'Assignment'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {new Date(s.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
        {s.class_name && <span className="badge badge-blue">{s.class_name}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {s.ai_detection && (
          <span className={`badge ${ai > 0.7 ? 'badge-red' : ai > 0.4 ? 'badge-yellow' : 'badge-green'}`}>
            AI · {(ai * 100).toFixed(0)}%
          </span>
        )}
        {conf !== null && (
          <span className={`badge ${conf > 0.65 ? 'badge-red' : conf > 0.45 ? 'badge-orange' : conf > 0.25 ? 'badge-yellow' : 'badge-green'}`}>
            Confidence · {(conf * 100).toFixed(0)}%
          </span>
        )}
        {quiz && (
          <span className={`badge ${quiz.passed === quiz.total ? 'badge-green' : 'badge-yellow'}`}>
            Quiz · {quiz.passed}/{quiz.total}
          </span>
        )}
      </div>
    </motion.div>
  )
}
