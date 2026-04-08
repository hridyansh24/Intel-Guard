import { useState, useEffect } from 'react'
import {
  listClasses, joinClass, getStudentClasses, getClass,
  submitWork, evaluateAnswer, listSubmissions, updateSubmissionQuiz,
} from '../api'

export default function Dashboard({ student, onLogout }) {
  const [tab, setTab] = useState('submit') // submit | history
  const [myClasses, setMyClasses] = useState([])
  const [allClasses, setAllClasses] = useState([])
  const [joinError, setJoinError] = useState('')

  const fetchData = async () => {
    try {
      const [classes, mine] = await Promise.all([listClasses(), getStudentClasses(student.student_id)])
      setAllClasses(classes)
      setMyClasses(mine)
    } catch {}
  }

  useEffect(() => { fetchData() }, [])

  const handleJoin = async (classId) => {
    setJoinError('')
    try {
      await joinClass(classId, student.student_id)
      fetchData()
    } catch (e) {
      setJoinError(e.message)
    }
  }

  const myClassIds = new Set(myClasses.map(c => c.class_id))
  const availableClasses = allClasses.filter(c => !myClassIds.has(c.class_id))

  return (
    <div>
      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: 15 }}>AI Guard</span>
          <span className="badge badge-blue">Student</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {student.name}
          </span>
          <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize: 12 }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page fade-in">
        {/* Class membership */}
        {myClasses.length === 0 && (
          <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 8 }}>
              Join a Class
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              You need to join a class before submitting work
            </p>
            {availableClasses.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
                No classes available yet. Ask your professor to create one.
              </div>
            ) : (
              <div className="stack-sm" style={{ maxWidth: 400, margin: '0 auto' }}>
                {availableClasses.map(c => (
                  <div key={c.class_id} className="card" style={{
                    padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-bright)' }}>{c.name}</span>
                    <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}
                      onClick={() => handleJoin(c.class_id)}>
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
            {joinError && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{joinError}</div>}
          </div>
        )}

        {myClasses.length > 0 && (
          <>
            {/* Class pills + join more */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Classes:</span>
              {myClasses.map(c => (
                <span key={c.class_id} className="badge badge-blue">{c.name}</span>
              ))}
              {availableClasses.length > 0 && (
                <JoinDropdown classes={availableClasses} onJoin={handleJoin} />
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
              <TabBtn active={tab === 'submit'} onClick={() => setTab('submit')}>Submit Work</TabBtn>
              <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>My Submissions</TabBtn>
              {availableClasses.length > 0 && (
                <TabBtn active={tab === 'join'} onClick={() => setTab('join')}>Join Classes</TabBtn>
              )}
            </div>

            {tab === 'submit' && (
              <SubmitTab student={student} myClasses={myClasses} />
            )}
            {tab === 'history' && (
              <HistoryTab student={student} />
            )}
            {tab === 'join' && (
              <JoinClassesTab classes={availableClasses} onJoin={handleJoin} error={joinError} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function JoinDropdown({ classes, onJoin }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-ghost" onClick={() => setOpen(!open)} style={{ fontSize: 12, padding: '3px 8px' }}>
        + Join
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 10,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 4, minWidth: 180, marginTop: 4,
        }}>
          {classes.map(c => (
            <button key={c.class_id} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13 }}
              onClick={() => { onJoin(c.class_id); setOpen(false) }}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function JoinClassesTab({ classes, onJoin, error }) {
  return (
    <div className="stack">
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 12 }}>
          Available Classes
        </h3>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div className="stack-sm">
          {classes.map(c => (
            <div key={c.class_id} style={{
              padding: '14px 16px', background: 'var(--bg)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 500, color: 'var(--text-bright)', fontSize: 14 }}>{c.name}</span>
              <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 12 }}
                onClick={() => onJoin(c.class_id)}>
                Join Class
              </button>
            </div>
          ))}
        </div>
      </div>
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

/* === Submit Tab === */
function SubmitTab({ student, myClasses }) {
  const [step, setStep] = useState('upload') // upload | loading | results | quiz | summary | done
  const [selectedClass, setSelectedClass] = useState('')
  const [assignments, setAssignments] = useState([])
  const [contextId, setContextId] = useState('')
  const [contextTitle, setContextTitle] = useState('')
  const [files, setFiles] = useState([])
  const [mode, setMode] = useState('quiz')
  const [error, setError] = useState('')
  const [submitResult, setSubmitResult] = useState(null)
  const [quizState, setQuizState] = useState(null)

  // Load assignments when class is selected
  useEffect(() => {
    if (!selectedClass) { setAssignments([]); return }
    getClass(selectedClass).then(cls => {
      // cls.contexts is now [{context_id, skip_detection}] or legacy [string]
      const entries = (cls.contexts || []).map(entry =>
        typeof entry === 'string' ? entry : entry.context_id
      ).filter(Boolean)
      if (entries.length > 0) {
        Promise.all(entries.map(cid =>
          fetch(`/api/context/${cid}`).then(r => r.json()).catch(() => null)
        )).then(results => setAssignments(results.filter(Boolean)))
      } else {
        setAssignments([])
      }
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
      {step === 'upload' && (
        <div className="card stack">
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)' }}>Submit Your Work</h3>

          <div>
            <div className="label">Class</div>
            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setContextId('') }}>
              <option value="">Select a class...</option>
              {myClasses.map(c => (
                <option key={c.class_id} value={c.class_id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="label">Assignment</div>
            <select value={contextId} onChange={e => {
              setContextId(e.target.value)
              const a = assignments.find(a => a.context_id === e.target.value)
              setContextTitle(a?.title || '')
            }}>
              <option value="">Select an assignment...</option>
              {assignments.map(a => (
                <option key={a.context_id} value={a.context_id}>{a.title}</option>
              ))}
            </select>
            {selectedClass && assignments.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>
                No assignments linked to this class yet
              </div>
            )}
          </div>

          <div>
            <div className="label">Your Submission</div>
            <label className={`upload-area ${files.length > 0 ? 'has-files' : ''}`}>
              <input type="file" multiple style={{ display: 'none' }}
                onChange={e => setFiles(Array.from(e.target.files))} />
              {files.length === 0 ? (
                <div>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ marginBottom: 8 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <div>Click to upload your files</div>
                  <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>PDF, Python, Java, C++, text files</div>
                </div>
              ) : (
                <div>{files.length} file{files.length > 1 ? 's' : ''} ready: {files.map(f => f.name).join(', ')}</div>
              )}
            </label>
          </div>

          <div>
            <div className="label">Verification Mode</div>
            <select value={mode} onChange={e => setMode(e.target.value)}>
              <option value="quiz">Quiz</option>
              <option value="summary">Summary</option>
              <option value="both">Both</option>
            </select>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          <button className="btn btn-primary" onClick={handleSubmit} style={{ alignSelf: 'flex-start' }}>
            Submit Work
          </button>
        </div>
      )}

      {step === 'loading' && <LoadingStep />}

      {step === 'results' && (
        <ResultsStep result={submitResult} onStartQuiz={startQuiz}
          onViewSummary={() => setStep('summary')} onReset={reset} mode={mode} />
      )}

      {step === 'quiz' && (
        <QuizStep quizState={quizState} setQuizState={setQuizState}
          contextId={contextId} submissionText={submitResult?.extracted_text || ''}
          onComplete={() => setStep('done')} />
      )}

      {step === 'summary' && (
        <SummaryStep summary={submitResult?.summary} onDone={() => setStep('done')} />
      )}

      {step === 'done' && <DoneStep quizState={quizState} onReset={reset} />}
    </div>
  )
}

/* === History Tab === */
function HistoryTab({ student }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSubmissions(student.student_id)
      .then(setSubmissions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  if (submissions.length === 0) {
    return <div className="empty-state">No submissions yet. Submit your first assignment above!</div>
  }

  return (
    <div className="stack-sm">
      {submissions.map(s => (
        <div key={s.submission_id} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: 14 }}>
              {s.context_title || 'Assignment'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {new Date(s.timestamp).toLocaleDateString()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {s.ai_detection && (
              <span className={`badge ${s.ai_detection.ai_probability > 0.7 ? 'badge-red' : s.ai_detection.ai_probability > 0.4 ? 'badge-yellow' : 'badge-green'}`}>
                AI: {(s.ai_detection.ai_probability * 100).toFixed(0)}%
              </span>
            )}
            {s.confidence_score && (
              <span className={`badge ${s.confidence_score.confidence > 0.65 ? 'badge-red' : s.confidence_score.confidence > 0.45 ? 'badge-orange' : s.confidence_score.confidence > 0.25 ? 'badge-yellow' : 'badge-green'}`}>
                Confidence: {(s.confidence_score.confidence * 100).toFixed(0)}%
              </span>
            )}
            {s.quiz_results && (
              <span className={`badge ${s.quiz_results.passed === s.quiz_results.total ? 'badge-green' : 'badge-yellow'}`}>
                Quiz: {s.quiz_results.passed}/{s.quiz_results.total}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* === Sub-components (shared quiz/summary/loading/done UI) === */

function LoadingStep() {
  const [dots, setDots] = useState('')
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(i)
  }, [])
  return (
    <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div className="spinner" style={{ margin: '0 auto 20px', width: 32, height: 32 }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 8 }}>
        Processing your submission{dots}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        Extracting text, running analysis, generating questions
      </div>
    </div>
  )
}

function ResultsStep({ result, onStartQuiz, onViewSummary, onReset, mode }) {
  const detection = result.ai_detection
  const hasQuiz = result.quiz?.questions?.length > 0
  const hasSummary = !!result.summary
  const prob = detection?.ai_probability ?? null

  return (
    <div className="stack fade-in">
      {detection && <DetectionCard detection={detection} />}

      {result.confidence_score && (
        <ConfidenceCard score={result.confidence_score} />
      )}

      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 16 }}>
          Comprehension Check
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          {prob !== null && prob > 0.5
            ? 'Your submission was flagged — please complete the comprehension check below.'
            : 'Complete the comprehension check to finalize your submission.'}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasQuiz && (
            <button className="btn btn-primary" onClick={onStartQuiz}>
              Take Quiz ({result.quiz.questions.length} questions)
            </button>
          )}
          {hasSummary && (
            <button className="btn btn-secondary" onClick={onViewSummary}>View Summary</button>
          )}
          <button className="btn btn-ghost" onClick={onReset}>Start Over</button>
        </div>
      </div>
    </div>
  )
}

function DetectionCard({ detection }) {
  const prob = detection.ai_probability ?? 0
  const color = prob > 0.7 ? 'var(--red)' : prob > 0.4 ? 'var(--yellow)' : 'var(--green)'
  const label = prob > 0.7 ? 'High Risk' : prob > 0.4 ? 'Medium Risk' : 'Low Risk'
  const badgeClass = prob > 0.7 ? 'badge-red' : prob > 0.4 ? 'badge-yellow' : 'badge-green'

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="label" style={{ margin: 0 }}>AI Detection Result</div>
        <span className={`badge ${badgeClass}`}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color }}>{(prob * 100).toFixed(0)}%</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI probability</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${prob * 100}%`, background: color }} />
      </div>
    </div>
  )
}

function ConfidenceCard({ score }) {
  const conf = score.confidence ?? 0
  const level = score.level || 'low'
  const colorMap = { low: 'var(--green)', moderate: 'var(--yellow)', elevated: 'var(--orange)', high: 'var(--red)' }
  const badgeMap = { low: 'badge-green', moderate: 'badge-yellow', elevated: 'badge-orange', high: 'badge-red' }
  const color = colorMap[level] || 'var(--text-muted)'

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="label" style={{ margin: 0 }}>Overall Confidence Score</div>
        <span className={`badge ${badgeMap[level] || 'badge-blue'}`}>{level}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color }}>{(conf * 100).toFixed(0)}%</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>likelihood of AI use</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${conf * 100}%`, background: color }} />
      </div>
    </div>
  )
}

function QuizStep({ quizState, setQuizState, contextId, submissionText, onComplete }) {
  const [answer, setAnswer] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const { questions, currentIndex, evaluations } = quizState
  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const progress = (currentIndex / questions.length) * 100

  const handleEvaluate = async () => {
    if (!answer.trim()) return
    setEvaluating(true)
    setFeedback(null)
    try {
      const res = await evaluateAnswer(contextId, submissionText, current.question, answer)
      setFeedback(res)
      setQuizState(prev => ({
        ...prev,
        evaluations: [...prev.evaluations, { ...res, studentAnswer: answer }],
      }))
    } catch (e) {
      setFeedback({ passed: false, score: 0, feedback: e.message })
    } finally {
      setEvaluating(false)
    }
  }

  const handleNext = () => {
    setAnswer('')
    setFeedback(null)
    if (isLast) onComplete()
    else setQuizState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }))
  }

  return (
    <div className="stack fade-in">
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Question {currentIndex + 1} of {questions.length}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{evaluations.filter(e => e.passed).length} / {evaluations.length} passed</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, color: 'var(--accent)', flexShrink: 0,
          }}>{currentIndex + 1}</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-bright)', lineHeight: 1.6 }}>
            {current?.question || current?.formatted || 'Loading...'}
          </div>
        </div>

        {!feedback ? (
          <div className="stack">
            <textarea value={answer} onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer here..." style={{ minHeight: 120 }} autoFocus />
            <button className="btn btn-primary" onClick={handleEvaluate}
              disabled={evaluating || !answer.trim()} style={{ alignSelf: 'flex-start' }}>
              {evaluating ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Evaluating...</> : 'Submit Answer'}
            </button>
          </div>
        ) : (
          <div className="fade-in">
            <div style={{
              padding: 16, borderRadius: 8,
              background: feedback.passed ? 'var(--green-soft)' : 'var(--red-soft)',
              border: `1px solid ${feedback.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: feedback.passed ? 'var(--green)' : 'var(--red)' }}>
                  {feedback.passed ? 'Correct!' : 'Not quite'}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-dim)' }}>
                  Score: {(feedback.score * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{feedback.feedback}</div>
            </div>
            <button className="btn btn-primary" onClick={handleNext}>
              {isLast ? 'Finish Quiz' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryStep({ summary, onDone }) {
  return (
    <div className="stack fade-in">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)' }}>Submission Summary</h3>
          <span className="badge badge-blue">Comprehension Review</span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
          {summary || 'No summary available.'}
        </div>
      </div>
      <button className="btn btn-primary" onClick={onDone} style={{ alignSelf: 'flex-start' }}>
        I've Read the Summary
      </button>
    </div>
  )
}

function DoneStep({ quizState, onReset }) {
  const evals = quizState?.evaluations || []
  const passed = evals.filter(e => e.passed).length
  const total = evals.length
  const allPassed = total > 0 && passed === total
  const score = total > 0 ? passed / total : 1

  return (
    <div className="fade-in" style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: allPassed ? 'var(--green-soft)' : 'var(--yellow-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        {allPassed ? (
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ) : (
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--yellow)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        )}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 8 }}>
        {allPassed ? 'Comprehension Verified!' : total > 0 ? 'Partially Verified' : 'Summary Reviewed'}
      </h2>

      {total > 0 && (
        <>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>
            You passed {passed} out of {total} question{total > 1 ? 's' : ''}
          </div>
          <div style={{ maxWidth: 200, margin: '0 auto 24px' }}>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{
                width: `${score * 100}%`,
                background: allPassed ? 'var(--green)' : 'var(--yellow)',
              }} />
            </div>
          </div>

          <div style={{ maxWidth: 500, margin: '0 auto 24px', textAlign: 'left' }}>
            <div className="stack-sm">
              {evals.map((ev, i) => (
                <div key={i} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: ev.passed ? 'var(--green-soft)' : 'var(--red-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {ev.passed ? (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--red)" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Question {i + 1}</div></div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ev.passed ? 'var(--green)' : 'var(--red)' }}>
                    {(ev.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <button className="btn btn-primary" onClick={onReset}>Submit Another</button>
    </div>
  )
}
