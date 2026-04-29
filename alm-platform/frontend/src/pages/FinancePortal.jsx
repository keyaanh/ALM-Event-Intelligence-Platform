import { useState, useEffect } from 'react'
import api from '../lib/api'
import {
  CheckCircle2, XCircle, Clock, RotateCcw, AlertTriangle,
  DollarSign, TrendingUp, Plus, ArrowDownCircle, Trash2,
  Loader2, Users, Edit3, Save, X, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from 'recharts'

const STATUS_ICON = {
  pending: <Clock size={14} color="#f59e0b" />,
  approved: <CheckCircle2 size={14} color="#10b981" />,
  rejected: <XCircle size={14} color="#ef4444" />,
  needs_revision: <RotateCcw size={14} color="#3b82f6" />
}
const SOURCE_COLORS = { dues:'#7B1C2E', fundraiser:'#f59e0b', donation:'#10b981', national:'#3b82f6', campus:'#8b5cf6', other:'#6b7280' }
const SOURCE_LABELS = { dues:'Member Dues', fundraiser:'Fundraiser', donation:'Donation', national:'National ALM', campus:'Campus Grant', other:'Other' }
const DUES_STATUS_STYLE = {
  paid:    { bg:'#f0fdf4', color:'#166534', border:'#86efac', label:'Paid' },
  partial: { bg:'#fffbeb', color:'#92660a', border:'#fde68a', label:'Partial' },
  unpaid:  { bg:'#fef2f2', color:'#991b1b', border:'#fca5a5', label:'Unpaid' },
  exempt:  { bg:'#eff6ff', color:'#1d4ed8', border:'#93c5fd', label:'Exempt' },
}
const CATEGORY_OPTIONS = ['active','pledge','hiatus','alumni']
const CATEGORY_DUES = { active:180, pledge:225, hiatus:75, alumni:0 }
const EXPENSE_CATS = ['Merchandise','National Dues','Retreat','Events','Miscellaneous']
const CURRENT_SEMESTER = 'Spring 2026'

export default function FinancePortal() {
  const [requests, setRequests] = useState([])
  const [income, setIncome] = useState([])
  const [budget, setBudget] = useState(null)
  const [events, setEvents] = useState([])
  const [dues, setDues] = useState([])
  const [projection, setProjection] = useState(null)
  const [categories, setCategories] = useState([])
  const [tab, setTab] = useState('overview')
  const [reviewing, setReviewing] = useState({})
  const [notes, setNotes] = useState({})
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ amount:'', source:'dues', description:'', received_date:'' })
  const [requestForm, setRequestForm] = useState({ event_id:'', amount:'', purpose:'', category:'Events', items:[{description:'',amount:''}] })
  const [addingIncome, setAddingIncome] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [duesEditing, setDuesEditing] = useState(false)
  const [duesChanges, setDuesChanges] = useState({})
  const [savingDues, setSavingDues] = useState(false)
  const [projEditing, setProjEditing] = useState(false)
  const [catsEditing, setCatsEditing] = useState(false)
  const [catsChanges, setCatsChanges] = useState({})
  const [savingCats, setSavingCats] = useState(false)
  const [projForm, setProjForm] = useState(null)
  const [auditLog, setAuditLog] = useState([])

  const role = localStorage.getItem('alm_role')
  const canApprove = role === 'vp_finance' || role === 'president'
  const canRequest = role === 'vp_events' || role === 'president'
  const canAddIncome = role === 'vp_finance' || role === 'president'
  const canEditFinance = role === 'vp_finance' || role === 'president'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const calls = [
      api.get('/budget/requests'),
      api.get('/events/'),
      api.get('/budget/org'),
      api.get('/budget/income'),
      api.get(`/dues/members/${CURRENT_SEMESTER}`),
      api.get(`/dues/projection/${CURRENT_SEMESTER}`),
      api.get(`/dues/categories/${CURRENT_SEMESTER}`),
    ]
    if (canApprove) calls.push(api.get('/budget/audit-log'))

    const results = await Promise.allSettled(calls)
    const [reqRes, evRes, budRes, incRes, duesRes, projRes, catsRes, audRes] = results

    let reqs = reqRes.value?.data || []
    if (role === 'vp_events') {
      const uid = localStorage.getItem('alm_user_id')
      reqs = reqs.filter(r => r.requested_by === uid)
    }
    setRequests(reqs)
    setEvents(evRes.value?.data || [])
    setBudget(budRes.value?.data || null)
    setIncome(incRes.value?.data || [])
    setDues(duesRes.value?.data || [])
    setProjection(projRes.value?.data || null)
    setCategories(catsRes.value?.data || [])
    if (audRes?.value?.data) setAuditLog(audRes.value.data)
  }

  // ─── Dues helpers ────────────────────────────────────────
  const getDueVal = (memberId, field) => {
    const change = duesChanges[memberId]
    if (change && field in change) return change[field]
    const existing = dues.find(d => d.member_id === memberId)
    return existing?.[field] ?? (field === 'category' ? 'active' : field === 'amount_owed' ? 180 : field === 'amount_paid' ? 0 : 'unpaid')
  }

  const setDueVal = (memberId, field, value) => {
    setDuesChanges(prev => {
      const updated = { ...prev, [memberId]: { ...(prev[memberId] || {}), [field]: value } }
      // Auto-set amount_owed when category changes
      if (field === 'category') {
        updated[memberId].amount_owed = CATEGORY_DUES[value] || 0
      }
      // Auto-set status based on payment
      if (field === 'amount_paid') {
        const owed = getDueVal(memberId, 'amount_owed')
        const paid = parseFloat(value) || 0
        updated[memberId].status = paid <= 0 ? 'unpaid' : paid >= parseFloat(owed) ? 'paid' : 'partial'
      }
      return updated
    })
  }

  const saveDues = async () => {
    setSavingDues(true)
    try {
      const records = dues.map(m => ({
        member_id: m.member_id,
        semester: CURRENT_SEMESTER,
        category: getDueVal(m.member_id, 'category'),
        amount_owed: parseFloat(getDueVal(m.member_id, 'amount_owed')) || 0,
        amount_paid: parseFloat(getDueVal(m.member_id, 'amount_paid')) || 0,
        status: getDueVal(m.member_id, 'status'),
        notes: getDueVal(m.member_id, 'notes') || null,
      }))
      await api.post('/dues/bulk', { records, semester: CURRENT_SEMESTER })
      setDuesEditing(false)
      setDuesChanges({})
      await fetchAll()
    } catch (err) { alert('Failed to save dues') }
    finally { setSavingDues(false) }
  }


  const saveCats = async () => {
    setSavingCats(true)
    try {
      for (const cat of categories) {
        const newAmount = parseFloat(catsChanges[cat.id] ?? cat.budgeted_amount)
        if (newAmount !== parseFloat(cat.budgeted_amount)) {
          await api.post(`/dues/categories?name=${encodeURIComponent(cat.name)}&semester=${encodeURIComponent(CURRENT_SEMESTER)}&budgeted_amount=${newAmount}`)
        }
      }
      setCatsEditing(false)
      setCatsChanges({})
      await fetchAll()
    } catch (err) { alert('Failed to save categories') }
    finally { setSavingCats(false) }
  }

  const saveProjection = async () => {
    try {
      await api.post('/dues/projection', projForm)
      setProjEditing(false)
      await fetchAll()
    } catch (err) { alert('Failed to save projection') }
  }

  // ─── Budget request helpers ───────────────────────────────
  const updateItem = (i, field, val) => {
    const items = [...requestForm.items]; items[i] = { ...items[i], [field]: val }
    setRequestForm({ ...requestForm, items })
  }

  const submitRequest = async (e) => {
    e.preventDefault(); setSubmittingRequest(true)
    try {
      await api.post('/budget/requests', {
        event_id: requestForm.event_id, amount: parseFloat(requestForm.amount),
        purpose: requestForm.purpose, category: requestForm.category,
        itemized_breakdown: requestForm.items.filter(it => it.description).map(it => ({ description: it.description, amount: parseFloat(it.amount)||0 }))
      })
      setShowRequestForm(false)
      setRequestForm({ event_id:'', amount:'', purpose:'', category:'Events', items:[{description:'',amount:''}] })
      await fetchAll()
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
    finally { setSubmittingRequest(false) }
  }

  const addIncome = async (e) => {
    e.preventDefault(); setAddingIncome(true)
    try {
      await api.post('/budget/income', { ...incomeForm, amount: parseFloat(incomeForm.amount) })
      setShowIncomeForm(false)
      setIncomeForm({ amount:'', source:'dues', description:'', received_date:'' })
      await fetchAll()
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
    finally { setAddingIncome(false) }
  }

  const review = async (id, status) => {
    setReviewing(r => ({ ...r, [id]: true }))
    try { await api.patch(`/budget/requests/${id}/review`, { status, reviewer_notes: notes[id]||null }); await fetchAll() }
    catch (err) { alert(err.response?.data?.detail||'Failed') }
    finally { setReviewing(r => ({ ...r, [id]: false })) }
  }

  // ─── Computed values ─────────────────────────────────────
  const pending = requests.filter(r => r.status === 'pending')
  const approved = requests.filter(r => r.status === 'approved')
  const pct = budget ? Math.min(100, (budget.spent / budget.total_budget) * 100) : 0
  const totalIncome = income.reduce((s, i) => s + i.amount, 0)

  // Dues stats
  const duesPaid = dues.filter(d => getDueVal(d.member_id,'status') === 'paid').length
  const duesUnpaid = dues.filter(d => getDueVal(d.member_id,'status') === 'unpaid').length
  const duesPartial = dues.filter(d => getDueVal(d.member_id,'status') === 'partial').length
  const totalCollected = dues.reduce((s,d) => s + (parseFloat(getDueVal(d.member_id,'amount_paid'))||0), 0)
  const totalOwed = dues.reduce((s,d) => s + (parseFloat(getDueVal(d.member_id,'amount_owed'))||0), 0)
  const collectionRate = totalOwed > 0 ? Math.round((totalCollected/totalOwed)*100) : 0

  // Category breakdown
  const spendingByEvent = Object.entries(
    approved.reduce((acc,r) => { acc[r.event_name||'Unknown'] = (acc[r.event_name||'Unknown']||0)+r.amount; return acc }, {})
  ).map(([name,total]) => ({ name: name.length>14?name.slice(0,14)+'…':name, total })).sort((a,b)=>b.total-a.total).slice(0,6)

  const incomeBySource = Object.entries(
    income.reduce((acc,i) => { acc[i.source]=(acc[i.source]||0)+i.amount; return acc }, {})
  ).map(([source,amount]) => ({ name: SOURCE_LABELS[source]||source, amount, fill: SOURCE_COLORS[source] }))

  // Projection calc
  const calcProjection = (p) => {
    if (!p) return null
    const grossDues = (p.active_members*p.active_dues) + (p.pledge_count*p.pledge_dues) + (p.hiatus_count*p.hiatus_dues)
    const expectedDues = grossDues * (p.collection_rate/100)
    const fundraiserIncome = p.fundraiser_count * p.fundraiser_profit
    const retreatIncome = p.alumni_retreat_count * p.alumni_retreat_fee
    const totalInc = expectedDues + parseFloat(p.carryover||0) + parseFloat(p.imam_funding||0) + fundraiserIncome + retreatIncome + parseFloat(p.other_income||0)
    const totalExp = categories.reduce((s,c) => s + parseFloat(c.budgeted_amount||0), 0)
    return { grossDues, expectedDues, fundraiserIncome, retreatIncome, totalInc, totalExp, net: totalInc - totalExp }
  }
  const proj = calcProjection(projection)

  // Build tabs
  const tabs = [
    { key:'overview', label:'Overview' },
    { key:'budget_requests', label:`Budget Requests (${pending.length} pending)` },
    { key:'dues', label:`Dues (${collectionRate}% collected)` },
    { key:'budget_plan', label:'Budget Planner' },
    { key:'income', label:`Income (${income.length})` },
    { key:'history', label:`History (${requests.filter(r=>r.status!=='pending').length})` },
  ].filter(Boolean)

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontSize:'1.75rem', letterSpacing:'-0.02em' }}>Finance</h1>
          <p style={{ color:'var(--gray-500)', fontSize:'0.84rem', marginTop:3 }}>
            {CURRENT_SEMESTER} · Dues tracking, budget planning, approvals & analytics
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <a href="/api/export/budget-pdf?semester=Spring%202026" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.82rem' }}>
            📄 Export PDF
          </a>
          {canRequest && <button className="btn btn-outline" onClick={() => { setShowRequestForm(!showRequestForm); setShowIncomeForm(false) }}><Plus size={15}/> Budget Request</button>}
        </div>
      </div>

      {/* Budget request form */}
      {showRequestForm && (
        <div className="card fade-in" style={{ marginBottom:'1.75rem', borderColor:'var(--maroon)', borderWidth:1.5 }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.05rem', color:'var(--maroon)', marginBottom:'1.1rem' }}>New budget request</h3>
          <form onSubmit={submitRequest}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
              <div className="form-group">
                <label>Event</label>
                <select value={requestForm.event_id} onChange={e => setRequestForm({...requestForm, event_id:e.target.value})} required>
                  <option value="">Select event...</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={requestForm.category} onChange={e => setRequestForm({...requestForm, category:e.target.value})}>
                  {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Total amount ($)</label>
                <input type="number" step="0.01" value={requestForm.amount} onChange={e => setRequestForm({...requestForm, amount:e.target.value})} placeholder="250.00" required/>
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input value={requestForm.purpose} onChange={e => setRequestForm({...requestForm, purpose:e.target.value})} placeholder="Brief description" required/>
              </div>
            </div>
            <p style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.6rem' }}>Itemized breakdown</p>
            {requestForm.items.map((item,i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 140px 36px', gap:8, marginBottom:8 }}>
                <input value={item.description} onChange={e => updateItem(i,'description',e.target.value)} placeholder="Item"/>
                <input type="number" step="0.01" value={item.amount} onChange={e => updateItem(i,'amount',e.target.value)} placeholder="$0"/>
                <button type="button" onClick={() => setRequestForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}))} style={{ background:'none', border:'1.5px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--gray-500)', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash2 size={12}/></button>
              </div>
            ))}
            <button type="button" onClick={() => setRequestForm(f=>({...f,items:[...f.items,{description:'',amount:''}]}))} className="btn btn-ghost" style={{ fontSize:'0.78rem', padding:'0.35rem 0.9rem', marginBottom:'1.1rem' }}>+ Add item</button>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={submittingRequest}>{submittingRequest?<><Loader2 size={14} className="spin"/> Submitting…</>:'Submit for approval'}</button>
              <button className="btn btn-ghost" type="button" onClick={()=>setShowRequestForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add income form */}
      {showIncomeForm && (
        <div className="card fade-in" style={{ marginBottom:'1.75rem', borderColor:'#10b981', borderWidth:1.5 }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.05rem', color:'#166534', marginBottom:'1.1rem' }}>Record incoming funds</h3>
          <form onSubmit={addIncome}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
              <div className="form-group"><label>Amount ($)</label><input type="number" step="0.01" value={incomeForm.amount} onChange={e=>setIncomeForm({...incomeForm,amount:e.target.value})} placeholder="500.00" required/></div>
              <div className="form-group"><label>Source</label><select value={incomeForm.source} onChange={e=>setIncomeForm({...incomeForm,source:e.target.value})}>{Object.entries(SOURCE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              <div className="form-group"><label>Description</label><input value={incomeForm.description} onChange={e=>setIncomeForm({...incomeForm,description:e.target.value})} placeholder="e.g. Spring 2026 semester dues" required/></div>
              <div className="form-group"><label>Date received</label><input type="date" value={incomeForm.received_date} onChange={e=>setIncomeForm({...incomeForm,received_date:e.target.value})}/></div>
            </div>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={addingIncome} style={{ background:'#166534' }}>{addingIncome?'Adding...':'Record funds'}</button>
              <button className="btn btn-ghost" type="button" onClick={()=>setShowIncomeForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.75rem' }}>
        {[
          { label:'Total Budget', value:`$${budget?.total_budget.toLocaleString()||0}`, color:'var(--maroon)' },
          { label:'Dues Collected', value:`$${totalCollected.toLocaleString()}`, color:'#10b981' },
          { label:'Spent', value:`$${budget?.spent.toLocaleString()||0}`, color:'#f59e0b' },
          { label:'Remaining', value:`$${budget?.remaining.toLocaleString()||0}`, color:'#3b82f6' },
        ].map(s => (
          <div key={s.label} className="card card-hover" style={{ textAlign:'center', padding:'1.1rem' }}>
            <div style={{ fontSize:'1.4rem', fontFamily:'var(--font-display)', fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'0.73rem', color:'var(--gray-500)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ overflowX:'auto' }}>
        {tabs.map(t => <button key={t.key} className={`tab ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key)} style={{ whiteSpace:'nowrap' }}>{t.label}</button>)}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div className="fade-in">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            {/* Budget gauge */}
            <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--gray-700)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.5rem', alignSelf:'flex-start' }}>Budget Used</p>
              <ResponsiveContainer width="100%" height={150}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" data={[{ value:pct, fill: pct>80?'#ef4444':pct>60?'#f59e0b':'var(--maroon)' }]} startAngle={90} endAngle={90-(pct/100)*360}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill:'var(--gray-100)' }}/>
                </RadialBarChart>
              </ResponsiveContainer>
              <p style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', fontWeight:700, marginTop:-12 }}>{pct.toFixed(0)}%</p>
              <p style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginTop:2 }}>{CURRENT_SEMESTER}</p>
            </div>

            {/* Dues collection gauge */}
            <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--gray-700)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.5rem', alignSelf:'flex-start' }}>Dues Collection</p>
              <ResponsiveContainer width="100%" height={150}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" data={[{ value:collectionRate, fill: collectionRate>=85?'#10b981':collectionRate>=60?'#f59e0b':'#ef4444' }]} startAngle={90} endAngle={90-(collectionRate/100)*360}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill:'var(--gray-100)' }}/>
                </RadialBarChart>
              </ResponsiveContainer>
              <p style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', fontWeight:700, marginTop:-12 }}>{collectionRate}%</p>
              <p style={{ fontSize:'0.75rem', color:'var(--gray-500)', marginTop:2 }}>${totalCollected.toLocaleString()} / ${totalOwed.toLocaleString()}</p>
            </div>

            {/* Quick stats */}
            <div className="card">
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--gray-700)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.9rem' }}>Quick Stats</p>
              {[
                { label:'Members paid', value:`${duesPaid} / ${dues.length}`, color:'#10b981' },
                { label:'Partial payment', value:duesPartial, color:'#f59e0b' },
                { label:'Unpaid', value:duesUnpaid, color:'#ef4444' },
                { label:'Approval rate', value:requests.length?`${Math.round((approved.length/requests.length)*100)}%`:'N/A', color:'var(--maroon)' },
                { label:'Projected net', value:proj?`$${proj.net.toLocaleString(undefined,{maximumFractionDigits:0})}`:'N/A', color: proj?.net >= 0 ? '#10b981' : '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'0.42rem 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:'0.81rem', color:'var(--gray-500)' }}>{s.label}</span>
                  <span style={{ fontWeight:700, fontSize:'0.88rem', color:s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {categories.length > 0 && (
            <div className="card" style={{ marginBottom:'1rem' }}>
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--gray-700)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'1rem' }}>Expense Category Breakdown</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'0.75rem' }}>
                {categories.map(cat => {
                  const pctUsed = cat.budgeted_amount > 0 ? Math.min(100, (cat.spent/cat.budgeted_amount)*100) : 0
                  return (
                    <div key={cat.id} style={{ background:'var(--gray-50)', borderRadius:10, padding:'0.9rem', border:'1px solid var(--border)' }}>
                      <p style={{ fontWeight:700, fontSize:'0.84rem', color:'var(--gray-900)', marginBottom:6 }}>{cat.name}</p>
                      <div style={{ height:6, background:'var(--gray-200)', borderRadius:99, overflow:'hidden', marginBottom:6 }}>
                        <div style={{ height:'100%', width:`${pctUsed}%`, background: pctUsed>90?'#ef4444':pctUsed>70?'#f59e0b':'var(--maroon)', borderRadius:99 }}/>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:'0.72rem', color:'var(--gray-500)' }}>${cat.spent.toLocaleString()} spent</span>
                        <span style={{ fontSize:'0.72rem', color: cat.remaining>=0 ? '#10b981' : '#ef4444', fontWeight:700 }}>${cat.remaining.toLocaleString()} left</span>
                      </div>
                      <p style={{ fontSize:'0.7rem', color:'var(--gray-300)', marginTop:2 }}>Budget: ${parseFloat(cat.budgeted_amount).toLocaleString()}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Charts */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div className="card">
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--gray-700)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'1rem' }}>Income by Source</p>
              {incomeBySource.length>0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={incomeBySource} barSize={28}>
                    <XAxis dataKey="name" tick={{ fill:'var(--gray-500)', fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'var(--gray-500)', fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background:'white', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={v=>[`$${v.toLocaleString()}`,'Amount']}/>
                    <Bar dataKey="amount" radius={[4,4,0,0]}>{incomeBySource.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign:'center', padding:'2rem', color:'var(--gray-300)', fontSize:'0.84rem' }}>No income recorded yet</div>}
            </div>
            <div className="card">
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--gray-700)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'1rem' }}>Spending by Event</p>
              {spendingByEvent.length>0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={spendingByEvent} barSize={28}>
                    <XAxis dataKey="name" tick={{ fill:'var(--gray-500)', fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'var(--gray-500)', fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background:'white', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={v=>[`$${v.toLocaleString()}`,'Approved']}/>
                    <Bar dataKey="total" fill="var(--maroon)" radius={[4,4,0,0]} opacity={0.85}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign:'center', padding:'2rem', color:'var(--gray-300)', fontSize:'0.84rem' }}>No spending data yet</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── DUES ── */}
      {tab==='dues' && (
        <div className="fade-in">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div style={{ display:'flex', gap:'1rem' }}>
              {[
                { label:'Paid', value:duesPaid, color:'#166534', bg:'#f0fdf4' },
                { label:'Partial', value:duesPartial, color:'#92660a', bg:'#fffbeb' },
                { label:'Unpaid', value:duesUnpaid, color:'#991b1b', bg:'#fef2f2' },
              ].map(s => (
                <div key={s.label} style={{ padding:'0.5rem 1rem', borderRadius:8, background:s.bg, textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:s.color, fontSize:'1.2rem' }}>{s.value}</div>
                  <div style={{ fontSize:'0.7rem', color:s.color, fontWeight:600, textTransform:'uppercase' }}>{s.label}</div>
                </div>
              ))}
              <div style={{ padding:'0.5rem 1rem', borderRadius:8, background:'var(--maroon-faint)', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--maroon)', fontSize:'1.2rem' }}>{collectionRate}%</div>
                <div style={{ fontSize:'0.7rem', color:'var(--maroon)', fontWeight:600, textTransform:'uppercase' }}>Collected</div>
              </div>
            </div>
            {canEditFinance && (
              <div style={{ display:'flex', gap:'0.6rem' }}>
                {duesEditing ? (
                  <>
                    <button className="btn btn-primary" onClick={saveDues} disabled={savingDues} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      {savingDues?<><Loader2 size={13} className="spin"/>Saving…</>:<><Save size={13}/>Save All</>}
                    </button>
                    <button className="btn btn-ghost" onClick={()=>{setDuesEditing(false);setDuesChanges({})}}>Cancel</button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={()=>setDuesEditing(true)} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <Edit3 size={13}/> Edit Dues
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--maroon)' }}>
                  {['Member','Category','Dues Owed','Amount Paid','Status','Notes'].map(h => (
                    <th key={h} style={{ padding:'0.7rem 1rem', fontSize:'0.7rem', color:'rgba(255,255,255,0.9)', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700, textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dues.map((member, i) => {
                  const status = getDueVal(member.member_id,'status')
                  const st = DUES_STATUS_STYLE[status]
                  return (
                    <tr key={member.member_id} style={{ borderBottom:'1px solid var(--border)', background: i%2===0?'white':'var(--gray-50)' }}>
                      <td style={{ padding:'0.6rem 1rem', fontSize:'0.84rem', fontWeight:600, color:'var(--gray-900)' }}>{member.full_name}</td>
                      <td style={{ padding:'0.6rem 1rem' }}>
                        {duesEditing ? (
                          <select value={getDueVal(member.member_id,'category')} onChange={e=>setDueVal(member.member_id,'category',e.target.value)} style={{ padding:'0.3rem 0.5rem', fontSize:'0.8rem', width:'100px' }}>
                            {CATEGORY_OPTIONS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize:'0.8rem', color:'var(--gray-700)', textTransform:'capitalize' }}>{getDueVal(member.member_id,'category')}</span>
                        )}
                      </td>
                      <td style={{ padding:'0.6rem 1rem' }}>
                        {duesEditing ? (
                          <input type="number" value={getDueVal(member.member_id,'amount_owed')} onChange={e=>setDueVal(member.member_id,'amount_owed',e.target.value)} style={{ padding:'0.3rem 0.5rem', fontSize:'0.8rem', width:'80px' }}/>
                        ) : (
                          <span style={{ fontSize:'0.84rem', fontWeight:600 }}>${getDueVal(member.member_id,'amount_owed')}</span>
                        )}
                      </td>
                      <td style={{ padding:'0.6rem 1rem' }}>
                        {duesEditing ? (
                          <input type="number" value={getDueVal(member.member_id,'amount_paid')} onChange={e=>setDueVal(member.member_id,'amount_paid',e.target.value)} style={{ padding:'0.3rem 0.5rem', fontSize:'0.8rem', width:'80px' }}/>
                        ) : (
                          <span style={{ fontSize:'0.84rem', color: parseFloat(getDueVal(member.member_id,'amount_paid'))>0?'#166534':'var(--gray-500)' }}>${getDueVal(member.member_id,'amount_paid')}</span>
                        )}
                      </td>
                      <td style={{ padding:'0.6rem 1rem' }}>
                        <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:99, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>{st.label}</span>
                      </td>
                      <td style={{ padding:'0.6rem 1rem' }}>
                        {duesEditing ? (
                          <input value={getDueVal(member.member_id,'notes')||''} onChange={e=>setDueVal(member.member_id,'notes',e.target.value)} placeholder="Notes..." style={{ padding:'0.3rem 0.5rem', fontSize:'0.78rem', width:'140px' }}/>
                        ) : (
                          <span style={{ fontSize:'0.78rem', color:'var(--gray-400)' }}>{getDueVal(member.member_id,'notes')||'—'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BUDGET PLANNER ── */}
      {tab==='budget_plan' && (
        <div className="fade-in">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.84rem', color:'var(--gray-500)' }}>Semester income & expense projection — mirrors your spreadsheet</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
            {/* Income projection */}
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', borderBottom:'2px solid #86efac', paddingBottom:'0.5rem' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', color:'#166534' }}>💰 Income Projection</p>
                {canEditFinance && !projEditing && <button className="btn btn-ghost" style={{ padding:'0.3rem 0.8rem', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:5 }} onClick={()=>{ setProjForm({...projection}); setProjEditing(true) }}><Edit3 size={12}/> Edit</button>}
                {projEditing && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-primary" style={{ padding:'0.3rem 0.8rem', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:5 }} onClick={saveProjection}><Save size={12}/> Save</button>
                    <button className="btn btn-ghost" style={{ padding:'0.3rem 0.7rem', fontSize:'0.75rem' }} onClick={()=>setProjEditing(false)}>Cancel</button>
                  </div>
                )}
              </div>
              {projection && (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    <th style={{ textAlign:'left', fontSize:'0.7rem', color:'var(--gray-500)', padding:'0.4rem 0', textTransform:'uppercase' }}>Source</th>
                    <th style={{ textAlign:'right', fontSize:'0.7rem', color:'var(--gray-500)', padding:'0.4rem 0', textTransform:'uppercase' }}>Value</th>
                    <th style={{ textAlign:'right', fontSize:'0.7rem', color:'var(--gray-500)', padding:'0.4rem 0', textTransform:'uppercase' }}>Amount</th>
                  </tr></thead>
                  <tbody>
                    {[
                      { label:'Active Members', field:'active_members', unit:`× $${projForm?.active_dues||projection.active_dues}`, value: (projForm?.active_members||projection.active_members)*(projForm?.active_dues||projection.active_dues), editField:'active_members' },
                      { label:'Active Dues ($)', field:'active_dues', unit:'per member', value: null, editField:'active_dues', hideAmount:true },
                      { label:'Pledges', field:'pledge_count', unit:`× $${projForm?.pledge_dues||projection.pledge_dues}`, value: (projForm?.pledge_count||projection.pledge_count)*(projForm?.pledge_dues||projection.pledge_dues), editField:'pledge_count' },
                      { label:'Pledge Dues ($)', field:'pledge_dues', unit:'per pledge', value: null, editField:'pledge_dues', hideAmount:true },
                      { label:'Hiatus', field:'hiatus_count', unit:`× $${projForm?.hiatus_dues||projection.hiatus_dues}`, value: (projForm?.hiatus_count||projection.hiatus_count)*(projForm?.hiatus_dues||projection.hiatus_dues), editField:'hiatus_count' },
                      { label:`Expected Collection`, field:'collection_rate', unit:'%', value: proj?.expectedDues, bold:true, editField:'collection_rate' },
                      { label:'Carryover', field:'carryover', unit:'$', value: parseFloat(projForm?.carryover||projection.carryover), editField:'carryover' },
                      { label:'Imam Omar / Funding', field:'imam_funding', unit:'$', value: parseFloat(projForm?.imam_funding||projection.imam_funding), editField:'imam_funding' },
                      { label:'Fundraisers', field:'fundraiser_count', unit:`× $${projForm?.fundraiser_profit||projection.fundraiser_profit}`, value: (projForm?.fundraiser_count||projection.fundraiser_count)*(projForm?.fundraiser_profit||projection.fundraiser_profit), editField:'fundraiser_count' },
                      { label:'Alumni Retreat', field:'alumni_retreat_count', unit:`× $${projForm?.alumni_retreat_fee||projection.alumni_retreat_fee}`, value: (projForm?.alumni_retreat_count||projection.alumni_retreat_count)*(projForm?.alumni_retreat_fee||projection.alumni_retreat_fee), editField:'alumni_retreat_count' },
                    ].filter(Boolean).map((row,i) => (
                      !row.hideAmount && <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'0.45rem 0', fontSize:row.bold?'0.84rem':'0.8rem', color:row.bold?'var(--gray-900)':'var(--gray-600)', fontWeight:row.bold?700:400 }}>{row.label} <span style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>{row.unit}</span></td>
                        <td style={{ padding:'0.45rem 0', textAlign:'right' }}>
                          {projEditing ? (
                            <input type="number" step="1" value={projForm?.[row.field]??projection[row.field]}
                              onChange={e => setProjForm(f => ({...f, [row.field]: parseFloat(e.target.value)||0}))}
                              style={{ width:80, padding:'0.25rem 0.4rem', fontSize:'0.8rem', textAlign:'right' }}/>
                          ) : (
                            <span style={{ fontSize:'0.8rem', color:'var(--gray-500)' }}>{projection[row.field]}</span>
                          )}
                        </td>
                        <td style={{ padding:'0.45rem 0', textAlign:'right', fontSize:'0.84rem', fontWeight:row.bold?700:400, color:row.bold?'#166534':'var(--gray-700)' }}>
                          {row.value != null ? `$${parseFloat(row.value).toLocaleString(undefined,{maximumFractionDigits:0})}` : ''}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background:'#f0fdf4' }}>
                      <td colSpan={2} style={{ padding:'0.6rem 0', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'0.9rem', color:'#166534' }}>TOTAL INCOME ESTIMATE</td>
                      <td style={{ padding:'0.6rem 0', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1rem', color:'#166534' }}>${proj?.totalInc.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Expense breakdown */}
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', borderBottom:'2px solid #fca5a5', paddingBottom:'0.5rem' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', color:'#991b1b' }}>📉 Expense Breakdown</p>
                {canEditFinance && !catsEditing && <button className="btn btn-ghost" style={{ padding:'0.3rem 0.8rem', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:5 }} onClick={()=>setCatsEditing(true)}><Edit3 size={12}/> Edit</button>}
                {catsEditing && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-primary" style={{ padding:'0.3rem 0.8rem', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:5 }} onClick={saveCats} disabled={savingCats}>{savingCats?'Saving…':<><Save size={12}/> Save</>}</button>
                    <button className="btn btn-ghost" style={{ padding:'0.3rem 0.7rem', fontSize:'0.75rem' }} onClick={()=>{setCatsEditing(false);setCatsChanges({})}}>Cancel</button>
                  </div>
                )}
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  <th style={{ textAlign:'left', fontSize:'0.7rem', color:'var(--gray-500)', padding:'0.4rem 0', textTransform:'uppercase' }}>Category</th>
                  <th style={{ textAlign:'right', fontSize:'0.7rem', color:'var(--gray-500)', padding:'0.4rem 0', textTransform:'uppercase' }}>Budget</th>
                  <th style={{ textAlign:'right', fontSize:'0.7rem', color:'var(--gray-500)', padding:'0.4rem 0', textTransform:'uppercase' }}>Spent</th>
                  <th style={{ textAlign:'right', fontSize:'0.7rem', color:'var(--gray-500)', padding:'0.4rem 0', textTransform:'uppercase' }}>Balance</th>
                </tr></thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'0.45rem 0', fontSize:'0.84rem', color:'var(--gray-700)' }}>{cat.name}</td>
                      <td style={{ padding:'0.45rem 0', textAlign:'right', fontSize:'0.82rem', color:'var(--gray-700)' }}>
                        {catsEditing ? (
                          <input type="number" step="1" value={catsChanges[cat.id] ?? parseFloat(cat.budgeted_amount)}
                            onChange={e => setCatsChanges(prev => ({...prev, [cat.id]: e.target.value}))}
                            style={{ width:90, padding:'0.25rem 0.4rem', fontSize:'0.8rem', textAlign:'right' }}/>
                        ) : `$${parseFloat(cat.budgeted_amount).toLocaleString()}`}
                      </td>
                      <td style={{ padding:'0.45rem 0', textAlign:'right', fontSize:'0.82rem', color:'#991b1b' }}>${cat.spent.toLocaleString()}</td>
                      <td style={{ padding:'0.45rem 0', textAlign:'right', fontSize:'0.82rem', fontWeight:700, color:cat.remaining>=0?'#166534':'#991b1b' }}>${cat.remaining.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ background:'#fef2f2' }}>
                    <td style={{ padding:'0.6rem 0', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'0.9rem', color:'#991b1b' }}>TOTAL EXPENSES</td>
                    <td style={{ padding:'0.6rem 0', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:800, color:'#991b1b' }}>${proj?.totalExp.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                    <td colSpan={2}/>
                  </tr>
                  {proj && (
                    <tr style={{ background: proj.net>=0?'#f0fdf4':'#fef2f2' }}>
                      <td colSpan={3} style={{ padding:'0.6rem 0', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'0.9rem', color: proj.net>=0?'#166534':'#991b1b' }}>PROJECTED NET</td>
                      <td style={{ padding:'0.6rem 0', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1rem', color: proj.net>=0?'#166534':'#991b1b' }}>${proj.net.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit projection form */}

        </div>
      )}

            {/* ── BUDGET REQUESTS ── */}
      {tab==='budget_requests' && (
        <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {pending.length===0 ? (
            <div className="card" style={{ textAlign:'center', padding:'3.5rem', color:'var(--gray-500)' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin:'0 auto 0.75rem' }}/>
              <p style={{ fontWeight:600 }}>All caught up — no pending requests</p>
            </div>
          ) : pending.map(r => (
            <div key={r.id} className="card" style={{ borderLeft:'3px solid #f59e0b' }}>
              {r.ai_flag && <div style={{ display:'flex', gap:8, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'0.6rem 0.75rem', marginBottom:'1rem' }}><AlertTriangle size={13} color="#92660a" style={{ flexShrink:0, marginTop:1 }}/><span style={{ fontSize:'0.79rem', color:'#92660a' }}><strong>AI Flag:</strong> {r.ai_flag}</span></div>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.9rem' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <p style={{ fontWeight:700, color:'var(--gray-900)' }}>{r.event_name}</p>
                    {r.category && <span style={{ fontSize:'0.68rem', color:'var(--maroon)', background:'var(--maroon-faint)', padding:'0.15rem 0.5rem', borderRadius:99, fontWeight:700 }}>{r.category}</span>}
                  </div>
                  <p style={{ fontSize:'0.82rem', color:'var(--gray-500)' }}>{r.purpose}</p>
                  <p style={{ fontSize:'0.73rem', color:'var(--gray-300)', marginTop:3 }}>By {r.requester_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.4rem', color:'var(--maroon)', marginLeft:'1rem' }}>${r.amount.toLocaleString()}</p>
              </div>
              {r.itemized_breakdown?.length>0 && (
                <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'0.75rem', marginBottom:'0.9rem' }}>
                  {r.itemized_breakdown.map((item,i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'var(--gray-500)', padding:'0.18rem 0' }}>
                      <span>{item.description}</span><span style={{ color:'var(--gray-700)', fontWeight:600 }}>${parseFloat(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-group" style={{ marginBottom:'0.9rem' }}>
                <label>Note to requester (optional)</label>
                <input value={notes[r.id]||''} onChange={e=>setNotes(n=>({...n,[r.id]:e.target.value}))} placeholder="Add context for your decision..."/>
              </div>
              <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                <button className="btn btn-primary" disabled={reviewing[r.id]} onClick={()=>review(r.id,'approved')} style={{ display:'flex', alignItems:'center', gap:5 }}><CheckCircle2 size={13}/> Approve</button>
                <button className="btn" disabled={reviewing[r.id]} onClick={()=>review(r.id,'rejected')} style={{ background:'#fef2f2', color:'#991b1b', border:'1.5px solid #fca5a5', display:'flex', alignItems:'center', gap:5 }}><XCircle size={13}/> Reject</button>
                <button className="btn btn-ghost" disabled={reviewing[r.id]} onClick={()=>review(r.id,'needs_revision')} style={{ display:'flex', alignItems:'center', gap:5 }}><RotateCcw size={13}/> Needs revision</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── INCOME ── */}
      {tab==='income' && (
        <div className="fade-in">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <p style={{ fontSize:'0.84rem', color:'var(--gray-500)' }}>Total recorded: <strong style={{ color:'#10b981' }}>${totalIncome.toLocaleString()}</strong></p>
            {canAddIncome && <button className="btn btn-primary" style={{ background:'#166534' }} onClick={()=>setShowIncomeForm(true)}><Plus size={14}/> Add Income</button>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {income.length===0 ? (
              <div className="card" style={{ textAlign:'center', padding:'3rem', color:'var(--gray-500)' }}>
                <ArrowDownCircle size={32} style={{ margin:'0 auto 0.75rem', opacity:0.3 }}/>
                <p style={{ fontWeight:600 }}>No income recorded yet</p>
              </div>
            ) : income.map(inc=>(
              <div key={inc.id} className="card" style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.25rem', borderLeft:`3px solid ${SOURCE_COLORS[inc.source]}` }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, color:'var(--gray-900)', fontSize:'0.9rem' }}>{inc.description}</p>
                  <div style={{ display:'flex', gap:8, marginTop:3 }}>
                    <span style={{ fontSize:'0.72rem', background:`${SOURCE_COLORS[inc.source]}15`, color:SOURCE_COLORS[inc.source], padding:'0.15rem 0.5rem', borderRadius:99, fontWeight:700 }}>{SOURCE_LABELS[inc.source]}</span>
                    <span style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>by {inc.adder_name||'Unknown'}</span>
                    {inc.received_date && <span style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>{new Date(inc.received_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.15rem', color:'#166534', flexShrink:0 }}>+${parseFloat(inc.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab==='history' && (
        <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
          {requests.filter(r=>r.status!=='pending').map(r=>(
            <div key={r.id} className="card" style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.25rem' }}>
              {STATUS_ICON[r.status]}
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:600, color:'var(--gray-900)', fontSize:'0.9rem' }}>{r.event_name}</p>
                <p style={{ fontSize:'0.78rem', color:'var(--gray-500)' }}>{r.purpose}</p>
                {r.reviewer_notes && <p style={{ fontSize:'0.75rem', color:'#1d4ed8', marginTop:2 }}>💬 {r.reviewer_notes}</p>}
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--maroon)' }}>${r.amount.toLocaleString()}</p>
                <span className={`badge badge-${r.status}`}>{r.status.replace('_',' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AUDIT LOG ── */}
      {tab==='__removed__' && (
        <div className="fade-in card" style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--gray-50)' }}>
                {['Timestamp','Action','Entity','Details'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'0.75rem 1.25rem', fontSize:'0.7rem', color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700, borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry,i)=>(
                <tr key={entry.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'white':'var(--gray-50)' }}>
                  <td style={{ padding:'0.65rem 1.25rem', fontSize:'0.78rem', color:'var(--gray-500)', whiteSpace:'nowrap' }}>{new Date(entry.created_at).toLocaleString()}</td>
                  <td style={{ padding:'0.65rem 1.25rem', fontSize:'0.78rem', color:'var(--gray-900)', fontWeight:600 }}>{entry.action.replace(/_/g,' ')}</td>
                  <td style={{ padding:'0.65rem 1.25rem', fontSize:'0.78rem', color:'var(--gray-500)' }}>{entry.entity_type}</td>
                  <td style={{ padding:'0.65rem 1.25rem', fontSize:'0.72rem', color:'var(--gray-300)', fontFamily:'monospace' }}>{JSON.stringify(entry.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}