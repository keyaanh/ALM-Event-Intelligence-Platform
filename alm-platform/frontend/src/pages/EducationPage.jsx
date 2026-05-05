import { useState, useEffect } from 'react'
import BudgetRequestModal from '../components/BudgetRequestModal'
import api from '../lib/api'
import { Plus, Trash2, CheckSquare, Square, BookOpen, Users, CheckCircle2, Clock, Loader2, Edit3, Save, X , DollarSign } from 'lucide-react'

const SEMESTER = 'Spring 2026'
const STATUS_STYLE = {
  in_progress: { bg:'#fffbeb', color:'#92660a', border:'var(--yellow-border)', label:'In Progress' },
  initiated:   { bg:'#f0fdf4', color:'#166534', border:'var(--green-border)', label:'Initiated ✓' },
  dropped:     { bg:'#fef2f2', color:'#991b1b', border:'var(--red-border)', label:'Dropped' },
}
const MODULE_COLORS = {
  general:'#3b82f6', pledge:'var(--maroon)', spiritual:'#10b981', professional:'#8b5cf6'
}

export default function EducationPage() {
  const [pledges, setPledges] = useState([])
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [modules, setModules] = useState([])
  const [tab, setTab] = useState('pledges')
  const [showPledgeForm, setShowPledgeForm] = useState(false)
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [expandedPledge, setExpandedPledge] = useState(null)
  const [pledgeForm, setPledgeForm] = useState({ full_name:'', email:'', phone:'', notes:'' })
  const [moduleForm, setModuleForm] = useState({ title:'', description:'', module_type:'general', attendee_count:0, notes:'' })
  const [creating, setCreating] = useState(false)
  const [editingNotes, setEditingNotes] = useState({})

  const role = localStorage.getItem('alm_role')
  const canEdit = role === 'vp_education' || role === 'president'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [pRes, mRes] = await Promise.all([
      api.get(`/education/pledges/${SEMESTER}`),
      api.get(`/education/modules/${SEMESTER}`)
    ])
    setPledges(pRes.data)
    setModules(mRes.data)
  }

  const createPledge = async (e) => {
    e.preventDefault(); setCreating(true)
    try {
      await api.post('/education/pledges', { ...pledgeForm, semester: SEMESTER })
      setShowPledgeForm(false)
      setPledgeForm({ full_name:'', email:'', phone:'', notes:'' })
      await fetchAll()
    } catch (err) { alert('Failed') }
    finally { setCreating(false) }
  }

  const createModule = async (e) => {
    e.preventDefault(); setCreating(true)
    try {
      await api.post('/education/modules', { ...moduleForm, semester: SEMESTER })
      setShowModuleForm(false)
      setModuleForm({ title:'', description:'', module_type:'general', attendee_count:0, notes:'' })
      await fetchAll()
    } catch (err) { alert('Failed') }
    finally { setCreating(false) }
  }

  const toggleRequirement = async (pledge, reqId) => {
    if (!canEdit) return
    const updated = pledge.requirements.map(r => r.id === reqId ? { ...r, done: !r.done } : r)
    await api.patch(`/education/pledges/${pledge.id}`, { requirements: updated })
    await fetchAll()
  }

  const updatePledgeStatus = async (pledgeId, status) => {
    await api.patch(`/education/pledges/${pledgeId}`, { status })
    await fetchAll()
  }

  const toggleModule = async (module) => {
    if (!canEdit) return
    await api.patch(`/education/modules/${module.id}`, {
      completed: !module.completed,
      completed_date: !module.completed ? new Date().toISOString().split('T')[0] : null
    })
    await fetchAll()
  }

  const deletePledge = async (id) => {
    if (!confirm('Remove pledge?')) return
    await api.delete(`/education/pledges/${id}`)
    await fetchAll()
  }

  const deleteModule = async (id) => {
    if (!confirm('Remove module?')) return
    await api.delete(`/education/modules/${id}`)
    await fetchAll()
  }

  const initiated = pledges.filter(p => p.status === 'initiated').length
  const inProgress = pledges.filter(p => p.status === 'in_progress').length
  const modulesCompleted = modules.filter(m => m.completed).length

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontSize:'1.75rem', letterSpacing:'-0.02em' }}>Education</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.84rem', marginTop:3 }}>Pledge tracker, education modules, and member development</p>
        </div>
        {canEdit && (
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBudgetModal(true)} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <DollarSign size={13}/> Budget Request
            </button>
            <button className="btn btn-primary" onClick={() => tab === 'pledges' ? setShowPledgeForm(!showPledgeForm) : setShowModuleForm(!showModuleForm)}>
              <Plus size={15}/> {tab === 'pledges' ? 'Add Pledge' : 'Add Module'}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.75rem' }}>
        {[
          { label:'Total Pledges', value:pledges.length, color:'var(--maroon)' },
          { label:'In Progress', value:inProgress, color:'#f59e0b' },
          { label:'Initiated', value:initiated, color:'#10b981' },
          { label:'Modules Done', value:`${modulesCompleted}/${modules.length}`, color:'#3b82f6' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign:'center', padding:'1.1rem' }}>
            <div style={{ fontSize:'1.5rem', fontFamily:'var(--font-display)', fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[{ key:'pledges', label:`Pledge Tracker (${pledges.length})` }, { key:'modules', label:`Education Modules (${modules.length})` }].map(t => (
          <button key={t.key} className={`tab ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ── PLEDGE TRACKER ── */}
      {tab === 'pledges' && (
        <div className="fade-in">
          {showPledgeForm && canEdit && (
            <div className="card fade-in" style={{ marginBottom:'1.25rem', borderColor:'var(--maroon)', borderWidth:1.5 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color:'var(--maroon)', marginBottom:'1rem' }}>Add new pledge</h3>
              <form onSubmit={createPledge}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
                  <div className="form-group"><label>Full name</label><input value={pledgeForm.full_name} onChange={e=>setPledgeForm({...pledgeForm,full_name:e.target.value})} placeholder="Brother's name" required/></div>
                  <div className="form-group"><label>Phone</label><input value={pledgeForm.phone} onChange={e=>setPledgeForm({...pledgeForm,phone:e.target.value})} placeholder="(555) 000-0000"/></div>
                  <div className="form-group"><label>Email</label><input type="email" value={pledgeForm.email} onChange={e=>setPledgeForm({...pledgeForm,email:e.target.value})} placeholder="pledge@email.com"/></div>
                  <div className="form-group"><label>Notes</label><input value={pledgeForm.notes} onChange={e=>setPledgeForm({...pledgeForm,notes:e.target.value})} placeholder="Any notes..."/></div>
                </div>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  <button className="btn btn-primary" type="submit" disabled={creating}>{creating?<><Loader2 size={14} className="spin"/> Adding…</>:'Add Pledge'}</button>
                  <button className="btn btn-ghost" type="button" onClick={()=>setShowPledgeForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {pledges.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
              <Users size={32} style={{ margin:'0 auto 0.75rem', opacity:0.3 }}/>
              <p style={{ fontWeight:600 }}>No pledges this semester</p>
              {canEdit && <p style={{ fontSize:'0.84rem', marginTop:4 }}>Add pledges using the button above</p>}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {pledges.map(pledge => {
                const st = STATUS_STYLE[pledge.status]
                const reqs = pledge.requirements || []
                const done = reqs.filter(r => r.done).length
                const pct = reqs.length > 0 ? Math.round((done/reqs.length)*100) : 0
                const isExpanded = expandedPledge === pledge.id

                return (
                  <div key={pledge.id} className="card">
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'1rem' }}>
                      {/* Progress circle */}
                      <div style={{ width:48, height:48, borderRadius:'50%', background:`conic-gradient(var(--maroon) ${pct*3.6}deg, var(--gray-100) 0deg)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--maroon)' }}>{pct}%</span>
                        </div>
                      </div>

                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.95rem' }}>{pledge.full_name}</span>
                          <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'0.15rem 0.55rem', borderRadius:99, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>{st.label}</span>
                        </div>
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                          {pledge.phone && <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>📞 {pledge.phone}</span>}
                          {pledge.email && <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>✉️ {pledge.email}</span>}
                          <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{done}/{reqs.length} requirements</span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height:4, background:'var(--surface)', borderRadius:99, marginTop:6, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:'var(--maroon)', borderRadius:99, transition:'width 0.4s' }}/>
                        </div>
                      </div>

                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        {canEdit && pledge.status === 'in_progress' && (
                          <button onClick={()=>updatePledgeStatus(pledge.id,'initiated')} className="btn btn-primary" style={{ padding:'0.3rem 0.75rem', fontSize:'0.75rem', background:'#166534' }}>✓ Initiate</button>
                        )}
                        <button onClick={()=>setExpandedPledge(isExpanded?null:pledge.id)} className="btn btn-ghost" style={{ padding:'0.3rem 0.75rem', fontSize:'0.75rem' }}>
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                        {canEdit && <button onClick={()=>deletePledge(pledge.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--border-strong)', padding:4 }} onMouseEnter={e=>e.currentTarget.style.color='#ef4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--border-strong)'}><Trash2 size={14}/></button>}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--border)' }}>
                        <p style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.6rem' }}>Requirements Checklist</p>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                          {reqs.map(req => (
                            <div key={req.id} onClick={()=>canEdit && toggleRequirement(pledge, req.id)}
                              style={{ display:'flex', alignItems:'center', gap:7, padding:'0.4rem 0.5rem', cursor:canEdit?'pointer':'default', borderRadius:6, transition:'background 0.1s', background:req.done?'#f0fdf4':'transparent' }}
                              onMouseEnter={e=>{if(canEdit)e.currentTarget.style.background='var(--surface)'}}
                              onMouseLeave={e=>{e.currentTarget.style.background=req.done?'#f0fdf4':'transparent'}}>
                              {req.done ? <CheckSquare size={13} color="#10b981"/> : <Square size={13} color="var(--gray-300)"/>}
                              <span style={{ fontSize:'0.79rem', color:req.done?'var(--text-muted)':'var(--text-secondary)', textDecoration:req.done?'line-through':'none' }}>{req.task}</span>
                            </div>
                          ))}
                        </div>
                        {pledge.notes && <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.75rem', padding:'0.6rem 0.75rem', background:'var(--surface)', borderRadius:8 }}>{pledge.notes}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── EDUCATION MODULES ── */}
      {tab === 'modules' && (
        <div className="fade-in">
          {showModuleForm && canEdit && (
            <div className="card fade-in" style={{ marginBottom:'1.25rem', borderColor:'var(--maroon)', borderWidth:1.5 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color:'var(--maroon)', marginBottom:'1rem' }}>Add education module</h3>
              <form onSubmit={createModule}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}><label>Module title</label><input value={moduleForm.title} onChange={e=>setModuleForm({...moduleForm,title:e.target.value})} placeholder="e.g. ALM History & Values" required/></div>
                  <div className="form-group"><label>Type</label>
                    <select value={moduleForm.module_type} onChange={e=>setModuleForm({...moduleForm,module_type:e.target.value})}>
                      {[['general','General'],['pledge','Pledge Education'],['spiritual','Spiritual / Halaqah'],['professional','Professional Development']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Expected attendees</label><input type="number" value={moduleForm.attendee_count} onChange={e=>setModuleForm({...moduleForm,attendee_count:parseInt(e.target.value)||0})} placeholder="0"/></div>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}><label>Description</label><input value={moduleForm.description} onChange={e=>setModuleForm({...moduleForm,description:e.target.value})} placeholder="What will be covered..."/></div>
                </div>
                <div style={{ display:'flex', gap:'0.75rem' }}>
                  <button className="btn btn-primary" type="submit" disabled={creating}>{creating?'Adding…':'Add Module'}</button>
                  <button className="btn btn-ghost" type="button" onClick={()=>setShowModuleForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {modules.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
              <BookOpen size={32} style={{ margin:'0 auto 0.75rem', opacity:0.3 }}/>
              <p style={{ fontWeight:600 }}>No modules yet</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:'1rem' }}>
              {modules.map(mod => (
                <div key={mod.id} className="card card-hover" onClick={()=>canEdit && toggleModule(mod)}
                  style={{ cursor:canEdit?'pointer':'default', borderLeft:`3px solid ${MODULE_COLORS[mod.module_type]||'var(--maroon)'}`, opacity:mod.completed?0.75:1, background:mod.completed?'var(--surface)':'white' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, color:MODULE_COLORS[mod.module_type], textTransform:'uppercase', letterSpacing:'0.05em' }}>{mod.module_type.replace('_',' ')}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {mod.completed ? <CheckCircle2 size={16} color="#10b981"/> : <Clock size={16} color="#f59e0b"/>}
                      {canEdit && <button onClick={e=>{e.stopPropagation();deleteModule(mod.id)}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--border-strong)', padding:2 }} onMouseEnter={e=>e.currentTarget.style.color='#ef4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--border-strong)'}><Trash2 size={13}/></button>}
                    </div>
                  </div>
                  <p style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:4, textDecoration:mod.completed?'line-through':'none' }}>{mod.title}</p>
                  {mod.description && <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:6 }}>{mod.description}</p>}
                  <div style={{ display:'flex', gap:8 }}>
                    {mod.attendee_count > 0 && <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>👥 {mod.attendee_count} attendees</span>}
                    {mod.completed_date && <span style={{ fontSize:'0.72rem', color:'#166534' }}>✓ {new Date(mod.completed_date).toLocaleDateString()}</span>}
                  </div>
                  {canEdit && <p style={{ fontSize:'0.7rem', color:'var(--border-strong)', marginTop:8, fontStyle:'italic' }}>Click to toggle complete</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {showBudgetModal && <BudgetRequestModal onClose={() => setShowBudgetModal(false)} />}
    </div>
  )
}