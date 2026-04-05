import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Professor from './pages/Professor'
import Student from './pages/Student'

function Nav() {
  const { pathname } = useLocation()
  const isProfessor = pathname.startsWith('/professor')
  const isStudent = pathname.startsWith('/student')

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      height: 56,
      gap: 32,
      background: 'var(--bg-card)',
    }}>
      <Link to="/" style={{
        fontWeight: 700,
        fontSize: 15,
        color: 'var(--text-bright)',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          width: 24, height: 24,
          borderRadius: 6,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          color: '#fff',
        }}>IG</span>
        Intel Guard
      </Link>
      <div style={{ flex: 1 }} />
      {(isProfessor || isStudent) && (
        <div style={{ display: 'flex', gap: 4 }}>
          <Link
            to="/professor"
            className="btn btn-ghost"
            style={{
              borderRadius: 6,
              fontSize: 13,
              ...(isProfessor ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : {}),
            }}
          >
            Professor
          </Link>
          <Link
            to="/student"
            className="btn btn-ghost"
            style={{
              borderRadius: 6,
              fontSize: 13,
              ...(isStudent ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : {}),
            }}
          >
            Student
          </Link>
        </div>
      )}
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/professor/*" element={<Professor />} />
        <Route path="/student/*" element={<Student />} />
      </Routes>
    </>
  )
}
