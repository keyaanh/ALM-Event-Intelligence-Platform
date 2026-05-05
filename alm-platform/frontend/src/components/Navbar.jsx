import { Link, useNavigate, useLocation } from 'react-router-dom'

const ROLE_LABELS = {
  president:'President', vp_events:'VP of Events', vp_finance:'VP of Finance',
  vp_outreach:'VP of Outreach', vp_standards:'VP of Standards',
  vp_education:'VP of Education', member:'Member',
}

const NAV_LINKS = [
  { to:'/dashboard', label:'Events' },
  { to:'/finance', label:'Finance', hideFor:['member'] },
  { to:'/outreach', label:'Outreach', hideFor:['member'] },
  { to:'/standards', label:'Standards', hideFor:['member'] },
  { to:'/education', label:'Education', hideFor:['member'] },
  { to:'/tasks', label:'Tasks' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const role = localStorage.getItem('alm_role')
  const name = localStorage.getItem('alm_name')
  const logout = () => { localStorage.clear(); navigate('/login') }
  const links = NAV_LINKS.filter(l => !l.hideFor?.includes(role))

  return (
    <nav style={{
      background: 'var(--white)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 0 var(--border)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', height: 58 }}>

        {/* Logo */}
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginRight: '2rem', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--maroon)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 14, color: 'white', fontStyle: 'italic'
          }}>Λ</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Alpha Lambda Mu</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Shura Platform</div>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'auto' }}>
          {links.map(link => {
            const active = pathname === link.to
            return (
              <Link key={link.to} to={link.to} style={{
                padding: '0.38rem 0.85rem', borderRadius: 7, textDecoration: 'none',
                fontWeight: active ? 600 : 400, fontSize: '0.84rem', whiteSpace: 'nowrap',
                color: active ? 'var(--maroon)' : 'var(--text-secondary)',
                background: active ? 'var(--maroon-faint)' : 'transparent',
                transition: 'all 0.12s',
              }}>{link.label}</Link>
            )
          })}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0, marginLeft: '1rem' }}>
          <Link to="/members" style={{
            fontSize: '0.77rem', color: 'var(--text-muted)', textDecoration: 'none',
            border: '1px solid var(--border)', padding: '0.3rem 0.75rem', borderRadius: 6,
            fontWeight: 500, transition: 'all 0.12s',
          }}>Member Portal ↗</Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--maroon)', fontWeight: 500 }}>{ROLE_LABELS[role] || role}</div>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--maroon)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontStyle: 'italic'
            }}>{name?.charAt(0) || 'U'}</div>
          </div>

          <button onClick={logout} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}