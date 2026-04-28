import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Plus, CheckSquare, Square, Loader2, Trash2, AlertCircle, CheckCircle2, Clock, PlayCircle } from 'lucide-react'

const ROLE_LABELS = { vp_events: 'VP of Events', vp_finance: 'VP of Finance', vp_outreach: 'VP of Outreach', vp_standards: 'VP of Standards' }
const ROLE_COLORS = { vp_events: '#3b82f6', vp_finance: 'var(--maroon)', vp_outreach: '#8b5cf6', vp_standards: '#f59e0b' }
const STATUS_ICON = { todo: <Clock size={14} color="#f59e0b" />, in_progress: <PlayCircle size={14} color="#3b82f6" />, done: <CheckCircle2 size={14} color="#10b981" /> }

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filterRole, setFilterRole] = useState('all')
  const [form, setForm] = useState({ title: '', description: '', assigned_role: 'vp_events', due_date: '', event_id: '', checklist: [] })
  const [newCheckItem, setNewCheckItem] = useState('')
  const [expandedTask, setExpandedTask] = useState(null)
  const role = localStorage.getItem('alm_role')
  const isPresident = role === 'president'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [tasksRes, eventsRes] = await Promise.all([api.get('/tasks/'), api.get('/events/')])
    setTasks(tasksRes.data)
    setEvents(eventsRes.data)
  }

  const createTask = async (e) => {
    e.preventDefault(); setCreating(true)
    try {
      await api.post('/tasks/', { ...form, event_id: form.event_id || null })
      setShowForm(false)
      setForm({ title: '', description: '', assigned_role: 'vp_events', due_date: '', event_id: '', checklist: [] })
      await fetchAll()
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
    finally { setCreating(false) }
  }

  const updateStatus = async (taskId, status) => {
    await api.patch(`/tasks/${taskId}`, { status })
    await fetchAll()
  }

  const toggleCheckItem = async (task, itemIdx) => {
    const updatedChecklist = task.checklist.map((item, i) =>
      i === itemIdx ? { ...item, done: !item.done } : item
    )
    await api.patch(`/tasks/${task.id}`, { checklist: updatedChecklist })
    await fetchAll()
  }

  const updateNotes = async (taskId, notes) => {
    await api.patch(`/tasks/${taskId}`, { notes })
    await fetchAll()
  }

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    await api.delete(`/tasks/${taskId}`)
    await fetchAll()
  }

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return
    setForm(f => ({ ...f, checklist: [...f.checklist, { text: newCheckItem.trim(), done: false }] }))
    setNewCheckItem('')
  }

  const filtered = filterRole === 'all' ? tasks : tasks.filter(t => t.assigned_role === filterRole)
  const myTasks = tasks.filter(t => t.assigned_role === role)
  const pendingCount = tasks.filter(t => t.status !== 'done').length

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Tasks</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.84rem', marginTop: 3 }}>
            {isPresident ? 'Assign and track tasks across all Shura roles' : `Your assigned tasks from President`}
          </p>
        </div>
        {isPresident && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={15} /> Assign Task
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'var(--maroon)' },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
          { label: 'Pending', value: pendingCount, color: '#f59e0b' },
          { label: 'Completed', value: tasks.filter(t => t.status === 'done').length, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.1rem' }}>
            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create task form */}
      {showForm && isPresident && (
        <div className="card fade-in" style={{ marginBottom: '1.75rem', borderColor: 'var(--maroon)', borderWidth: 1.5 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--maroon)', marginBottom: '1.1rem' }}>Assign new task</h3>
          <form onSubmit={createTask}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Task title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Create event agenda for Spring Mixer" required />
              </div>
              <div className="form-group">
                <label>Assign to</label>
                <select value={form.assigned_role} onChange={e => setForm({ ...form, assigned_role: e.target.value })}>
                  {Object.entries(ROLE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Due date</label>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Related event (optional)</label>
                <select value={form.event_id} onChange={e => setForm({ ...form, event_id: e.target.value })}>
                  <option value="">No specific event</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What needs to be done..." />
              </div>
            </div>

            {/* Checklist builder */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Checklist items</p>
              {form.checklist.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Square size={13} color="var(--gray-300)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--gray-700)' }}>{item.text}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, checklist: f.checklist.filter((_,idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)', marginLeft: 'auto' }}><Trash2 size={12} /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckItem())} placeholder="Add checklist item..." style={{ flex: 1 }} />
                <button type="button" onClick={addCheckItem} className="btn btn-ghost" style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem' }}>Add</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? <><Loader2 size={14} className="spin" /> Creating…</> : 'Assign Task'}</button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Role filter (president only) */}
      {isPresident && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button onClick={() => setFilterRole('all')} className="btn" style={{ padding: '0.35rem 0.9rem', fontSize: '0.78rem', background: filterRole === 'all' ? 'var(--maroon)' : 'white', color: filterRole === 'all' ? 'white' : 'var(--gray-700)', border: '1.5px solid', borderColor: filterRole === 'all' ? 'var(--maroon)' : 'var(--border)' }}>All</button>
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <button key={v} onClick={() => setFilterRole(v)} className="btn" style={{ padding: '0.35rem 0.9rem', fontSize: '0.78rem', background: filterRole === v ? ROLE_COLORS[v] : 'white', color: filterRole === v ? 'white' : 'var(--gray-700)', border: '1.5px solid', borderColor: filterRole === v ? ROLE_COLORS[v] : 'var(--border)' }}>{l}</button>
          ))}
        </div>
      )}

      {/* Tasks list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            <CheckSquare size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No tasks yet</p>
            {isPresident && <p style={{ fontSize: '0.84rem', marginTop: 4 }}>Use "Assign Task" to delegate work to your Shura officers</p>}
          </div>
        ) : filtered.map(task => (
          <div key={task.id} className="card" style={{ borderLeft: `3px solid ${ROLE_COLORS[task.assigned_role]}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ marginTop: 2 }}>{STATUS_ICON[task.status]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.95rem' }}>{task.title}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: 99, background: `${ROLE_COLORS[task.assigned_role]}15`, color: ROLE_COLORS[task.assigned_role] }}>{ROLE_LABELS[task.assigned_role]}</span>
                </div>
                {task.description && <p style={{ fontSize: '0.81rem', color: 'var(--gray-500)', marginBottom: 4 }}>{task.description}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {task.event_name && <span style={{ fontSize: '0.71rem', color: 'var(--maroon)', background: 'var(--maroon-faint)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>📅 {task.event_name}</span>}
                  {task.due_date && <span style={{ fontSize: '0.71rem', color: 'var(--gray-400)' }}>Due {new Date(task.due_date).toLocaleDateString()}</span>}
                </div>
              </div>

              {/* Status controls — assignee or president */}
              {(role === task.assigned_role || isPresident) && task.status !== 'done' && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {task.status === 'todo' && (
                    <button onClick={() => updateStatus(task.id, 'in_progress')} className="btn btn-ghost" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>Start</button>
                  )}
                  <button onClick={() => updateStatus(task.id, 'done')} className="btn btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>Mark Done</button>
                </div>
              )}
              {task.status === 'done' && <span className="badge badge-approved">Done</span>}
              {isPresident && <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)', padding: 4 }} onMouseEnter={e => e.target.style.color='#ef4444'} onMouseLeave={e => e.target.style.color='var(--gray-300)'}><Trash2 size={14} /></button>}
            </div>

            {/* Expandable checklist + notes */}
            {(task.checklist?.length > 0 || (role === task.assigned_role || isPresident)) && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--maroon)', fontWeight: 600, padding: 0 }}>
                  {expandedTask === task.id ? '▼ Hide details' : '▶ Show details'}
                  {task.checklist?.length > 0 && ` · ${task.checklist.filter(i => i.done).length}/${task.checklist.length} checked`}
                </button>

                {expandedTask === task.id && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {task.checklist?.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        {task.checklist.map((item, i) => (
                          <div key={i} onClick={() => (role === task.assigned_role || isPresident) && toggleCheckItem(task, i)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.35rem 0', cursor: (role === task.assigned_role || isPresident) ? 'pointer' : 'default' }}>
                            {item.done ? <CheckSquare size={14} color="#10b981" /> : <Square size={14} color="var(--gray-300)" />}
                            <span style={{ fontSize: '0.82rem', color: item.done ? 'var(--gray-300)' : 'var(--gray-700)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(role === task.assigned_role || isPresident) && (
                      <div className="form-group">
                        <label>Notes / update</label>
                        <textarea
                          defaultValue={task.notes || ''}
                          onBlur={e => updateNotes(task.id, e.target.value)}
                          placeholder="Add progress notes, upload info, or context..."
                          style={{ minHeight: 70, resize: 'vertical' }}
                        />
                      </div>
                    )}
                    {task.notes && role !== task.assigned_role && !isPresident && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--gray-700)', background: 'var(--gray-50)', padding: '0.6rem 0.75rem', borderRadius: 8 }}>{task.notes}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}