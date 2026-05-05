import { useState, useEffect } from 'react'
import BudgetRequestModal from '../components/BudgetRequestModal'
import api from '../lib/api'
import { Megaphone, CheckCircle2, Circle, Plus, ExternalLink , DollarSign } from 'lucide-react'

const SOCIAL_PLATFORMS = [
  { name: 'Instagram', url: 'https://instagram.com', color: '#E1306C', bg: '#fdf2f7', icon: '📸', description: 'Post after every event · Brother Spotlight monthly' },
  { name: 'Canva', url: 'https://canva.com', color: '#00C4CC', bg: '#f0fffe', icon: '🎨', description: 'Design flyers, shirts, and marketing materials' },
  { name: 'LinkedIn', url: 'https://linkedin.com', color: '#0A66C2', bg: '#f0f6ff', icon: '💼', description: 'Professional chapter updates and member spotlights' },
  { name: 'GroupMe', url: 'https://groupme.com', color: '#00AFF0', bg: '#f0faff', icon: '💬', description: 'Chapter-wide announcements and event reminders' },
  { name: 'iMessage / SMS', url: null, color: '#34C759', bg: '#f0fdf4', icon: '📱', description: 'Direct member communications' },
  { name: 'Email', url: 'mailto:', color: 'var(--gold)', bg: '#fffbeb', icon: '✉️', description: 'Formal communications and newsletters' },
]

