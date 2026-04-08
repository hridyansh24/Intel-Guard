import { useState, useEffect } from 'react'
import { listClasses, createClass } from './api'
import ClassDashboard from './pages/ClassDashboard'

export default function App() {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [newClassName, setNewClassName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const fetchClasses = async () => {
    try {
      setClasses(await listClasses())
    } catch {}
  }

  useEffect(() => { fetchClasses() }, [])

  const handleCreate = async () => {
    if (!newClassName.trim()) return
    setCreating(true)
    setError('')
    try {
      const cls = await createClass(newClassName.trim())
      setNewClassName('')
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

  return (
    <div>
      <nav style={{
        borderBottom: '1px solid var(--border)', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: 15 }}>AI Guard</span>
        <span className="badge badge-orange">Professor</span>
      </nav>

      <div className="page fade-in">
        <div className="page-header">
          <h1>Your Classes</h1>
          <p>Select a class to manage or create a new one</p>
        </div>

        {/* Create class */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 12 }}>
            Create a New Class
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              placeholder="e.g., CS 201 — Spring 2026"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</div>}
        </div>

        {/* Class list */}
        {classes.length === 0 ? (
          <div className="empty-state">No classes yet. Create your first class above.</div>
        ) : (
          <div className="stack-sm">
            {classes.map(cls => (
              <button key={cls.class_id} className="card" style={{
                padding: 20, display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'border-color 150ms ease',
              }}
                onClick={() => setSelectedClass(cls.class_id)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'var(--accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: 15 }}>
                    {cls.name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-blue">{cls.students?.length || 0} students</span>
                  <span className="badge badge-green">{cls.contexts?.length || 0} assignments</span>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-dim)" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
