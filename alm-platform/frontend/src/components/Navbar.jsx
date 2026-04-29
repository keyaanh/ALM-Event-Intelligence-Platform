import { Link, useNavigate, useLocation } from 'react-router-dom'

const ROLE_LABELS = {
  president:'President', vp_events:'VP of Events', vp_finance:'VP of Finance',
  vp_outreach:'VP of Outreach', vp_standards:'VP of Standards',
  vp_education:'VP of Education', member:'Member',
}

const ALL_NAV = [
  { to:'/dashboard', label:'Events' },
  { to:'/finance', label:'Finance', hideFor:['member'] },
  { to:'/outreach', label:'Outreach', hideFor:['member'] },
  { to:'/standards', label:'Standards', hideFor:['member'] },
  { to:'/education', label:'Education', hideFor:['member'] },
  { to:'/tasks', label:'Tasks' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = localStorage.getItem('alm_role')
  const name = localStorage.getItem('alm_name')
  const logout = () => { localStorage.clear(); navigate('/login') }
  const isActive = (path) => location.pathname === path
  const visibleLinks = ALL_NAV.filter(l => !l.hideFor?.includes(role))

  return (
    <nav style={{ background:'var(--white)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem', display:'flex', alignItems:'center', height:60 }}>
        <Link to="/dashboard" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:9, marginRight:'1.5rem', flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'var(--maroon)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, color:'white' }}>Λ</div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem', color:'var(--maroon)', lineHeight:1.1 }}>Alpha Lambda Mu</div>
            <div style={{ fontSize:'0.6rem', color:'var(--gray-500)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600 }}>Shura Platform</div>
          </div>
        </Link>

        <div style={{ display:'flex', gap:1, flex:1, overflow:'auto' }}>
          {visibleLinks.map(link => (
            <Link key={link.to} to={link.to} style={{ padding:'0.4rem 0.85rem', borderRadius:7, textDecoration:'none', fontWeight:600, fontSize:'0.81rem', whiteSpace:'nowrap', color:isActive(link.to)?'var(--maroon)':'var(--gray-500)', background:isActive(link.to)?'var(--maroon-faint)':'transparent', transition:'all 0.15s' }}>
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexShrink:0 }}>
          <Link to="/members" style={{ fontSize:'0.75rem', color:'var(--gray-500)', textDecoration:'none', border:'1px solid var(--border)', padding:'0.3rem 0.75rem', borderRadius:7, fontWeight:600, transition:'all 0.15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.color='var(--maroon)'; e.currentTarget.style.borderColor='var(--maroon)' }}
            onMouseLeave={e=>{ e.currentTarget.style.color='var(--gray-500)'; e.currentTarget.style.borderColor='var(--border)' }}>
            Member Portal
          </Link>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--gray-900)' }}>{name}</div>
            <div style={{ fontSize:'0.65rem', color:'var(--maroon)', fontWeight:600, letterSpacing:'0.03em' }}>{ROLE_LABELS[role]||role}</div>
          </div>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--maroon)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'0.85rem' }}>
            {name?.charAt(0)||'U'}
          </div>
          <button onClick={logout} className="btn btn-ghost" style={{ padding:'0.35rem 0.85rem', fontSize:'0.78rem' }}>Sign out</button>
        </div>
      </div>
    </nav>
  )
}