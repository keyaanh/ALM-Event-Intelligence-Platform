import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const ROLES = [
  { value:'president', label:'President' },
  { value:'vp_events', label:'VP of Events' },
  { value:'vp_finance', label:'VP of Finance' },
  { value:'vp_outreach', label:'VP of Outreach' },
  { value:'vp_standards', label:'VP of Standards' },
  { value:'vp_education', label:'VP of Education' },
  { value:'member', label:'Member' },
]

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email:'', password:'', full_name:'', role:'vp_events' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await api.post(mode === 'login' ? '/auth/login' : '/auth/register', form)
      localStorage.setItem('alm_token', data.access_token)
      localStorage.setItem('alm_role', data.role)
      localStorage.setItem('alm_name', data.full_name)
      localStorage.setItem('alm_user_id', data.user_id)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--off-white)' }}>

      {/* Left panel */}
      <div style={{
        width: '48%', background: 'var(--white)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '3.5rem',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, color: 'white', fontStyle: 'italic' }}>Λ</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Alpha Lambda Mu</span>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: '4rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--maroon)', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'var(--maroon-faint)', padding: '0.25rem 0.7rem', borderRadius: 99 }}>ASU Chapter</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
            The Shura<br /><em style={{ color: 'var(--maroon)' }}>Operations</em><br />Platform
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 340, marginBottom: '2.5rem' }}>
            Everything your chapter needs — events, finance, attendance, education, and tasks — in one place.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['AI Event Planning', 'Budget Approvals', 'Attendance Tracking', 'Pledge Tracker', 'Task Management', 'Member Portal'].map(f => (
              <span key={f} style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.3rem 0.75rem', borderRadius: 99 }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>© 2026 Alpha Lambda Mu · ASU</p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginBottom: '2rem' }}>
            {mode === 'login' ? 'Sign in to your officer account' : 'Register your Shura account'}
          </p>

          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 9, padding: 3, marginBottom: '1.75rem', border: '1px solid var(--border)' }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '0.5rem', border: 'none', borderRadius: 7,
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: mode===m ? 600 : 400,
                fontSize: '0.84rem', transition: 'all 0.15s',
                background: mode === m ? 'var(--white)' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === m ? 'var(--shadow-xs)' : 'none',
              }}>{m === 'login' ? 'Sign In' : 'Register'}</button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <div className="form-group">
                <label>Full name</label>
                <input name="full_name" value={form.full_name} onChange={handle} placeholder="Your name" required />
              </div>
            )}
            <div className="form-group">
              <label>Email address</label>
              <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@asu.edu" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required />
            </div>
            {mode === 'register' && (
              <div className="form-group">
                <label>Shura role</label>
                <select name="role" value={form.role} onChange={handle}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}

            {error && (
              <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '0.7rem 0.9rem', color: 'var(--red)', fontSize: '0.84rem' }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Not an officer?{' '}
              <a href="/members" style={{ color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none' }}>View member portal →</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}