export default function OutreachPage() {
  const [events, setEvents] = useState([])
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [marketingTasks, setMarketingTasks] = useState([])
  const [completed, setCompleted] = useState({})
  const [tab, setTab] = useState('tasks')
  const [socialPosts, setSocialPosts] = useState([])
  const [newPost, setNewPost] = useState({ event: '', platform: 'Instagram', notes: '' })
  const role = localStorage.getItem('alm_role')
  const canEdit = role === 'vp_outreach' || role === 'president'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data } = await api.get('/events/')
    setEvents(data)
    const tasks = []
    data.forEach(event => {
      (event.checklist || []).forEach((item, idx) => {
        if (item.category === 'marketing') {
          tasks.push({ ...item, event_id: event.id, event_name: event.name, event_date: event.date, task_key: `${event.id}-${idx}` })
        }
      })
    })
    tasks.sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    setMarketingTasks(tasks)
  }

  const toggleTask = (key) => { if (!canEdit) return; setCompleted(prev => ({ ...prev, [key]: !prev[key] })) }

  const addPost = () => {
    if (!newPost.event || !newPost.platform) return
    setSocialPosts(prev => [...prev, { ...newPost, id: Date.now(), created: new Date().toLocaleDateString() }])
    setNewPost({ event: '', platform: 'Instagram', notes: '' })
  }

  const pending = marketingTasks.filter(t => !completed[t.task_key])
  const done = marketingTasks.filter(t => completed[t.task_key])
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 5)

  return (
    <div className="page">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Outreach</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: 3 }}>Marketing tasks, social media, and chapter promotion</p>
      <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowBudgetModal(true)}
            style={{ display:'flex', alignItems:'center', gap:5 }}>
            <DollarSign size={13}/> Budget Request
          </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Marketing Tasks', value: marketingTasks.length, color: 'var(--maroon)' },
          { label: 'Pending', value: pending.length, color: 'var(--gold)' },
          { label: 'Completed', value: done.length, color: 'var(--green)' },
          { label: 'Upcoming Events', value: upcomingEvents.length, color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="card card-hover" style={{ textAlign: 'center', padding: '1.1rem' }}>
            <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[
          { key: 'tasks', label: `Marketing Tasks (${pending.length} pending)` },
          { key: 'social', label: 'Social Media Hub' },
          { key: 'spotlight', label: 'Brother Spotlight' },
        ].map(t => <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {/* Marketing Tasks */}
      {tab === 'tasks' && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', padding: '0.6rem 0.9rem', background: 'var(--maroon-faint)', borderRadius: 8, border: '1px solid var(--maroon-subtle)' }}>
            <Megaphone size={13} color="var(--maroon)" />
            <span style={{ fontSize: '0.79rem', color: 'var(--maroon)', fontWeight: 600 }}>Auto-pulled from AI event checklists. Click to mark complete.</span>
          </div>
          {marketingTasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Megaphone size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No marketing tasks yet</p>
              <p style={{ fontSize: '0.84rem', marginTop: 4 }}>Tasks appear here when Events creates events with AI checklists</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {marketingTasks.map(task => (
                <div key={task.task_key} onClick={() => toggleTask(task.task_key)} className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: canEdit ? 'pointer' : 'default', opacity: completed[task.task_key] ? 0.6 : 1, borderLeft: `3px solid ${completed[task.task_key] ? '#10b981' : 'var(--maroon)'}`, padding: '0.9rem 1.25rem', transition: 'all 0.15s' }}>
                  {completed[task.task_key] ? <CheckCircle2 size={17} color="#10b981" style={{ flexShrink: 0 }} /> : <Circle size={17} color="var(--gray-300)" style={{ flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', textDecoration: completed[task.task_key] ? 'line-through' : 'none' }}>{task.task}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: '0.71rem', color: 'var(--maroon)', background: 'var(--maroon-faint)', padding: '0.15rem 0.5rem', borderRadius: 99, fontWeight: 700 }}>{task.event_name}</span>
                      {task.due_offset_days != null && <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{task.due_offset_days}d before</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Social Media Hub */}
      {tab === 'social' && (
        <div className="fade-in">
          {/* Platform links grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            {SOCIAL_PLATFORMS.map(platform => (
              <div key={platform.name} className="card card-hover" style={{ background: platform.bg, border: `1px solid ${platform.color}25` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{platform.icon}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: platform.color }}>{platform.name}</span>
                  </div>
                  {platform.url && (
                    <a href={platform.url} target="_blank" rel="noopener noreferrer" style={{ color: platform.color, opacity: 0.7, transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='1'} onMouseLeave={e => e.currentTarget.style.opacity='0.7'}>
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{platform.description}</p>
              </div>
            ))}
          </div>

          {/* Post tracker */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem' }}>Post Tracker</h3>
            {canEdit && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', marginBottom: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Event</label>
                  <select value={newPost.event} onChange={e => setNewPost({ ...newPost, event: e.target.value })}>
                    <option value="">Select event...</option>
                    {events.map(ev => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Platform</label>
                  <select value={newPost.platform} onChange={e => setNewPost({ ...newPost, platform: e.target.value })}>
                    {SOCIAL_PLATFORMS.map(p => <option key={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Caption notes</label>
                  <input value={newPost.notes} onChange={e => setNewPost({ ...newPost, notes: e.target.value })} placeholder="Brief description..." />
                </div>
                <button className="btn btn-primary" onClick={addPost} style={{ marginBottom: 0 }}><Plus size={14} /> Log</button>
              </div>
            )}
            {socialPosts.length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>No posts logged yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {socialPosts.map(post => {
                  const plat = SOCIAL_PLATFORMS.find(p => p.name === post.platform)
                  return (
                    <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem', background: plat?.bg || 'var(--surface)', borderRadius: 8, border: `1px solid ${plat?.color || 'var(--border)'}20` }}>
                      <span style={{ fontSize: 18 }}>{plat?.icon || '📱'}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.84rem', color: plat?.color }}>{post.platform}</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: 8 }}>{post.event}</span>
                        {post.notes && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>— {post.notes}</span>}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{post.created}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brother Spotlight */}
      {tab === 'spotlight' && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', padding: '0.6rem 0.9rem', background: 'var(--yellow-bg)', borderRadius: 8, border: '1px solid #fde68a' }}>
            <span>⭐</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--yellow)', fontWeight: 600 }}>Post one Brother Spotlight per month — boosts morale and promotes ALM on campus.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((month, i) => (
              <div key={month} className="card card-hover" onClick={() => canEdit && setCompleted(p => ({ ...p, [`spotlight-${i}`]: !p[`spotlight-${i}`] }))}
                style={{ padding: '1rem', cursor: canEdit ? 'pointer' : 'default', borderColor: completed[`spotlight-${i}`] ? 'var(--green-border)' : 'var(--border)', background: completed[`spotlight-${i}`] ? '#f0fdf4' : 'white', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{month}</span>
                  {completed[`spotlight-${i}`] ? <CheckCircle2 size={16} color="#10b981" /> : <Circle size={16} color="var(--gray-300)" />}
                </div>
                <p style={{ fontSize: '0.75rem', color: completed[`spotlight-${i}`] ? '#166534' : 'var(--text-muted)', marginTop: 4 }}>
                  {completed[`spotlight-${i}`] ? '✓ Posted' : 'Not posted yet'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {showBudgetModal && <BudgetRequestModal onClose={() => setShowBudgetModal(false)} />}
    </div>
  )
}