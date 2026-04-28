import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const ROLES = [
  { value: 'president', label: 'President' },
  { value: 'vp_events', label: 'VP of Events' },
  { value: 'vp_finance', label: 'VP of Finance' },
  { value: 'vp_outreach', label: 'VP of Outreach' },
  { value: 'vp_standards', label: 'VP of Standards' },
  { value: 'member', label: 'Member' },
]

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'vp_events' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
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
      <div style={{ width: '42%', background: 'var(--maroon)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem 3.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'white', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.2)' }}>Λ</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'white', lineHeight: 1.15, marginBottom: '1rem', fontWeight: 800 }}>Alpha<br />Lambda Mu</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 280 }}>The all-in-one Shura operations platform for your chapter.</p>
          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[
              { icon: '📋', text: 'AI-powered event planning & checklists' },
              { icon: '💰', text: 'Budget requests & Finance approval' },
              { icon: '📊', text: 'Real-time financial analytics' },
              { icon: '🛡️', text: 'Role-based Shura access control' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15 }}>{f.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.83rem', fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2.5rem', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.08)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>Shura Roles</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ROLES.map(r => (
                <span key={r.value} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.55rem', borderRadius: 99 }}>{r.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--gray-900)', marginBottom: 6, fontWeight: 700 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.87rem', marginBottom: '2rem' }}>
            {mode === 'login' ? 'Sign in to your ALM account' : 'Join the ALM platform'}
          </p>

          <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 9, padding: 4, marginBottom: '1.75rem' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: 6, cursor: 'pointer', background: mode === m ? 'white' : 'transparent', color: mode === m ? 'var(--maroon)' : 'var(--gray-500)', fontWeight: 700, fontSize: '0.82rem', boxShadow: mode === m ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s', fontFamily: 'var(--font-body)' }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {mode === 'register' && (
              <div className="form-group">
                <label>Full name</label>
                <input name="full_name" value={form.full_name} onChange={handle} placeholder="Keyaan Husain" required />
              </div>
            )}
            <div className="form-group">
              <label>Email address</label>
              <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@university.edu" required />
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
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.7rem 0.9rem', color: '#991b1b', fontSize: '0.84rem' }}>{error}</div>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}