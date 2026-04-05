import { useState, useEffect } from 'react'
import { listContexts, submitWork, evaluateAnswer } from '../api'

export default function Student() {
  const [contexts, setContexts] = useState([])
  const [step, setStep] = useState('upload') // upload | loading | results | quiz | summary | done
  const [contextId, setContextId] = useState('')
  const [files, setFiles] = useState([])
  const [mode, setMode] = useState('quiz')
  const [skipDetection, setSkipDetection] = useState(false)
  const [error, setError] = useState('')
  const [submitResult, setSubmitResult] = useState(null)
  const [quizState, setQuizState] = useState(null)

  useEffect(() => {
    listContexts().then(setContexts).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!contextId) return setError('Select an assignment')
    if (files.length === 0) return setError('Upload your submission')
    setError('')
    setStep('loading')
    try {
      const res = await submitWork(contextId, files, mode, skipDetection)
      setSubmitResult(res)
      setStep('results')
    } catch (e) {
      setError(e.message)
      setStep('upload')
    }
  }

  const startQuiz = () => {
    const questions = submitResult.quiz?.questions || []
    setQuizState({
      questions,
      currentIndex: 0,
      answers: [],
      evaluations: [],
    })
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
    <div className="page fade-in">
      <div className="page-header">
        <h1>Student Portal</h1>
        <p>Submit your work and demonstrate understanding</p>
      </div>

      {step === 'upload' && (
        <UploadStep
          contexts={contexts}
          contextId={contextId}
          setContextId={setContextId}
          files={files}
          setFiles={setFiles}
          mode={mode}
          setMode={setMode}
          skipDetection={skipDetection}
          setSkipDetection={setSkipDetection}
          error={error}
          onSubmit={handleSubmit}
        />
      )}

      {step === 'loading' && <LoadingStep />}

      {step === 'results' && (
        <ResultsStep
          result={submitResult}
          onStartQuiz={startQuiz}
          onViewSummary={() => setStep('summary')}
          onReset={reset}
          mode={mode}
        />
      )}

      {step === 'quiz' && (
        <QuizStep
          quizState={quizState}
          setQuizState={setQuizState}
          contextId={contextId}
          submissionText={submitResult?.extracted_text || ''}
          onComplete={() => setStep('done')}
        />
      )}

      {step === 'summary' && (
        <SummaryStep
          summary={submitResult?.summary}
          onDone={() => setStep('done')}
        />
      )}

      {step === 'done' && (
        <DoneStep quizState={quizState} onReset={reset} />
      )}
    </div>
  )
}

/* === Upload Step === */
function UploadStep({ contexts, contextId, setContextId, files, setFiles, mode, setMode, skipDetection, setSkipDetection, error, onSubmit }) {
  return (
    <div className="card stack">
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)' }}>
        Submit Your Work
      </h3>

      <div>
        <div className="label">Assignment</div>
        <select value={contextId} onChange={e => setContextId(e.target.value)}>
          <option value="">Select your assignment...</option>
          {contexts.map(c => (
            <option key={c.context_id} value={c.context_id}>{c.title}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="label">Your Submission</div>
        <label className={`upload-area ${files.length > 0 ? 'has-files' : ''}`}>
          <input
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={e => setFiles(Array.from(e.target.files))}
          />
          {files.length === 0 ? (
            <div>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ marginBottom: 8 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <div>Click to upload your files</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>PDF, Python, Java, C++, text files</div>
            </div>
          ) : (
            <div>
              {files.length} file{files.length > 1 ? 's' : ''} ready: {files.map(f => f.name).join(', ')}
            </div>
          )}
        </label>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="label">Verification Mode</div>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="quiz">Quiz</option>
            <option value="summary">Summary</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'flex-end' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
            padding: '10px 0',
          }}>
            <input
              type="checkbox"
              checked={skipDetection}
              onChange={e => setSkipDetection(e.target.checked)}
              style={{ width: 'auto', accentColor: 'var(--accent)' }}
            />
            Skip AI detection
          </label>
        </div>
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

      <button className="btn btn-primary" onClick={onSubmit} style={{ alignSelf: 'flex-start' }}>
        Submit Work
      </button>
    </div>
  )
}

/* === Loading Step === */
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

