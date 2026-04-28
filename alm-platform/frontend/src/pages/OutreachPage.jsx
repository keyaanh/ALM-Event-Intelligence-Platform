import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Megaphone, Instagram, Calendar, CheckCircle2, Circle, Plus, Loader2, Star } from 'lucide-react'

const MARKETING_CATEGORIES = new Set(['marketing'])

export default function OutreachPage() {
  const [events, setEvents] = useState([])
  const [marketingTasks, setMarketingTasks] = useState([])
  const [completed, setCompleted] = useState({})
  const [tab, setTab] = useState('tasks')
  const [socialPosts, setSocialPosts] = useState([])
  const [newPost, setNewPost] = useState({ event: '', platform: 'Instagram', notes: '', done: false })
  const role = localStorage.getItem('alm_role')
  const canEdit = role === 'vp_outreach' || role === 'president'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const { data } = await api.get('/events/')
    setEvents(data)
    // Pull all marketing tasks from all event checklists
    const tasks = []
    data.forEach(event => {
      (event.checklist || []).forEach((item, idx) => {
        if (item.category === 'marketing') {
          tasks.push({ ...item, event_id: event.id, event_name: event.name, event_date: event.date, task_key: `${event.id}-${idx}`, event_type: event.event_type })
        }
      })
    })
    tasks.sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    setMarketingTasks(tasks)
  }

  const toggleTask = (key) => {
    if (!canEdit) return
    setCompleted(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const addPost = () => {
    if (!newPost.event) return
    setSocialPosts(prev => [...prev, { ...newPost, id: Date.now(), created: new Date().toLocaleDateString() }])
    setNewPost({ event: '', platform: 'Instagram', notes: '', done: false })
  }

  const pending = marketingTasks.filter(t => !completed[t.task_key])
  const done = marketingTasks.filter(t => completed[t.task_key])

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 5)

  return (
    <div className="page">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Outreach</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.84rem', marginTop: 3 }}>Marketing tasks, social media, and chapter promotion</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Marketing Tasks', value: marketingTasks.length, icon: <Megaphone size={18} />, color: 'var(--maroon)' },
          { label: 'Pending', value: pending.length, icon: <Circle size={18} />, color: '#f59e0b' },
          { label: 'Completed', value: done.length, icon: <CheckCircle2 size={18} />, color: '#10b981' },
          { label: 'Upcoming Events', value: upcomingEvents.length, icon: <Calendar size={18} />, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[
          { key: 'tasks', label: `Marketing Tasks (${pending.length} pending)` },
          { key: 'social', label: 'Social Media Tracker' },
          { key: 'rush', label: 'Rush Week' },
          { key: 'spotlight', label: 'Brother Spotlight' },
        ].map(t => <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {/* Marketing Tasks — auto-pulled from AI checklists */}
      {tab === 'tasks' && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', padding: '0.6rem 0.9rem', background: 'var(--maroon-faint)', borderRadius: 8, border: '1px solid var(--maroon-subtle)' }}>
            <Megaphone size={14} color="var(--maroon)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--maroon)', fontWeight: 600 }}>These tasks are automatically pulled from AI-generated event checklists when Events creates a new event.</span>
          </div>

          {marketingTasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
              <Megaphone size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No marketing tasks yet</p>
              <p style={{ fontSize: '0.84rem', marginTop: 4 }}>Tasks will appear here when VP of Events creates events with AI checklists</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {marketingTasks.map(task => (
                <div key={task.task_key} onClick={() => toggleTask(task.task_key)}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: canEdit ? 'pointer' : 'default', opacity: completed[task.task_key] ? 0.6 : 1, borderLeft: `3px solid ${completed[task.task_key] ? '#10b981' : 'var(--maroon)'}`, padding: '0.9rem 1.25rem', transition: 'all 0.15s' }}>
                  {completed[task.task_key]
                    ? <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
                    : <Circle size={18} color="var(--gray-300)" style={{ flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '0.9rem', textDecoration: completed[task.task_key] ? 'line-through' : 'none' }}>{task.task}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--maroon)', fontWeight: 700, background: 'var(--maroon-faint)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>{task.event_name}</span>
                      {task.due_offset_days != null && <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{task.due_offset_days}d before event</span>}
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{new Date(task.event_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Social Media Tracker */}
      {tab === 'social' && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', flex: 1 }}>Track: 1 social media post per ALM event · 1 Brother Spotlight per month · Rush Week posts</p>
          </div>

          {canEdit && (
            <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'var(--maroon)', borderWidth: 1.5 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--maroon)', marginBottom: '1rem' }}>Log a social post</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label>Event</label>
                  <select value={newPost.event} onChange={e => setNewPost({ ...newPost, event: e.target.value })}>
                    <option value="">Select event...</option>
                    {events.map(ev => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Platform</label>
                  <select value={newPost.platform} onChange={e => setNewPost({ ...newPost, platform: e.target.value })}>
                    {['Instagram', 'Twitter/X', 'TikTok', 'Snapchat', 'LinkedIn', 'Other'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Notes / caption summary</label>
                  <input value={newPost.notes} onChange={e => setNewPost({ ...newPost, notes: e.target.value })} placeholder="Brief description of the post..." />
                </div>
              </div>
              <button className="btn btn-primary" onClick={addPost}><Plus size={14} /> Log Post</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {socialPosts.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gray-500)' }}>
                <Instagram size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontWeight: 600 }}>No posts logged yet</p>
              </div>
            ) : socialPosts.map(post => (
              <div key={post.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1.25rem' }}>
                <Instagram size={18} color="#8b5cf6" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{post.event} — {post.platform}</p>
                  {post.notes && <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>{post.notes}</p>}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{post.created}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rush Week */}
      {tab === 'rush' && (
        <div className="fade-in card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '1rem' }}>Rush Week Planning</h3>
          {[
            { task: 'Create Rush Week schedule for upcoming year', due: 'End of current school year' },
            { task: 'Submit schedule with Chapter Update form', due: 'End of current school year' },
            { task: 'Create recruitment video (1 per rush term)', due: 'Before semester begins' },
            { task: 'Design 2 shirts per semester', due: 'Submit with Chapter Update form' },
            { task: 'Plan rush week events & activities', due: '4 weeks before rush' },
            { task: 'Prepare marketing materials & flyers', due: '2 weeks before rush' },
            { task: 'Post rush week promo on social media', due: '1 week before rush' },
          ].map((item, i) => (
            <div key={i} onClick={() => canEdit && setCompleted(p => ({ ...p, [`rush-${i}`]: !p[`rush-${i}`] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0.5rem', borderBottom: '1px solid var(--border)', cursor: canEdit ? 'pointer' : 'default', borderRadius: 6, transition: 'background 0.1s' }}
              onMouseEnter={e => { if(canEdit) e.currentTarget.style.background = 'var(--gray-50)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              {completed[`rush-${i}`]
                ? <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                : <Circle size={16} color="var(--gray-300)" style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.84rem', color: completed[`rush-${i}`] ? 'var(--gray-300)' : 'var(--gray-900)', textDecoration: completed[`rush-${i}`] ? 'line-through' : 'none' }}>{item.task}</span>
                <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 1 }}>Due: {item.due}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brother Spotlight */}
      {tab === 'spotlight' && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', padding: '0.6rem 0.9rem', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
            <Star size={14} color="#92660a" />
            <span style={{ fontSize: '0.8rem', color: '#92660a', fontWeight: 600 }}>Post one Brother Spotlight per month to boost chapter morale and promote ALM on campus.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((month, i) => (
              <div key={month} className="card card-hover" onClick={() => canEdit && setCompleted(p => ({ ...p, [`spotlight-${i}`]: !p[`spotlight-${i}`] }))}
                style={{ padding: '1rem', cursor: canEdit ? 'pointer' : 'default', borderColor: completed[`spotlight-${i}`] ? '#86efac' : 'var(--border)', background: completed[`spotlight-${i}`] ? '#f0fdf4' : 'white', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{month}</span>
                  {completed[`spotlight-${i}`]
                    ? <CheckCircle2 size={16} color="#10b981" />
                    : <Circle size={16} color="var(--gray-300)" />}
                </div>
                <p style={{ fontSize: '0.75rem', color: completed[`spotlight-${i}`] ? '#166534' : 'var(--gray-400)', marginTop: 4 }}>
                  {completed[`spotlight-${i}`] ? 'Posted ✓' : 'Not posted yet'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}