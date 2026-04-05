import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      gap: 48,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: 14,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 800,
          color: '#fff',
          margin: '0 auto 24px',
          boxShadow: '0 0 32px var(--accent-glow)',
        }}>AG</div>
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          color: 'var(--text-bright)',
          marginBottom: 12,
          lineHeight: 1.2,
        }}>
          AI Guard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6 }}>
          Don't block AI. Make cheating pointless.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <RoleCard
          to="/professor"
          title="Professor"
          desc="Upload assignments, configure checks, review results"
          icon={
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          }
        />
        <RoleCard
          to="/student"
          title="Student"
          desc="Submit work, take comprehension quizzes, view summaries"
          icon={
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          }
        />
      </div>
    </div>
  )
}

function RoleCard({ to, title, desc, icon }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div className="role-card">
        <div style={{ color: 'var(--accent)', marginBottom: 16 }}>{icon}</div>
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-bright)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
    </Link>
  )
}
