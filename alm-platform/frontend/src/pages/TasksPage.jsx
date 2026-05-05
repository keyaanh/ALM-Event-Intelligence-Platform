import { useState, useEffect, useRef } from 'react'
import BudgetRequestModal from '../components/BudgetRequestModal'
import api from '../lib/api'
import { Plus, CheckSquare, Square, Loader2, Trash2, CheckCircle2, Clock, PlayCircle, Upload, FileText, X, Eye , DollarSign } from 'lucide-react'

const ROLE_LABELS = {
  vp_events: 'VP of Events', vp_finance: 'VP of Finance',
  vp_outreach: 'VP of Outreach', vp_standards: 'VP of Standards'
}
const ROLE_COLORS = {
  vp_events: '#3b82f6', vp_finance: '#7B1C2E',
  vp_outreach: '#8b5cf6', vp_standards: '#f59e0b'
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filterRole, setFilterRole] = useState('all')
  const [activeTab, setActiveTab] = useState('active')
  const [expandedTask, setExpandedTask] = useState(null)
  const [previewFile, setPreviewFile] = useState(null) // {name, dataUrl}
  const [form, setForm] = useState({
    title: '', description: '', assigned_roles: [], due_date: '', event_id: '', checklist: []
  })
  const [newCheckItem, setNewCheckItem] = useState('')
  const fileInputRef = useRef(null)
  const [pendingUploadTaskId, setPendingUploadTaskId] = useState(null)

  const role = localStorage.getItem('alm_role')
  const userName = localStorage.getItem('alm_name')
  const isPresident = role === 'president'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [tasksRes, eventsRes] = await Promise.all([api.get('/tasks/'), api.get('/events/')])
    setTasks(tasksRes.data)
    setEvents(eventsRes.data)
  }

  const isAssigned = (task) => {
    const assigned = task.assigned_roles || [task.assigned_role]
    return isPresident || assigned.includes(role)
  }

  const createTask = async (e) => {
    e.preventDefault()
    if (form.assigned_roles.length === 0) { alert('Select at least one role'); return }
    setCreating(true)
    try {
      await api.post('/tasks/', { ...form, event_id: form.event_id || null })
      setShowForm(false)
      setForm({ title: '', description: '', assigned_roles: [], due_date: '', event_id: '', checklist: [] })
      await fetchAll()
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
    finally { setCreating(false) }
  }

  const toggleRole = (r) => {
    setForm(f => ({
      ...f,
      assigned_roles: f.assigned_roles.includes(r)
        ? f.assigned_roles.filter(x => x !== r)
        : [...f.assigned_roles, r]
    }))
  }

  const updateStatus = async (taskId, status) => {
    await api.patch(`/tasks/${taskId}`, { status })
    await fetchAll()
  }

  const toggleCheckItem = async (task, itemIdx) => {
    const updated = task.checklist.map((item, i) => i === itemIdx ? { ...item, done: !item.done } : item)
    await api.patch(`/tasks/${task.id}`, { checklist: updated })
    await fetchAll()
  }

  const updateNotes = async (taskId, notes) => {
    await api.patch(`/tasks/${taskId}`, { notes })
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

  // File upload — convert to base64 and store in task.uploads via API
  const handleFileUpload = async (taskId, e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const task = tasks.find(t => t.id === taskId)
    const existingUploads = task?.uploads || []

    const newUploads = await Promise.all(files.map(file => new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result,
        uploadedBy: userName,
        uploadedByRole: role,
        uploadedAt: new Date().toLocaleString()
      })
      reader.readAsDataURL(file)
    })))

    await api.patch(`/tasks/${taskId}`, { uploads: [...existingUploads, ...newUploads] })
    await fetchAll()
    e.target.value = ''
  }

  const removeFile = async (task, fileName) => {
    const updated = (task.uploads || []).filter(f => f.name !== fileName)
    await api.patch(`/tasks/${task.id}`, { uploads: updated })
    await fetchAll()
  }

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const completedTasks = tasks.filter(t => t.status === 'done')

  const filterTasks = (list) => filterRole === 'all' ? list : list.filter(t => {
    const assigned = t.assigned_roles || [t.assigned_role]
    return assigned.includes(filterRole)
  })

  const TaskCard = ({ task }) => {
    const assigned = task.assigned_roles || [task.assigned_role]
    const canAct = isAssigned(task)
    const uploads = task.uploads || []

    return (
      <div className="card" style={{ marginBottom: '0.75rem', borderLeft: `3px solid ${assigned.length === 1 ? ROLE_COLORS[assigned[0]] : 'var(--maroon)'}`, opacity: task.status === 'done' ? 0.75 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ marginTop: 2 }}>
            {task.status === 'done' ? <CheckCircle2 size={16} color="#10b981" /> : task.status === 'in_progress' ? <PlayCircle size={16} color="#3b82f6" /> : <Clock size={16} color="#f59e0b" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
              {/* Role badges — show all assigned roles */}
              {assigned.map(r => (
                <span key={r} style={{ fontSize: '0.67rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: `${ROLE_COLORS[r]}15`, color: ROLE_COLORS[r] }}>{ROLE_LABELS[r]}</span>
              ))}
            </div>
            {task.description && <p style={{ fontSize: '0.81rem', color: 'var(--text-muted)', marginBottom: 4 }}>{task.description}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {task.event_name && <span style={{ fontSize: '0.71rem', color: 'var(--maroon)', background: 'var(--maroon-faint)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>📅 {task.event_name}</span>}
              {task.due_date && <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>Due {new Date(task.due_date).toLocaleDateString()}</span>}
              {uploads.length > 0 && <span style={{ fontSize: '0.71rem', color: 'var(--blue)', background: 'var(--blue-bg)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>📎 {uploads.length} file{uploads.length > 1 ? 's' : ''}</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            {canAct && task.status === 'todo' && (
              <button onClick={() => updateStatus(task.id, 'in_progress')} className="btn btn-ghost" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>Start</button>
            )}
            {canAct && task.status !== 'done' && (
              <button onClick={() => updateStatus(task.id, 'done')} className="btn btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: '#166534' }}>✓ Done</button>
            )}
            {canAct && task.status === 'done' && (
              <button onClick={() => updateStatus(task.id, 'todo')} className="btn btn-ghost" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>Reopen</button>
            )}
            {isPresident && (
              <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', padding: 4, borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color='var(--border-strong)'}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Expandable */}
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--maroon)', fontWeight: 600, padding: 0 }}>
            {expandedTask === task.id ? '▼ Hide details' : '▶ Show details'}
            {task.checklist?.length > 0 && ` · ${task.checklist.filter(i => i.done).length}/${task.checklist.length} checked`}
            {uploads.length > 0 && ` · ${uploads.length} attachment${uploads.length > 1 ? 's' : ''}`}
          </button>

          {expandedTask === task.id && (
            <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Checklist */}
              {task.checklist?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Checklist</p>
                  {task.checklist.map((item, i) => (
                    <div key={i} onClick={() => canAct && toggleCheckItem(task, i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.35rem 0.4rem', cursor: canAct ? 'pointer' : 'default', borderRadius: 6, transition: 'background 0.1s' }}
                      onMouseEnter={e => { if(canAct) e.currentTarget.style.background='var(--surface)' }}
                      onMouseLeave={e => { e.currentTarget.style.background='transparent' }}>
                      {item.done ? <CheckSquare size={14} color="#10b981" /> : <Square size={14} color="var(--gray-300)" />}
                      <span style={{ fontSize: '0.82rem', color: item.done ? 'var(--border-strong)' : 'var(--text-secondary)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes — editable for assignees, readable for all */}
              {canAct ? (
                <div className="form-group">
                  <label>Notes / update</label>
                  <textarea defaultValue={task.notes || ''} onBlur={e => updateNotes(task.id, e.target.value)} placeholder="Add progress notes or context..." style={{ minHeight: 65, resize: 'vertical' }} />
                </div>
              ) : task.notes ? (
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '0.65rem 0.9rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Notes</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{task.notes}</p>
                </div>
              ) : null}

              {/* Uploads — visible to everyone, uploadable by assignees */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Attachments</p>
                  {canAct && (
                    <>
                      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" multiple style={{ display: 'none' }}
                        onChange={e => handleFileUpload(pendingUploadTaskId, e)} />
                      <button onClick={() => { setPendingUploadTaskId(task.id); fileInputRef.current?.click() }}
                        className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Upload size={12} /> Upload File
                      </button>
                    </>
                  )}
                </div>

                {uploads.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--border-strong)', fontStyle: 'italic' }}>No attachments yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {uploads.map(file => (
                      <div key={file.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.55rem 0.85rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <FileText size={15} color="var(--maroon)" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>by {file.uploadedBy} ({ROLE_LABELS[file.uploadedByRole] || file.uploadedByRole}) · {file.uploadedAt}</p>
                        </div>
                        {/* Preview / open button — visible to ALL */}
                        {file.dataUrl && (
                          <button onClick={() => setPreviewFile(file)}
                            className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <Eye size={12} /> View
                          </button>
                        )}
                        {/* Remove — only uploader or president */}
                        {(file.uploadedByRole === role || isPresident) && (
                          <button onClick={() => removeFile(task, file.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color='var(--border-strong)'}>
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* File preview modal */}
      {previewFile && (
        <div onClick={() => setPreviewFile(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', maxWidth: '90vw', maxHeight: '90vh', width: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="var(--maroon)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{previewFile.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={previewFile.dataUrl} download={previewFile.name} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem' }}>Download</a>
                <button onClick={() => setPreviewFile(null)} className="btn btn-ghost" style={{ padding: '0.35rem 0.75rem' }}><X size={15} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
              {previewFile.type?.includes('image') ? (
                <img src={previewFile.dataUrl} alt={previewFile.name} style={{ maxWidth: '100%', borderRadius: 8 }} />
              ) : previewFile.type?.includes('pdf') ? (
                <iframe src={previewFile.dataUrl} style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 8 }} title={previewFile.name} />
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600 }}>Preview not available for this file type</p>
                  <a href={previewFile.dataUrl} download={previewFile.name} className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>Download File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Tasks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: 3 }}>
            {isPresident ? 'Assign and track tasks across all Shura roles' : 'Your assigned tasks from President'}
          </p>
        </div>
        {isPresident && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBudgetModal(true)} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <DollarSign size={13}/> Budget Request
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={15} /> Assign Task</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'var(--maroon)' },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'var(--blue)' },
          { label: 'Pending', value: tasks.filter(t => t.status === 'todo').length, color: 'var(--gold)' },
          { label: 'Completed', value: completedTasks.length, color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.1rem' }}>
            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && isPresident && (
        <div className="card fade-in" style={{ marginBottom: '1.75rem', borderColor: 'var(--maroon)', borderWidth: 1.5 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--maroon)', marginBottom: '1.1rem' }}>Assign new task</h3>
          <form onSubmit={createTask}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Task title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Create event agenda for Spring Mixer" required />
              </div>

              {/* Multi-role assignment */}
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Assign to (select one or more roles)</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 4 }}>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => toggleRole(v)} style={{
                      padding: '0.45rem 1rem', borderRadius: 8, border: '1.5px solid',
                      borderColor: form.assigned_roles.includes(v) ? ROLE_COLORS[v] : 'var(--border)',
                      background: form.assigned_roles.includes(v) ? `${ROLE_COLORS[v]}15` : 'white',
                      color: form.assigned_roles.includes(v) ? ROLE_COLORS[v] : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      {form.assigned_roles.includes(v) ? <CheckSquare size={13} /> : <Square size={13} />}
                      {l}
                    </button>
                  ))}
                </div>
                {form.assigned_roles.length === 0 && <p style={{ fontSize: '0.72rem', color: 'var(--red)', marginTop: 4 }}>Select at least one role</p>}
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
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What needs to be done..." />
              </div>
            </div>

            {/* Checklist builder */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Checklist items</p>
              {form.checklist.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Square size={13} color="var(--gray-300)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>{item.text}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, checklist: f.checklist.filter((_,idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)' }}><Trash2 size={12} /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCheckItem())} placeholder="Add checklist item and press Enter..." style={{ flex: 1 }} />
                <button type="button" onClick={addCheckItem} className="btn btn-ghost" style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem' }}>Add</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={creating || form.assigned_roles.length === 0}>
                {creating ? <><Loader2 size={14} className="spin" /> Creating…</> : 'Assign Task'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Role filter */}
      {isPresident && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[['all', 'All'], ...Object.entries(ROLE_LABELS)].map(([v, l]) => (
            <button key={v} onClick={() => setFilterRole(v)} className="btn" style={{
              padding: '0.35rem 0.9rem', fontSize: '0.78rem',
              background: filterRole === v ? (ROLE_COLORS[v] || 'var(--maroon)') : 'white',
              color: filterRole === v ? 'white' : 'var(--text-secondary)',
              border: '1.5px solid', borderColor: filterRole === v ? (ROLE_COLORS[v] || 'var(--maroon)') : 'var(--border)'
            }}>{l}</button>
          ))}
        </div>
      )}

      {/* Active / Completed toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', background: 'var(--surface)', borderRadius: 9, padding: 4, width: 'fit-content' }}>
        {[['active', `Active (${filterTasks(activeTasks).length})`], ['completed', `Completed (${filterTasks(completedTasks).length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '0.45rem 1.1rem', border: 'none', borderRadius: 6, cursor: 'pointer',
            background: activeTab === key ? 'white' : 'transparent',
            color: activeTab === key ? 'var(--maroon)' : 'var(--text-muted)',
            fontWeight: 700, fontSize: '0.82rem',
            boxShadow: activeTab === key ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s', fontFamily: 'var(--font-body)'
          }}>{label}</button>
        ))}
      </div>

      {/* Task lists */}
      {activeTab === 'active' && (
        <div className="fade-in">
          {filterTasks(activeTasks).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <CheckSquare size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No active tasks</p>
              {isPresident && <p style={{ fontSize: '0.84rem', marginTop: 4 }}>Use "Assign Task" to delegate work</p>}
            </div>
          ) : filterTasks(activeTasks).map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="fade-in">
          {filterTasks(completedTasks).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No completed tasks yet</p>
            </div>
          ) : filterTasks(completedTasks).map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      )}
      {showBudgetModal && <BudgetRequestModal onClose={() => setShowBudgetModal(false)} />}
    </div>
  )
}