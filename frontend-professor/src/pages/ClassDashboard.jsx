import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  getClass, getClassStudents, getClassSubmissions, listContexts,
  createContext, addContextToClass, analyzeSubmission,
  updateStyle, getStyleProfile, compareStyle, listSubmissions,
  updateContextSettings,
} from '../api'
import ParticleField from '../three/ParticleField'
import AIGauge3D from '../three/AIGauge3D'
import Logo from '../components/Logo'
import Counter from '../components/Counter'
import RingGauge from '../components/RingGauge'
import MagneticButton from '../components/MagneticButton'
import TiltCard from '../components/TiltCard'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] } }),
}

const TABS = [
  { id: 'assignments', label: 'Assignments', icon: IconBook },
  { id: 'students', label: 'Students', icon: IconUsers },
  { id: 'submissions', label: 'Submissions', icon: IconInbox },
  { id: 'analyze', label: 'Analyze', icon: IconScan },
  { id: 'style', label: 'Style Profiles', icon: IconWave },
]

export default function ClassDashboard({ classId, onBack }) {
  const [cls, setCls] = useState(null)
  const [students, setStudents] = useState([])
  const [allContexts, setAllContexts] = useState([])
  const [tab, setTab] = useState('assignments')

  const fetchData = async () => {
    try {
      const [c, s, ctx] = await Promise.all([
        getClass(classId), getClassStudents(classId), listContexts(),
      ])
      setCls(c); setStudents(s); setAllContexts(ctx)
    } catch {}
  }

  useEffect(() => { fetchData() }, [classId])

  if (!cls) return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  const contextEntries = (cls.contexts || []).map(entry =>
    typeof entry === 'string' ? { context_id: entry, skip_detection: false } : entry
  )
  const contextIds = new Set(contextEntries.map(e => e.context_id))
  const classContexts = allContexts
    .filter(c => contextIds.has(c.context_id))
    .map(c => {
      const entry = contextEntries.find(e => e.context_id === c.context_id)
      return { ...c, skip_detection: entry?.skip_detection || false }
    })

  return (
    <div className="pro-dash-shell">
      <div className="aurora" aria-hidden />
      <div className="noise" aria-hidden />
      <ParticleField />

      {/* Top nav */}
      <motion.nav
        className="pro-dash-nav"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <button className="pro-dash-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Classes
        </button>
        <Logo size={28} animated={false} />
        <span className="badge badge-cyan">Professor</span>
        <div className="pro-dash-title" style={{ marginLeft: 'auto' }}>{cls.name}</div>
      </motion.nav>

      <div className="pro-dash-body">
        {/* Header */}
        <motion.div
          className="pro-dash-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              <span className="eyebrow-dot" /> Live integrity console
            </div>
            <div className="pro-dash-heading">
              <span className="grad-text">{cls.name}</span>
            </div>
            <div className="pro-dash-subline">
              {students.length} students · {classContexts.length} assignments · class id <span className="muted-mono">{classId}</span>
            </div>
          </div>
        </motion.div>

        {/* Metrics row */}
        <div className="pro-metric-grid">
          <StatTile label="Students enrolled" value={students.length} accent="cyan" />
          <StatTile label="Assignments linked" value={classContexts.length} accent="amber" />
          <StatTile label="Detection enabled" value={classContexts.filter(c => !c.skip_detection).length} accent="emerald" />
          <StatTile label="Quiz-only mode" value={classContexts.filter(c => c.skip_detection).length} accent="violet" />
        </div>

        {/* Tabs */}
        <div className="pro-tabs-row">
          <LayoutGroup id="pro-tabs">
            <div className="tab-bar" role="tablist">
              {TABS.map(t => {
                const active = tab === t.id
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    className={`pro-dash-tab ${active ? 'active' : ''}`}
                    onClick={() => setTab(t.id)}
                  >
                    {active && (
                      <motion.div
                        layoutId="pro-tab-indicator"
                        className="tab-indicator"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        style={{ inset: 0, position: 'absolute' }}
                      />
                    )}
                    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, zIndex: 1 }}>
                      <Icon />
                      {t.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </LayoutGroup>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'assignments' && (
              <AssignmentsTab cls={cls} classContexts={classContexts} allContexts={allContexts} classId={classId} onRefresh={fetchData} />
            )}
            {tab === 'students' && (
              <StudentsTab students={students} classId={classId} classContexts={classContexts} />
            )}
            {tab === 'submissions' && (
              <SubmissionsTab classId={classId} classContexts={classContexts} students={students} />
            )}
            {tab === 'analyze' && (
              <AnalyzeTab classContexts={classContexts} students={students} />
            )}
            {tab === 'style' && (
              <StyleTab students={students} classContexts={classContexts} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* =========================================================
   STAT TILES
   ========================================================= */
function StatTile({ label, value, accent = 'cyan' }) {
  const colors = {
    cyan: 'var(--cyan-bright)',
    amber: 'var(--amber-bright)',
    violet: 'var(--violet-bright)',
    emerald: 'var(--emerald-bright)',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="pro-metric"
      style={{ '--tile-accent': colors[accent] }}
    >
      <div className="pro-metric-lbl" style={{ color: colors[accent] }}>{label}</div>
      <div className="pro-metric-val">
        <Counter value={value} />
      </div>
    </motion.div>
  )
}

/* =========================================================
   ASSIGNMENTS TAB
   ========================================================= */
function AssignmentsTab({ cls, classContexts, allContexts, classId, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkContextId, setLinkContextId] = useState('')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()

  const linkedIds = new Set(classContexts.map(c => c.context_id))
  const unlinked = allContexts.filter(c => !linkedIds.has(c.context_id))

  const handleCreate = async () => {
    if (!title.trim() || files.length === 0) return setError('Title and files required')
    setLoading(true); setError('')
    try {
      const res = await createContext(title, files)
      await addContextToClass(classId, res.context_id)
      setTitle(''); setFiles([]); setShowCreate(false)
      onRefresh()
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  const handleLink = async () => {
    if (!linkContextId) return
    try { await addContextToClass(classId, linkContextId); setLinkContextId(''); onRefresh() } catch {}
  }

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) setFiles(dropped)
  }

  return (
    <div>
      <div className="pro-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="pro-section-title">Assignments in this class</div>
            <div className="pro-section-sub">Create a new spec or link one you've already uploaded.</div>
          </div>
          <MagneticButton
            onClick={() => setShowCreate(v => !v)}
            className={`btn ${showCreate ? 'btn-ghost' : 'btn-primary'}`}
          >
            {showCreate ? 'Cancel' : '+ New assignment'}
          </MagneticButton>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="stack" style={{ padding: '4px 2px' }}>
                <div>
                  <div className="label">Assignment title</div>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Homework 3 — Sorting Algorithms" />
                </div>
                <div>
                  <div className="label">Spec files</div>
                  <div
                    className={`pro-drop ${drag ? 'active' : ''}`}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDrag(true) }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={onDrop}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => setFiles(Array.from(e.target.files))}
                      accept=".pdf,.py,.js,.java,.cpp,.c,.txt,.md"
                    />
                    <div className="pro-drop-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="pro-drop-title">
                      {files.length === 0 ? 'Drop spec files here' : `${files.length} file${files.length !== 1 ? 's' : ''} selected`}
                    </div>
                    <div className="pro-drop-sub">PDF, code, text · up to 10 files</div>
                  </div>
                  {files.length > 0 && (
                    <div className="pro-files">
                      {files.map(f => (
                        <span key={f.name} className="pro-file-chip">
                          <span className="chip-dot chip-dot-cyan" /> {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {error && <div style={{ color: 'var(--rose-bright)', fontSize: 13 }}>{error}</div>}
                <div>
                  <MagneticButton onClick={handleCreate} disabled={loading}>
                    {loading ? 'Creating…' : 'Create & link to class'}
                  </MagneticButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {unlinked.length > 0 && (
        <div className="pro-section">
          <div className="pro-section-title">Link existing assignment</div>
          <div className="pro-section-sub">These assignments exist in the system but aren't linked to this class yet.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={linkContextId} onChange={e => setLinkContextId(e.target.value)} style={{ flex: 1 }}>
              <option value="">Choose an assignment…</option>
              {unlinked.map(c => <option key={c.context_id} value={c.context_id}>{c.title}</option>)}
            </select>
            <MagneticButton onClick={handleLink} disabled={!linkContextId} className="btn btn-primary">Link</MagneticButton>
          </div>
        </div>
      )}

      {classContexts.length === 0 ? (
        <EmptyPanel title="No assignments linked" sub="Create a new one above or link an existing spec." />
      ) : (
        <div>
          {classContexts.map((ctx, i) => (
            <AssignmentRow key={ctx.context_id} ctx={ctx} classId={classId} onRefresh={onRefresh} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function AssignmentRow({ ctx, classId, onRefresh, index }) {
  const [toggling, setToggling] = useState(false)
  const handleToggle = async () => {
    setToggling(true)
    try { await updateContextSettings(classId, ctx.context_id, !ctx.skip_detection); onRefresh() } catch {} finally { setToggling(false) }
  }
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="pro-row"
    >
      <div className="pro-row-glyph amber">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      </div>
      <div>
        <div className="pro-row-title">{ctx.title}</div>
        <div className="pro-row-sub">{ctx.context_id}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
          color: ctx.skip_detection ? 'var(--amber-bright)' : 'var(--text-dim)', cursor: 'pointer',
        }}>
          <input type="checkbox" checked={ctx.skip_detection} onChange={handleToggle} disabled={toggling}
            style={{ width: 'auto', accentColor: 'var(--amber-bright)' }} />
          Skip AI detection
        </label>
        <span className={`badge ${ctx.skip_detection ? 'badge-yellow' : 'badge-green'}`}>
          {ctx.skip_detection ? 'Quiz only' : 'Active'}
        </span>
      </div>
    </motion.div>
  )
}

/* =========================================================
   STUDENTS TAB
   ========================================================= */
function StudentsTab({ students, classId, classContexts }) {
  const [expandedId, setExpandedId] = useState(null)

  if (students.length === 0) {
    return <EmptyPanel title="No students enrolled" sub="Share the class id so students can join from their portal." />
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
        {students.length} student{students.length !== 1 ? 's' : ''} enrolled — click to view submissions per assignment
      </div>
      {students.map((s, i) => (
        <StudentRow
          key={s.student_id}
          student={s}
          index={i}
          classId={classId}
          classContexts={classContexts}
          expanded={expandedId === s.student_id}
          onToggle={() => setExpandedId(expandedId === s.student_id ? null : s.student_id)}
        />
      ))}
    </div>
  )
}

function StudentRow({ student, index, classId, classContexts, expanded, onToggle }) {
  const [subs, setSubs] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!expanded || subs !== null) return
    setLoading(true)
    listSubmissions(classId, student.student_id)
      .then(setSubs).catch(() => setSubs([])).finally(() => setLoading(false))
  }, [expanded])

  const byAssignment = {}
  ;(subs || []).forEach(s => {
    const key = s.context_id || 'unknown'
    if (!byAssignment[key]) byAssignment[key] = []
    byAssignment[key].push(s)
  })

  let totalPassed = 0, totalQuestions = 0, attemptCount = 0, aiSum = 0, aiCount = 0
  ;(subs || []).forEach(s => {
    if (s.quiz_results?.total != null) {
      totalPassed += s.quiz_results.passed || 0
      totalQuestions += s.quiz_results.total || 0
      attemptCount += 1
    }
    if (s.ai_detection?.ai_probability != null) {
      aiSum += s.ai_detection.ai_probability
      aiCount += 1
    }
  })
  const avgAi = aiCount > 0 ? aiSum / aiCount : null

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      style={{ marginBottom: 8 }}
    >
      <div className="pro-row expandable" onClick={onToggle}>
        <div className="pro-row-glyph violet" style={{ fontWeight: 800, fontSize: 15 }}>
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="pro-row-title">{student.name}</div>
          <div className="pro-row-sub">{student.student_id}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {subs && subs.length > 0 && totalQuestions > 0 && (
            <span className={`ai-pill ${totalPassed === totalQuestions ? 'low' : totalPassed >= totalQuestions * 0.6 ? 'mid' : 'high'}`}>
              Quiz {totalPassed}/{totalQuestions}
            </span>
          )}
          {avgAi != null && (
            <span className={`ai-pill ${avgAi > 0.7 ? 'high' : avgAi > 0.4 ? 'mid' : 'low'}`}>
              AI {(avgAi * 100).toFixed(0)}%
            </span>
          )}
          {subs && (
            <span className="badge badge-cyan">{subs.length} sub{subs.length !== 1 ? 's' : ''}</span>
          )}
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ color: 'var(--text-dim)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="exp"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '10px 6px 0' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : !subs || subs.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 12 }}>No submissions yet from this student.</div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {attemptCount} quiz attempt{attemptCount !== 1 ? 's' : ''} · {totalPassed}/{totalQuestions} total correct
                  </div>
                  {Object.entries(byAssignment).map(([ctxId, attempts]) => {
                    const title = classContexts.find(c => c.context_id === ctxId)?.title
                      || attempts[0].context_title || 'Unknown assignment'
                    let aPassed = 0, aTotal = 0
                    attempts.forEach(a => {
                      if (a.quiz_results?.total != null) {
                        aPassed += a.quiz_results.passed || 0
                        aTotal += a.quiz_results.total || 0
                      }
                    })
                    return (
                      <div key={ctxId} className="pro-collapse" style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-bright)', fontFamily: "'Space Grotesk',sans-serif" }}>{title}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {aTotal > 0 && (
                              <span className={`ai-pill ${aPassed === aTotal ? 'low' : aPassed >= aTotal * 0.6 ? 'mid' : 'high'}`}>
                                {aPassed}/{aTotal}
                              </span>
                            )}
                            <span className="badge badge-cyan">{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        {attempts.map((a, i) => {
                          const ai = a.ai_detection?.ai_probability
                          const conf = a.confidence_score?.confidence
                          const level = a.confidence_score?.level
                          const quiz = a.quiz_results
                          return (
                            <div key={a.submission_id} style={{
                              fontSize: 12, padding: '10px 12px', marginBottom: 6,
                              background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Attempt {i + 1}</span>
                                <span style={{ color: 'var(--text-dim)' }}>{new Date(a.timestamp).toLocaleString()}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {ai != null && <span className={`ai-pill ${ai > 0.7 ? 'high' : ai > 0.4 ? 'mid' : 'low'}`}>AI {(ai * 100).toFixed(0)}%</span>}
                                {conf != null && (
                                  <span className={`ai-pill ${level === 'high' ? 'high' : level === 'elevated' ? 'mid' : level === 'moderate' ? 'mid' : 'low'}`}>
                                    Conf {(conf * 100).toFixed(0)}%
                                  </span>
                                )}
                                {quiz?.total != null && (
                                  <span className={`ai-pill ${quiz.passed === quiz.total ? 'low' : 'mid'}`}>
                                    Quiz {quiz.passed}/{quiz.total}
                                  </span>
                                )}
                                {a.style_analysis?.style_deviation_score != null && (
                                  <span className={`ai-pill ${a.style_analysis.style_deviation_score > 0.6 ? 'high' : a.style_analysis.style_deviation_score > 0.3 ? 'mid' : 'low'}`}>
                                    Style dev {(a.style_analysis.style_deviation_score * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* =========================================================
   SUBMISSIONS TAB
   ========================================================= */
function SubmissionsTab({ classId, classContexts, students }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterContext, setFilterContext] = useState('')

  useEffect(() => {
    setLoading(true)
    getClassSubmissions(classId, filterContext || undefined)
      .then(setSubmissions).catch(() => setSubmissions([])).finally(() => setLoading(false))
  }, [classId, filterContext])

  const studentMap = Object.fromEntries(students.map(s => [s.student_id, s.name]))

  return (
    <div>
      <div className="pro-section" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Filter</div>
        <select value={filterContext} onChange={e => setFilterContext(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
          <option value="">All assignments</option>
          {classContexts.map(c => <option key={c.context_id} value={c.context_id}>{c.title}</option>)}
        </select>
        <span className="badge badge-cyan">{submissions.length} total</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : submissions.length === 0 ? (
        <EmptyPanel title="No submissions" sub="Submissions will appear here as students turn in their work." />
      ) : (
        <div>
          {submissions.map((s, i) => {
            const ai = s.ai_detection?.ai_probability
            const conf = s.confidence_score?.confidence
            const level = s.confidence_score?.level
            const quiz = s.quiz_results
            return (
              <motion.div
                key={s.submission_id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="pro-row"
              >
                <div className="pro-row-glyph cyan" style={{ fontWeight: 800, fontSize: 14 }}>
                  {(studentMap[s.student_id] || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="pro-row-title">{studentMap[s.student_id] || s.student_name || s.student_id}</div>
                  <div className="pro-row-sub">{s.context_title || 'Unknown assignment'} · {new Date(s.timestamp).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {ai != null && <span className={`ai-pill ${ai > 0.7 ? 'high' : ai > 0.4 ? 'mid' : 'low'}`}>AI {(ai * 100).toFixed(0)}%</span>}
                  {conf != null && (
                    <span className={`ai-pill ${level === 'high' ? 'high' : level === 'elevated' || level === 'moderate' ? 'mid' : 'low'}`}>
                      Conf {(conf * 100).toFixed(0)}%
                    </span>
                  )}
                  {s.style_analysis?.style_deviation_score != null && (
                    <span className={`ai-pill ${s.style_analysis.style_deviation_score > 0.6 ? 'high' : s.style_analysis.style_deviation_score > 0.3 ? 'mid' : 'low'}`}>
                      Style {(s.style_analysis.style_deviation_score * 100).toFixed(0)}%
                    </span>
                  )}
                  {quiz && (
                    <span className={`ai-pill ${quiz.passed === quiz.total ? 'low' : 'mid'}`}>
                      Quiz {quiz.passed}/{quiz.total}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   ANALYZE TAB
   ========================================================= */
function AnalyzeTab({ classContexts, students }) {
  const [contextId, setContextId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()

  const handleAnalyze = async () => {
    if (!contextId) return setError('Select an assignment')
    if (files.length === 0) return setError('Upload submission files')
    setError(''); setResult(null); setLoading(true)
    try { setResult(await analyzeSubmission(contextId, files, studentId || null)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) setFiles(dropped)
  }

  const prob = result?.ai_probability ?? 0
  const level = prob > 0.7 ? 'high' : prob > 0.4 ? 'mid' : 'low'

  return (
    <div>
      <div className="pro-grid-2">
        <div className="pro-section">
          <div className="pro-section-title">Run forensic detection</div>
          <div className="pro-section-sub">Upload a student submission to run the 8-layer AI detection pipeline against the assignment spec.</div>

          <div className="stack">
            <div>
              <div className="label">Assignment</div>
              <select value={contextId} onChange={e => setContextId(e.target.value)}>
                <option value="">Select an assignment…</option>
                {classContexts.map(c => <option key={c.context_id} value={c.context_id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Student (optional — enables style-aware detection)</div>
              <select value={studentId} onChange={e => setStudentId(e.target.value)}>
                <option value="">No student selected</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Submission files</div>
              <div
                className={`pro-drop ${drag ? 'active' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
              >
                <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
                <div className="pro-drop-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="pro-drop-title">
                  {files.length === 0 ? 'Drop submission files' : `${files.length} file${files.length !== 1 ? 's' : ''} ready`}
                </div>
                <div className="pro-drop-sub">PDF, code, text, markdown</div>
              </div>
              {files.length > 0 && (
                <div className="pro-files">
                  {files.map(f => (<span key={f.name} className="pro-file-chip"><span className="chip-dot chip-dot-cyan" />{f.name}</span>))}
                </div>
              )}
            </div>
            {error && <div style={{ color: 'var(--rose-bright)', fontSize: 13 }}>{error}</div>}
            <MagneticButton onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyzing…' : 'Run AI detection'}
            </MagneticButton>
          </div>
        </div>

        <div className="pro-section" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="pro-section-title">Live AI probability</div>
          <div className="pro-section-sub">Real-time gauge updates with each analysis — rings reflect detected risk level.</div>
          <div className="pro-gauge-box" style={{ flex: 1, minHeight: 260, display: 'grid', placeItems: 'center' }}>
            {loading ? (
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Running 8-layer detection…</div>
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <AIGauge3D value={prob} height={240} />
                <div style={{ textAlign: 'center', marginTop: 6 }}>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 32, fontWeight: 800,
                    letterSpacing: '-0.03em',
                    background: level === 'high' ? 'linear-gradient(135deg, #f43f5e, #f472b6)' : level === 'mid' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #34d399, #22d3ee)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    <Counter value={prob * 100} decimals={0} suffix="%" />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    AI probability · {level === 'high' ? 'High risk' : level === 'mid' ? 'Moderate' : 'Low'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="progress-bar" style={{ marginTop: 8, marginBottom: 16 }}>
            <div className="progress-fill" style={{
              width: `${prob * 100}%`,
              background: level === 'high' ? 'linear-gradient(90deg, #f43f5e, #f472b6)' : level === 'mid' ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #34d399, #22d3ee)',
            }} />
          </div>
          <div className="pro-grid-2">
            <SignalCard title="AI signals found" signals={result.ai_signals_found} tone="high" />
            <SignalCard title="Human signals found" signals={result.human_signals_found} tone="low" />
          </div>
          <div className="pro-section">
            <div className="pro-section-title">Detailed assessment</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {result.ai_assessment}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function SignalCard({ title, signals, tone }) {
  const color = tone === 'high' ? 'var(--rose-bright)' : 'var(--emerald-bright)'
  const soft = tone === 'high' ? 'var(--rose-soft)' : 'var(--emerald-soft)'
  return (
    <div className="pro-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="pro-section-title" style={{ margin: 0 }}>{title}</div>
        <span className={`ai-pill ${tone === 'high' ? 'high' : 'low'}`}>{signals?.length || 0}</span>
      </div>
      {signals?.length > 0 ? (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0 }}>
          {signals.map((s, i) => (
            <li key={i} style={{
              fontSize: 13, color: 'var(--text)', padding: '9px 13px',
              background: soft, borderRadius: 10, borderLeft: `3px solid ${color}`,
              lineHeight: 1.55,
            }}>{s}</li>
          ))}
        </ul>
      ) : (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>None detected</div>
      )}
    </div>
  )
}

/* =========================================================
   STYLE TAB
   ========================================================= */
function StyleTab({ students, classContexts }) {
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedContext, setSelectedContext] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [mode, setMode] = useState('upload')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    if (!selectedStudent) { setProfile(null); return }
    setProfileLoading(true)
    getStyleProfile(selectedStudent).then(setProfile).catch(() => setProfile(null)).finally(() => setProfileLoading(false))
  }, [selectedStudent, result])

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) setFiles(dropped)
  }

  const handle = async (fn) => {
    if (!selectedStudent) return setError('Select a student')
    if (!selectedContext) return setError('Select an assignment')
    if (files.length === 0) return setError('Upload files')
    setError(''); setResult(null); setLoading(true)
    try { setResult(await fn(selectedStudent, selectedContext, files)); setFiles([]) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="pro-grid-2">
      <div>
        <div className="pro-section">
          <div className="pro-section-title">Writing style fingerprinting</div>
          <div className="pro-section-sub">Upload previous work to build a profile, or compare a new submission against the baseline.</div>

          <LayoutGroup id="style-mode">
            <div className="tab-bar" style={{ marginBottom: 16 }}>
              {['upload', 'compare'].map(m => {
                const active = mode === m
                return (
                  <button
                    key={m}
                    className={`pro-dash-tab ${active ? 'active' : ''}`}
                    onClick={() => { setMode(m); setResult(null) }}
                  >
                    {active && (
                      <motion.div layoutId="style-mode-indicator" className="tab-indicator" transition={{ type: 'spring', stiffness: 380, damping: 30 }} style={{ inset: 0, position: 'absolute' }} />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>
                      {m === 'upload' ? 'Build profile' : 'Compare submission'}
                    </span>
                  </button>
                )
              })}
            </div>
          </LayoutGroup>

          <div className="stack">
            <div>
              <div className="label">Student</div>
              <select value={selectedStudent} onChange={e => { setSelectedStudent(e.target.value); setResult(null) }}>
                <option value="">Select a student…</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Assignment (for context)</div>
              <select value={selectedContext} onChange={e => setSelectedContext(e.target.value)}>
                <option value="">Select an assignment…</option>
                {classContexts.map(c => <option key={c.context_id} value={c.context_id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <div className="label">{mode === 'upload' ? "Student's previous work" : "New submission to compare"}</div>
              <div
                className={`pro-drop ${drag ? 'active' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
              >
                <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
                <div className="pro-drop-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
                  </svg>
                </div>
                <div className="pro-drop-title">
                  {files.length === 0 ? 'Drop files here' : `${files.length} file${files.length !== 1 ? 's' : ''}`}
                </div>
                <div className="pro-drop-sub">300+ words per file recommended</div>
              </div>
              {files.length > 0 && (
                <div className="pro-files">
                  {files.map(f => (<span key={f.name} className="pro-file-chip"><span className="chip-dot chip-dot-violet" />{f.name}</span>))}
                </div>
              )}
            </div>
            {error && <div style={{ color: 'var(--rose-bright)', fontSize: 13 }}>{error}</div>}
            <MagneticButton onClick={() => handle(mode === 'upload' ? updateStyle : compareStyle)} disabled={loading}>
              {loading
                ? (mode === 'upload' ? 'Analyzing…' : 'Comparing…')
                : (mode === 'upload' ? 'Upload & analyze' : 'Compare against profile')}
            </MagneticButton>
          </div>
        </div>

        {result && mode === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="pro-section"
            style={{ borderColor: 'rgba(52,211,153,0.3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div className="pro-row-glyph emerald" style={{ width: 32, height: 32 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="pro-section-title" style={{ margin: 0 }}>Profile updated</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {result.message} · content type: {result.content_type}
            </div>
          </motion.div>
        )}

        {result && mode === 'compare' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="pro-section" style={{ textAlign: 'center' }}>
              <RingGauge
                value={result.style_deviation_score}
                size={180}
                color={result.style_deviation_score > 0.6 ? '#f43f5e' : result.style_deviation_score > 0.3 ? '#fbbf24' : '#34d399'}
                secondaryColor={result.style_deviation_score > 0.6 ? '#f472b6' : result.style_deviation_score > 0.3 ? '#f59e0b' : '#22d3ee'}
                label="Style deviation"
                sublabel="from baseline"
              />
              {!result.sufficient_history && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--amber-soft)', borderRadius: 8, fontSize: 12, color: 'var(--amber-bright)' }}>
                  Needs 3+ submissions for reliable comparison ({result.submission_count} so far)
                </div>
              )}
            </div>
            {result.top_deviations?.length > 0 && (
              <div className="pro-section">
                <div className="pro-section-title">Top deviations</div>
                {result.top_deviations.map((d, i) => (
                  <div key={i} style={{
                    padding: '10px 12px', marginBottom: 6,
                    background: 'var(--bg-elevated)', borderRadius: 10,
                    borderLeft: '3px solid var(--amber-bright)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
                  }}>
                    <span>{d.metric || d.name || d}</span>
                    {d.z_score != null && (
                      <span style={{ color: 'var(--amber-bright)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        z={typeof d.z_score === 'number' ? d.z_score.toFixed(1) : d.z_score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div>
        <div className="pro-section" style={{ minHeight: 320 }}>
          <div className="pro-section-title">Current profile</div>
          {!selectedStudent ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Select a student to view their profile.</div>
          ) : profileLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : !profile ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              No profile yet. Upload previous work to build one.
            </div>
          ) : (
            <div className="stack-sm">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-cyan">{profile.submission_count} submissions</span>
                <span className="muted-mono">Updated {new Date(profile.updated_at).toLocaleDateString()}</span>
              </div>
              {profile.style_summary && (
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Style summary (injected into detection)</div>
                  <div style={{
                    fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7,
                    padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 12,
                    borderLeft: '3px solid var(--cyan-bright)',
                  }}>
                    {profile.style_summary}
                  </div>
                </div>
              )}
              {profile.qualitative?.dimensions && (
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Style dimensions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                    {Object.entries(profile.qualitative.dimensions).map(([key, val]) => (
                      <div key={key} style={{
                        padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 10,
                        display: 'flex', justifyContent: 'space-between', fontSize: 12,
                        border: '1px solid var(--border)',
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>{key}</span>
                        <span style={{ color: 'var(--cyan-bright)', fontWeight: 700 }}>
                          {val.scores?.length > 0 ? (val.scores.reduce((a, b) => a + b, 0) / val.scores.length).toFixed(1) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   HELPERS
   ========================================================= */
function EmptyPanel({ title, sub }) {
  return (
    <div className="pro-empty">
      <div className="pro-empty-glow" />
      <div className="pro-empty-title">{title}</div>
      <div className="pro-empty-sub">{sub}</div>
    </div>
  )
}

function IconBook() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
}
function IconUsers() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}
function IconInbox() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
}
function IconScan() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M3 17v2a2 2 0 0 0 2 2h2M21 17v2a2 2 0 0 1-2 2h-2" /><line x1="7" y1="12" x2="17" y2="12" /></svg>
}
function IconWave() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" transform="translate(-2 0)" /><path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" transform="translate(-2 -6)" /></svg>
}