/* === Results Step (AI Detection + choose quiz/summary) === */
function ResultsStep({ result, onStartQuiz, onViewSummary, onReset, mode }) {
  const detection = result.ai_detection
  const hasQuiz = result.quiz?.questions?.length > 0
  const hasSummary = !!result.summary
  const prob = detection?.ai_probability ?? null

  return (
    <div className="stack fade-in">
      {/* AI Detection */}
      {detection && (
        <DetectionCard detection={detection} />
      )}

      {/* Next steps */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 16 }}>
          Comprehension Check
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          {prob !== null && prob > 0.5
            ? 'Your submission was flagged — please complete the comprehension check below to verify your understanding.'
            : 'Complete the comprehension check to finalize your submission.'
          }
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasQuiz && (
            <button className="btn btn-primary" onClick={onStartQuiz}>
              Take Quiz ({result.quiz.questions.length} questions)
            </button>
          )}
          {hasSummary && (
            <button className="btn btn-secondary" onClick={onViewSummary}>
              View Summary
            </button>
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

/* === Quiz Step === */
function QuizStep({ quizState, setQuizState, contextId, submissionText, onComplete }) {
  const [answer, setAnswer] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const { questions, currentIndex, evaluations } = quizState
  const current = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1
  const progress = ((currentIndex) / questions.length) * 100

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
    if (isLast) {
      onComplete()
    } else {
      setQuizState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }))
    }
  }

  return (
    <div className="stack fade-in">
      {/* Progress */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {evaluations.filter(e => e.passed).length} / {evaluations.length} passed
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: `${progress}%`,
            background: 'var(--accent)',
          }} />
        </div>
      </div>

      {/* Question */}
      <div className="card">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {currentIndex + 1}
          </div>
          <div style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text-bright)',
            lineHeight: 1.6,
          }}>
            {current?.question || current?.formatted || 'Loading question...'}
          </div>
        </div>

        {!feedback ? (
          <div className="stack">
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              style={{ minHeight: 120 }}
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={handleEvaluate}
              disabled={evaluating || !answer.trim()}
              style={{ alignSelf: 'flex-start' }}
            >
              {evaluating ? (
                <><div className="spinner" style={{ width: 14, height: 14 }} /> Evaluating...</>
              ) : (
                'Submit Answer'
              )}
            </button>
          </div>
        ) : (
          <div className="fade-in">
            {/* Feedback card */}
            <div style={{
              padding: 16,
              borderRadius: 8,
              background: feedback.passed ? 'var(--green-soft)' : 'var(--red-soft)',
              border: `1px solid ${feedback.passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {feedback.passed ? (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--red)" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                <span style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: feedback.passed ? 'var(--green)' : 'var(--red)',
                }}>
                  {feedback.passed ? 'Correct!' : 'Not quite'}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-dim)' }}>
                  Score: {(feedback.score * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
                {feedback.feedback}
              </div>
            </div>

            {/* Your answer shown back */}
            <div style={{
              padding: 12,
              background: 'var(--bg)',
              borderRadius: 6,
              fontSize: 13,
              color: 'var(--text-muted)',
              marginBottom: 16,
              borderLeft: '3px solid var(--border)',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--text-dim)', fontSize: 11, display: 'block', marginBottom: 4 }}>
                YOUR ANSWER
              </span>
              {answer}
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

/* === Summary Step === */
function SummaryStep({ summary, onDone }) {
  return (
    <div className="stack fade-in">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)' }}>
            Submission Summary
          </h3>
          <span className="badge badge-blue">Comprehension Review</span>
        </div>
        <div style={{
          fontSize: 14,
          lineHeight: 1.8,
          color: 'var(--text)',
          whiteSpace: 'pre-wrap',
        }}>
          {summary || 'No summary available.'}
        </div>
      </div>

      <div style={{
        padding: 16,
        background: 'var(--accent-soft)',
        borderRadius: 8,
        border: '1px solid rgba(59, 130, 246, 0.15)',
        fontSize: 13,
        color: 'var(--accent)',
      }}>
        Please read through the summary carefully. It explains the key concepts in your submission.
      </div>

      <button className="btn btn-primary" onClick={onDone} style={{ alignSelf: 'flex-start' }}>
        I've Read the Summary
      </button>
    </div>
  )
}

/* === Done Step === */
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
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>
          You passed {passed} out of {total} question{total > 1 ? 's' : ''}
        </div>
      )}

      {total > 0 && (
        <div style={{
          maxWidth: 200,
          margin: '0 auto 24px',
        }}>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{
              width: `${score * 100}%`,
              background: allPassed ? 'var(--green)' : 'var(--yellow)',
            }} />
          </div>
        </div>
      )}

      {/* Individual question results */}
      {evals.length > 0 && (
        <div style={{ maxWidth: 500, margin: '0 auto 24px', textAlign: 'left' }}>
          <div className="stack-sm">
            {evals.map((ev, i) => (
              <div key={i} className="card" style={{
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: ev.passed ? 'var(--green-soft)' : 'var(--red-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                    Question {i + 1}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: ev.passed ? 'var(--green)' : 'var(--red)' }}>
                  {(ev.score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={onReset}>
        Submit Another
      </button>
    </div>
  )
}
