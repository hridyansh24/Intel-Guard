import { useState, useEffect } from 'react'
import { registerStudent, getStudent } from './api'
import Dashboard from './pages/Dashboard'

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

  const handleRegister = async (name) => {
    const s = await registerStudent(name)
    localStorage.setItem('ai_guard_student', JSON.stringify(s))
    setStudent(s)
  }

  const handleLogout = () => {
    localStorage.removeItem('ai_guard_student')
    setStudent(null)
  }

  if (loading) return null

  if (!student) return <SignupPage onRegister={handleRegister} />
  return <Dashboard student={student} onLogout={handleLogout} />
}

function SignupPage({ onRegister }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Enter your name')
    setError('')
    setLoading(true)
    try {
      await onRegister(name.trim())
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card fade-in" style={{ width: 380, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>
            AI Guard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Student Portal</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <div className="label">Your Name</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your full name"
              autoFocus
            />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Signing up...</> : 'Sign Up'}
          </button>
        </form>

        <p style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
          Sign up to join classes and submit assignments
        </p>
      </div>
    </div>
  )
}
