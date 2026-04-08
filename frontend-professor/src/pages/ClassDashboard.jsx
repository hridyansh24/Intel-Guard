import { useState, useEffect } from 'react'
import {
  getClass, getClassStudents, getClassSubmissions, listContexts,
  createContext, addContextToClass, analyzeSubmission,
  updateStyle, getStyleProfile, compareStyle, listSubmissions,
  updateContextSettings,
} from '../api'

export default function ClassDashboard({ classId, onBack }) {
  const [cls, setCls] = useState(null)
  const [students, setStudents] = useState([])
  const [allContexts, setAllContexts] = useState([])
  const [tab, setTab] = useState('assignments') // assignments | students | submissions | analyze | style

  const fetchData = async () => {
    try {
      const [c, s, ctx] = await Promise.all([
        getClass(classId), getClassStudents(classId), listContexts(),
      ])
      setCls(c)
      setStudents(s)
      setAllContexts(ctx)
    } catch {}
  }

  useEffect(() => { fetchData() }, [classId])

  if (!cls) return <div style={{ textAlign: 'center', padding: 64 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  // cls.contexts is [{context_id, skip_detection}] — merge with full context info
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
    <div>
      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid var(--border)', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '6px 10px' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: 15 }}>AI Guard</span>
        <span className="badge badge-orange">Professor</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{cls.name}</span>
      </nav>

      <div className="page fade-in">
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <StatCard label="Students" value={students.length} color="var(--accent)" />
          <StatCard label="Assignments" value={classContexts.length} color="var(--green)" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
          {['assignments', 'students', 'submissions', 'analyze', 'style'].map(t => (
            <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>
              {t === 'assignments' ? 'Assignments' :
               t === 'students' ? 'Students' :
               t === 'submissions' ? 'Submissions' :
               t === 'analyze' ? 'Analyze' : 'Style Profiles'}
            </TabBtn>
          ))}
        </div>

        {tab === 'assignments' && (
          <AssignmentsTab cls={cls} classContexts={classContexts} allContexts={allContexts} classId={classId} onRefresh={fetchData} />
        )}
        {tab === 'students' && (
          <StudentsTab students={students} />
        )}
        {tab === 'submissions' && (
          <SubmissionsTab classId={classId} classContexts={classContexts} students={students} />
        )}
        {tab === 'analyze' && (
          <AnalyzeTab classContexts={classContexts} students={students} />
        )}
        {tab === 'style' && (
          <StyleTab students={students} classContexts={classContexts} classId={classId} />
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="btn" style={{
      background: active ? 'var(--accent-soft)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      fontWeight: active ? 600 : 400, borderRadius: 8, padding: '8px 16px', fontSize: 13,
    }}>
      {children}
    </button>
  )
}

/* === Assignments Tab === */
function AssignmentsTab({ cls, classContexts, allContexts, classId, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkContextId, setLinkContextId] = useState('')

  // Contexts not yet linked to this class
  const linkedIds = new Set(classContexts.map(c => c.context_id))
  const unlinked = allContexts.filter(c => !linkedIds.has(c.context_id))

  const handleCreate = async () => {
    if (!title.trim() || files.length === 0) return setError('Title and files required')
    setLoading(true)
    setError('')
    try {
      const res = await createContext(title, files)
      await addContextToClass(classId, res.context_id)
      setTitle('')
      setFiles([])
      setShowCreate(false)
      onRefresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLink = async () => {
    if (!linkContextId) return
    try {
      await addContextToClass(classId, linkContextId)
      setLinkContextId('')
      onRefresh()
    } catch {}
  }

  return (
    <div className="stack">
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Assignment'}
        </button>
      </div>

      {showCreate && (
        <div className="card stack">
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)' }}>Create Assignment</h3>
          <div>
            <div className="label">Assignment Title</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Homework 3 — Sorting Algorithms" />
          </div>
          <div>
            <div className="label">Spec Files</div>
            <label className={`upload-area ${files.length > 0 ? 'has-files' : ''}`}>
              <input type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} accept=".pdf,.py,.js,.java,.cpp,.c,.txt,.md" />
              {files.length === 0 ? 'Click to upload spec files (max 10)' : `${files.length} file(s): ${files.map(f => f.name).join(', ')}`}
            </label>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? 'Creating...' : 'Create & Link to Class'}
          </button>
        </div>
      )}

      {/* Link existing */}
      {unlinked.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={linkContextId} onChange={e => setLinkContextId(e.target.value)} style={{ flex: 1 }}>
              <option value="">Link an existing assignment...</option>
              {unlinked.map(c => <option key={c.context_id} value={c.context_id}>{c.title}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={handleLink} disabled={!linkContextId}>Link</button>
          </div>
        </div>
      )}

      {/* List */}
      {classContexts.length === 0 ? (
        <div className="empty-state">No assignments linked to this class yet.</div>
      ) : (
        <div className="stack-sm">
          {classContexts.map(ctx => (
            <AssignmentCard key={ctx.context_id} ctx={ctx} classId={classId} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}

function AssignmentCard({ ctx, classId, onRefresh }) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = async () => {
    setToggling(true)
    try {
      await updateContextSettings(classId, ctx.context_id, !ctx.skip_detection)
      onRefresh()
    } catch {} finally {
      setToggling(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: 'var(--green-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: 14 }}>{ctx.title}</div>
      </div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
        color: ctx.skip_detection ? 'var(--yellow)' : 'var(--text-dim)',
        cursor: 'pointer',
      }}>
        <input type="checkbox" checked={ctx.skip_detection} onChange={handleToggle} disabled={toggling}
          style={{ width: 'auto', accentColor: 'var(--yellow)' }} />
        Skip AI detection
      </label>
      <span className="badge badge-green">Active</span>
    </div>
  )
}

/* === Students Tab === */
function StudentsTab({ students }) {
  if (students.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ marginBottom: 12 }}>No students have joined this class yet.</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Students can join from their portal after signing up
        </div>
      </div>
    )
  }

  return (
    <div className="stack-sm">
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
        {students.length} student{students.length !== 1 ? 's' : ''} enrolled
      </div>
      {students.map(s => (
        <div key={s.student_id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontWeight: 700, fontSize: 14, color: 'var(--accent)',
          }}>
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: 14 }}>{s.name}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* === Submissions Tab === */
function SubmissionsTab({ classId, classContexts, students }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterContext, setFilterContext] = useState('')

  useEffect(() => {
    setLoading(true)
    getClassSubmissions(classId, filterContext || undefined)
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false))
  }, [classId, filterContext])

  const studentMap = Object.fromEntries(students.map(s => [s.student_id, s.name]))

  return (
    <div className="stack">
      <div>
        <select value={filterContext} onChange={e => setFilterContext(e.target.value)}>
          <option value="">All assignments</option>
          {classContexts.map(c => <option key={c.context_id} value={c.context_id}>{c.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : submissions.length === 0 ? (
        <div className="empty-state">No submissions yet.</div>
      ) : (
        <div className="stack-sm">
          {submissions.map(s => {
            const ai = s.ai_detection?.ai_probability
            const conf = s.confidence_score?.confidence
            const level = s.confidence_score?.level
            const quiz = s.quiz_results

            return (
              <div key={s.submission_id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      fontWeight: 700, fontSize: 12, color: 'var(--accent)',
                    }}>
                      {(studentMap[s.student_id] || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: 14 }}>
                        {studentMap[s.student_id] || s.student_name || s.student_id}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {new Date(s.timestamp).toLocaleString()}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {s.context_title || 'Unknown assignment'}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ai != null && (
                    <span className={`badge ${ai > 0.7 ? 'badge-red' : ai > 0.4 ? 'badge-yellow' : 'badge-green'}`}>
                      AI: {(ai * 100).toFixed(0)}%
                    </span>
                  )}
                  {conf != null && (
                    <span className={`badge ${level === 'high' ? 'badge-red' : level === 'elevated' ? 'badge-orange' : level === 'moderate' ? 'badge-yellow' : 'badge-green'}`}>
                      Confidence: {(conf * 100).toFixed(0)}%
                    </span>
                  )}
                  {s.style_analysis && (
                    <span className={`badge ${s.style_analysis.style_deviation_score > 0.6 ? 'badge-red' : s.style_analysis.style_deviation_score > 0.3 ? 'badge-yellow' : 'badge-green'}`}>
                      Style dev: {(s.style_analysis.style_deviation_score * 100).toFixed(0)}%
                    </span>
                  )}
                  {quiz && (
                    <span className={`badge ${quiz.passed === quiz.total ? 'badge-green' : 'badge-yellow'}`}>
                      Quiz: {quiz.passed}/{quiz.total}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* === Analyze Tab === */
function AnalyzeTab({ classContexts, students }) {
  const [contextId, setContextId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    if (!contextId) return setError('Select an assignment')
    if (files.length === 0) return setError('Upload submission files')
    setError('')
    setResult(null)
    setLoading(true)
    try {
      setResult(await analyzeSubmission(contextId, files, studentId || null))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const prob = result?.ai_probability ?? 0
  const probColor = prob > 0.7 ? 'var(--red)' : prob > 0.4 ? 'var(--yellow)' : 'var(--green)'
  const probLabel = prob > 0.7 ? 'High' : prob > 0.4 ? 'Medium' : 'Low'
  const probBadge = prob > 0.7 ? 'badge-red' : prob > 0.4 ? 'badge-yellow' : 'badge-green'

  return (
    <div className="stack">
      <div className="card stack">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)' }}>Run AI Detection</h3>
        <div>
          <div className="label">Assignment</div>
          <select value={contextId} onChange={e => setContextId(e.target.value)}>
            <option value="">Select an assignment...</option>
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
          <div className="label">Submission Files</div>
          <label className={`upload-area ${files.length > 0 ? 'has-files' : ''}`}>
            <input type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
            {files.length === 0 ? 'Click to upload student submission files' : `${files.length} file(s): ${files.map(f => f.name).join(', ')}`}
          </label>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
        <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading} style={{ alignSelf: 'flex-start' }}>
          {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Analyzing...</> : 'Analyze'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 28, height: 28 }} />
          <div style={{ color: 'var(--text-muted)' }}>Running 7-layer AI detection...</div>
        </div>
      )}

      {result && (
        <div className="fade-in stack">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="label">AI Probability</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: probColor }}>{(prob * 100).toFixed(0)}%</div>
              </div>
              <span className={`badge ${probBadge}`}>{probLabel} Risk</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${prob * 100}%`, background: probColor }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SignalCard title="AI Signals" signals={result.ai_signals_found} color="var(--red)" badge="badge-red" />
            <SignalCard title="Human Signals" signals={result.human_signals_found} color="var(--green)" badge="badge-green" />
          </div>

          <div className="card">
            <div className="label" style={{ marginBottom: 12 }}>Detailed Assessment</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {result.ai_assessment}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SignalCard({ title, signals, color, badge }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="label" style={{ margin: 0 }}>{title}</div>
        <span className={`badge ${badge}`}>{signals?.length || 0}</span>
      </div>
      {signals?.length > 0 ? (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {signals.map((s, i) => (
            <li key={i} style={{
              fontSize: 13, color: 'var(--text)', padding: '6px 10px',
              background: 'var(--bg)', borderRadius: 6, borderLeft: `3px solid ${color}`,
            }}>{s}</li>
          ))}
        </ul>
      ) : (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>None detected</div>
      )}
    </div>
  )
}

/* === Style Profiles Tab === */
function StyleTab({ students, classContexts, classId }) {
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedContext, setSelectedContext] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [mode, setMode] = useState('upload') // upload | compare

  // Load profile when student is selected
  useEffect(() => {
    if (!selectedStudent) { setProfile(null); return }
    setProfileLoading(true)
    getStyleProfile(selectedStudent)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))
  }, [selectedStudent, result])

  const handleUpload = async () => {
    if (!selectedStudent) return setError('Select a student')
    if (!selectedContext) return setError('Select an assignment')
    if (files.length === 0) return setError('Upload files')
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await updateStyle(selectedStudent, selectedContext, files)
      setResult(res)
      setFiles([])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async () => {
    if (!selectedStudent) return setError('Select a student')
    if (!selectedContext) return setError('Select an assignment')
    if (files.length === 0) return setError('Upload files')
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await compareStyle(selectedStudent, selectedContext, files)
      setResult(res)
      setFiles([])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      <div className="card stack">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)' }}>
          Writing Style Fingerprinting
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Upload a student's previous work to build their style profile, or compare a new submission against their baseline.
        </p>

        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <TabBtn active={mode === 'upload'} onClick={() => { setMode('upload'); setResult(null) }}>
            Upload Previous Work
          </TabBtn>
          <TabBtn active={mode === 'compare'} onClick={() => { setMode('compare'); setResult(null) }}>
            Compare Submission
          </TabBtn>
        </div>

        <div>
          <div className="label">Student</div>
          <select value={selectedStudent} onChange={e => { setSelectedStudent(e.target.value); setResult(null) }}>
            <option value="">Select a student...</option>
            {students.map(s => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <div className="label">Assignment (for context)</div>
          <select value={selectedContext} onChange={e => setSelectedContext(e.target.value)}>
            <option value="">Select an assignment...</option>
            {classContexts.map(c => <option key={c.context_id} value={c.context_id}>{c.title}</option>)}
          </select>
        </div>

        <div>
          <div className="label">{mode === 'upload' ? "Student's Previous Work" : "New Submission to Compare"}</div>
          <label className={`upload-area ${files.length > 0 ? 'has-files' : ''}`}>
            <input type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
            {files.length === 0 ? 'Click to upload files' : `${files.length} file(s): ${files.map(f => f.name).join(', ')}`}
          </label>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

        <button className="btn btn-primary" onClick={mode === 'upload' ? handleUpload : handleCompare}
          disabled={loading} style={{ alignSelf: 'flex-start' }}>
          {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} />
            {mode === 'upload' ? ' Analyzing...' : ' Comparing...'}</> :
            mode === 'upload' ? 'Upload & Analyze Style' : 'Compare Against Profile'}
        </button>
      </div>

      {/* Result from upload */}
      {result && mode === 'upload' && (
        <div className="card fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span style={{ fontWeight: 600, color: 'var(--green)', fontSize: 14 }}>Profile Updated</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {result.message} Content type: {result.content_type}
          </div>
        </div>
      )}

      {/* Result from compare */}
      {result && mode === 'compare' && (
        <div className="fade-in stack">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="label" style={{ margin: 0 }}>Style Deviation Score</div>
              <span className={`badge ${result.style_deviation_score > 0.6 ? 'badge-red' : result.style_deviation_score > 0.3 ? 'badge-yellow' : 'badge-green'}`}>
                {result.style_deviation_score > 0.6 ? 'High' : result.style_deviation_score > 0.3 ? 'Moderate' : 'Low'} Deviation
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontSize: 32, fontWeight: 700,
                color: result.style_deviation_score > 0.6 ? 'var(--red)' : result.style_deviation_score > 0.3 ? 'var(--yellow)' : 'var(--green)',
              }}>
                {(result.style_deviation_score * 100).toFixed(0)}%
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>deviation from baseline</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{
                width: `${result.style_deviation_score * 100}%`,
                background: result.style_deviation_score > 0.6 ? 'var(--red)' : result.style_deviation_score > 0.3 ? 'var(--yellow)' : 'var(--green)',
              }} />
            </div>
            {!result.sufficient_history && (
              <div style={{ marginTop: 12, padding: 10, background: 'var(--yellow-soft)', borderRadius: 6, fontSize: 12, color: 'var(--yellow)' }}>
                Needs 3+ submissions for reliable comparison ({result.submission_count} so far)
              </div>
            )}
          </div>

          {result.top_deviations?.length > 0 && (
            <div className="card">
              <div className="label" style={{ marginBottom: 12 }}>Top Deviations</div>
              <div className="stack-sm">
                {result.top_deviations.map((d, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', background: 'var(--bg)', borderRadius: 6,
                    borderLeft: '3px solid var(--orange)', fontSize: 13,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ color: 'var(--text)' }}>{d.metric || d.name || d}</span>
                    {d.z_score != null && (
                      <span style={{ color: 'var(--orange)', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                        z={typeof d.z_score === 'number' ? d.z_score.toFixed(1) : d.z_score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.message && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{result.message}</div>
          )}
        </div>
      )}

      {/* Existing profile */}
      {selectedStudent && (
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 12 }}>
            Current Profile
          </h3>
          {profileLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : !profile ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              No style profile exists yet. Upload previous work above to create one.
            </div>
          ) : (
            <div className="stack-sm">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span className="badge badge-blue">{profile.submission_count} submissions</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Last updated: {new Date(profile.updated_at).toLocaleDateString()}
                </span>
              </div>
              {profile.style_summary && (
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Style Summary (used in AI detection)</div>
                  <div style={{
                    fontSize: 13, color: 'var(--text)', lineHeight: 1.7,
                    padding: '12px 16px', background: 'var(--bg)', borderRadius: 8,
                    borderLeft: '3px solid var(--accent)',
                  }}>
                    {profile.style_summary}
                  </div>
                </div>
              )}
              {profile.qualitative?.overall_impressions?.length > 0 && !profile.style_summary && (
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>Writing Characteristics</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                    {profile.qualitative.overall_impressions.slice(-3).join(' | ')}
                  </div>
                </div>
              )}
              {profile.qualitative?.dimensions && (
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Style Dimensions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {Object.entries(profile.qualitative.dimensions).map(([key, val]) => (
                      <div key={key} style={{
                        padding: '6px 10px', background: 'var(--bg)', borderRadius: 6,
                        display: 'flex', justifyContent: 'space-between', fontSize: 12,
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>{key}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
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
      )}
    </div>
  )
}
