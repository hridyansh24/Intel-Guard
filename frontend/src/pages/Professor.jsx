import { useState, useEffect } from 'react'
import { createContext, listContexts, analyzeSubmission } from '../api'

export default function Professor() {
  const [tab, setTab] = useState('contexts') // contexts | analyze
  const [contexts, setContexts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchContexts = async () => {
    try {
      const data = await listContexts()
      setContexts(data)
    } catch {}
  }

  useEffect(() => { fetchContexts() }, [])

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Professor Dashboard</h1>
        <p>Manage assignments and review submissions</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        <TabBtn active={tab === 'contexts'} onClick={() => setTab('contexts')}>
          Assignments
        </TabBtn>
        <TabBtn active={tab === 'analyze'} onClick={() => setTab('analyze')}>
          Analyze Submission
        </TabBtn>
      </div>

      {tab === 'contexts' && (
        <ContextsTab
          contexts={contexts}
          onCreated={fetchContexts}
          loading={loading}
          setLoading={setLoading}
        />
      )}
      {tab === 'analyze' && (
        <AnalyzeTab contexts={contexts} />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        fontWeight: active ? 600 : 400,
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: 13,
      }}
    >
      {children}
    </button>
  )
}

/* === Contexts (Assignments) Tab === */
function ContextsTab({ contexts, onCreated, loading, setLoading }) {
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleCreate = async () => {
    if (!title.trim()) return setError('Enter an assignment title')
    if (files.length === 0) return setError('Upload at least one file')
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await createContext(title, files)
      setSuccess(`Created: ${res.context_id}`)
      setTitle('')
      setFiles([])
      onCreated()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack">
      {/* Create form */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 16 }}>
          Upload Assignment Spec
        </h3>
        <div className="stack">
          <div>
            <div className="label">Assignment Title</div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., CS 201 — Homework 3"
            />
          </div>
          <div>
            <div className="label">Spec Files (PDF, code, text)</div>
            <label
              className={`upload-area ${files.length > 0 ? 'has-files' : ''}`}
            >
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={e => setFiles(Array.from(e.target.files))}
                accept=".pdf,.py,.js,.java,.cpp,.c,.txt,.md"
              />
              {files.length === 0
                ? 'Click to upload files (max 10)'
                : `${files.length} file${files.length > 1 ? 's' : ''} selected: ${files.map(f => f.name).join(', ')}`
              }
            </label>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          {success && <div style={{ color: 'var(--green)', fontSize: 13 }}>{success}</div>}
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Creating...</> : 'Create Assignment'}
          </button>
        </div>
      </div>

      {/* Contexts list */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 12 }}>
          Existing Assignments
        </h3>
        {contexts.length === 0 ? (
          <div className="empty-state">No assignments yet. Create one above.</div>
        ) : (
          <div className="stack-sm">
            {contexts.map(ctx => (
              <div key={ctx.context_id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: 14 }}>{ctx.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{ctx.context_id}</div>
                </div>
                <span className="badge badge-blue">Active</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* === Analyze Tab === */
function AnalyzeTab({ contexts }) {
  const [contextId, setContextId] = useState('')
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
      const res = await analyzeSubmission(contextId, files)
      setResult(res)
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
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 16 }}>
          Run AI Detection
        </h3>
        <div className="stack">
          <div>
            <div className="label">Assignment</div>
            <select value={contextId} onChange={e => setContextId(e.target.value)}>
              <option value="">Select an assignment...</option>
              {contexts.map(c => (
                <option key={c.context_id} value={c.context_id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Submission Files</div>
            <label className={`upload-area ${files.length > 0 ? 'has-files' : ''}`}>
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={e => setFiles(Array.from(e.target.files))}
              />
              {files.length === 0
                ? 'Click to upload student submission files'
                : `${files.length} file${files.length > 1 ? 's' : ''}: ${files.map(f => f.name).join(', ')}`
              }
            </label>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Analyzing...</> : 'Analyze Submission'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 28, height: 28 }} />
          <div style={{ color: 'var(--text-muted)' }}>Running 7-layer AI detection analysis...</div>
        </div>
      )}

      {result && (
        <div className="fade-in stack">
          {/* Probability score */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="label">AI Probability</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: probColor }}>
                  {(prob * 100).toFixed(0)}%
                </div>
              </div>
              <span className={`badge ${probBadge}`}>{probLabel} Risk</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${prob * 100}%`, background: probColor }} />
            </div>
          </div>

          {/* Signals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SignalCard
              title="AI Signals Found"
              signals={result.ai_signals_found}
              color="var(--red)"
              badgeClass="badge-red"
              emptyText="No AI signals detected"
            />
            <SignalCard
              title="Human Signals Found"
              signals={result.human_signals_found}
              color="var(--green)"
              badgeClass="badge-green"
              emptyText="No human signals detected"
            />
          </div>

          {/* Assessment */}
          <div className="card">
            <div className="label" style={{ marginBottom: 12 }}>Detailed Assessment</div>
            <div style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
            }}>
              {result.ai_assessment}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SignalCard({ title, signals, color, badgeClass, emptyText }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="label" style={{ margin: 0 }}>{title}</div>
        <span className={`badge ${badgeClass}`}>{signals?.length || 0}</span>
      </div>
      {signals && signals.length > 0 ? (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {signals.map((s, i) => (
            <li key={i} style={{
              fontSize: 13,
              color: 'var(--text)',
              padding: '6px 10px',
              background: 'var(--bg)',
              borderRadius: 6,
              borderLeft: `3px solid ${color}`,
            }}>
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{emptyText}</div>
      )}
    </div>
  )
}
