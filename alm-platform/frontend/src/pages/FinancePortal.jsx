import { useState, useEffect } from 'react'
import api from '../lib/api'
import { CheckCircle2, XCircle, Clock, RotateCcw, AlertTriangle, DollarSign, TrendingUp, Plus, ArrowDownCircle, Trash2, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar } from 'recharts'

const STATUS_ICON = {
  pending: <Clock size={14} color="#f59e0b" />,
  approved: <CheckCircle2 size={14} color="#10b981" />,
  rejected: <XCircle size={14} color="#ef4444" />,
  needs_revision: <RotateCcw size={14} color="#3b82f6" />
}
const SOURCE_COLORS = { dues: '#7B1C2E', fundraiser: '#f59e0b', donation: '#10b981', national: '#3b82f6', campus: '#8b5cf6', other: '#6b7280' }
const SOURCE_LABELS = { dues: 'Member Dues', fundraiser: 'Fundraiser', donation: 'Donation', national: 'National ALM', campus: 'Campus Grant', other: 'Other' }

export default function FinancePortal() {
  const [requests, setRequests] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [income, setIncome] = useState([])
  const [budget, setBudget] = useState(null)
  const [events, setEvents] = useState([])
  const [tab, setTab] = useState('overview')
  const [reviewing, setReviewing] = useState({})
  const [notes, setNotes] = useState({})
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ amount: '', source: 'dues', description: '', received_date: '' })
  const [requestForm, setRequestForm] = useState({ event_id: '', amount: '', purpose: '', items: [{ description: '', amount: '' }] })
  const [addingIncome, setAddingIncome] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  const role = localStorage.getItem('alm_role')
  const canApprove = role === 'vp_finance' || role === 'president'
  const canRequest = role === 'vp_events' || role === 'president'
  const canAddIncome = role === 'vp_finance' || role === 'president'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [reqRes, evRes, budRes, incRes] = await Promise.all([
      api.get('/budget/requests'), api.get('/events/'),
      api.get('/budget/org'), api.get('/budget/income')
    ])
    // Filter requests by role
    let reqs = reqRes.data
    if (role === 'vp_events') reqs = reqs.filter(r => r.requested_by === localStorage.getItem('alm_user_id'))
    setRequests(reqs)
    setEvents(evRes.data)
    setBudget(budRes.data)
    setIncome(incRes.data)
    try {
      const audRes = await api.get('/budget/audit-log')
      setAuditLog(audRes.data)
    } catch {}
  }

  const review = async (id, status) => {
    setReviewing(r => ({ ...r, [id]: true }))
    try { await api.patch(`/budget/requests/${id}/review`, { status, reviewer_notes: notes[id] || null }); await fetchAll() }
    catch (err) { alert(err.response?.data?.detail || 'Failed') }
    finally { setReviewing(r => ({ ...r, [id]: false })) }
  }

  const addIncome = async (e) => {
    e.preventDefault(); setAddingIncome(true)
    try {
      await api.post('/budget/income', { ...incomeForm, amount: parseFloat(incomeForm.amount) })
      setShowIncomeForm(false)
      setIncomeForm({ amount: '', source: 'dues', description: '', received_date: '' })
      await fetchAll()
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
    finally { setAddingIncome(false) }
  }

  const updateItem = (i, field, val) => {
    const items = [...requestForm.items]; items[i] = { ...items[i], [field]: val }
    setRequestForm({ ...requestForm, items })
  }

  const submitRequest = async (e) => {
    e.preventDefault(); setSubmittingRequest(true)
    try {
      await api.post('/budget/requests', {
        event_id: requestForm.event_id, amount: parseFloat(requestForm.amount),
        purpose: requestForm.purpose,
        itemized_breakdown: requestForm.items.filter(it => it.description).map(it => ({ description: it.description, amount: parseFloat(it.amount) || 0 }))
      })
      setShowRequestForm(false)
      setRequestForm({ event_id: '', amount: '', purpose: '', items: [{ description: '', amount: '' }] })
      await fetchAll()
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
    finally { setSubmittingRequest(false) }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const approved = requests.filter(r => r.status === 'approved')
  const rejected = requests.filter(r => r.status === 'rejected')
  const pct = budget ? Math.min(100, (budget.spent / budget.total_budget) * 100) : 0
  const totalIncome = income.reduce((s, i) => s + i.amount, 0)

  const approvalData = [
    { name: 'Approved', value: approved.length, fill: '#10b981' },
    { name: 'Pending', value: pending.length, fill: '#f59e0b' },
    { name: 'Rejected', value: rejected.length, fill: '#ef4444' },
    { name: 'Revision', value: requests.filter(r => r.status === 'needs_revision').length, fill: '#3b82f6' },
  ].filter(d => d.value > 0)

  const spendingByEvent = Object.entries(
    approved.reduce((acc, r) => { acc[r.event_name || 'Unknown'] = (acc[r.event_name || 'Unknown'] || 0) + r.amount; return acc }, {})
  ).map(([name, total]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, total }))
    .sort((a, b) => b.total - a.total).slice(0, 6)

  const incomeBySource = Object.entries(
    income.reduce((acc, i) => { acc[i.source] = (acc[i.source] || 0) + i.amount; return acc }, {})
  ).map(([source, amount]) => ({ name: SOURCE_LABELS[source] || source, amount, fill: SOURCE_COLORS[source] }))

  // Build tabs dynamically based on role
  const tabs = [
    { key: 'overview', label: 'Overview' },
    canRequest && { key: 'requests', label: `My Requests (${requests.filter(r=>r.status==='pending').length} pending)` },
    canApprove && { key: 'queue', label: `Approval Queue (${pending.length})` },
    { key: 'income', label: `Income (${income.length})` },
    { key: 'history', label: `History (${requests.filter(r => r.status !== 'pending').length})` },
    canApprove && { key: 'audit', label: 'Audit Log' },
  ].filter(Boolean)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Finance</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.84rem', marginTop: 3 }}>Budget requests, approvals, income tracking, and analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canRequest && (
            <button className="btn btn-outline" onClick={() => { setShowRequestForm(!showRequestForm); setShowIncomeForm(false) }}>
              <Plus size={15} /> Budget Request
            </button>
          )}
          {canAddIncome && (
            <button className="btn btn-primary" onClick={() => { setShowIncomeForm(!showIncomeForm); setShowRequestForm(false) }}>
              <Plus size={15} /> Add Income
            </button>
          )}
        </div>
      </div>

      {/* Budget request form */}
      {showRequestForm && (
        <div className="card fade-in" style={{ marginBottom: '1.75rem', borderColor: 'var(--maroon)', borderWidth: 1.5 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--maroon)', marginBottom: '1.1rem' }}>New budget request</h3>
          <form onSubmit={submitRequest}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Event</label>
                <select value={requestForm.event_id} onChange={e => setRequestForm({ ...requestForm, event_id: e.target.value })} required>
                  <option value="">Select event...</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Total amount ($)</label>
                <input type="number" step="0.01" value={requestForm.amount} onChange={e => setRequestForm({ ...requestForm, amount: e.target.value })} placeholder="250.00" required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Purpose</label>
                <input value={requestForm.purpose} onChange={e => setRequestForm({ ...requestForm, purpose: e.target.value })} placeholder="Brief description of what funds are for" required />
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>Itemized breakdown</p>
            {requestForm.items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 36px', gap: 8, marginBottom: 8 }}>
                <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" />
                <input type="number" step="0.01" value={item.amount} onChange={e => updateItem(i, 'amount', e.target.value)} placeholder="$0.00" />
                <button type="button" onClick={() => setRequestForm(f => ({ ...f, items: f.items.filter((_,idx) => idx !== i) }))} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setRequestForm(f => ({ ...f, items: [...f.items, { description: '', amount: '' }] }))} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem', marginBottom: '1.1rem' }}>+ Add item</button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={submittingRequest}>{submittingRequest ? <><Loader2 size={14} className="spin" /> Submitting…</> : 'Submit for approval'}</button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowRequestForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add income form */}
      {showIncomeForm && (
        <div className="card fade-in" style={{ marginBottom: '1.75rem', borderColor: '#10b981', borderWidth: 1.5 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: '#166534', marginBottom: '1.1rem' }}>Record incoming funds</h3>
          <form onSubmit={addIncome}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Amount ($)</label>
                <input type="number" step="0.01" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} placeholder="500.00" required />
              </div>
              <div className="form-group">
                <label>Source</label>
                <select value={incomeForm.source} onChange={e => setIncomeForm({ ...incomeForm, source: e.target.value })}>
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={incomeForm.description} onChange={e => setIncomeForm({ ...incomeForm, description: e.target.value })} placeholder="e.g. Spring 2026 semester dues" required />
              </div>
              <div className="form-group">
                <label>Date received</label>
                <input type="date" value={incomeForm.received_date} onChange={e => setIncomeForm({ ...incomeForm, received_date: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={addingIncome} style={{ background: '#166534' }}>{addingIncome ? 'Adding...' : 'Record funds'}</button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowIncomeForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Stat cards */}
      {budget && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total Budget', value: `$${budget.total_budget.toLocaleString()}`, color: 'var(--maroon)' },
            { label: 'Total Income', value: `$${totalIncome.toLocaleString()}`, color: '#10b981' },
            { label: 'Spent', value: `$${budget.spent.toLocaleString()}`, color: '#f59e0b' },
            { label: 'Remaining', value: `$${budget.remaining.toLocaleString()}`, color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} className="card card-hover" style={{ textAlign: 'center', padding: '1.1rem' }}>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', alignSelf: 'flex-start' }}>Budget Used</p>
              <ResponsiveContainer width="100%" height={160}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" data={[{ value: pct, fill: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : 'var(--maroon)' }]} startAngle={90} endAngle={90 - (pct / 100) * 360}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'var(--gray-100)' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginTop: -12 }}>{pct.toFixed(0)}%</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{budget?.semester}</p>
            </div>
            <div className="card">
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Request Status</p>
              {approvalData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={approvalData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                      {approvalData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gray-300)', fontSize: '0.84rem' }}>No data yet</div>}
            </div>
            <div className="card">
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.9rem' }}>Quick Stats</p>
              {[
                { label: 'Approval rate', value: requests.length ? `${Math.round((approved.length / requests.length) * 100)}%` : 'N/A', color: '#10b981' },
                { label: 'Avg request', value: requests.length ? `$${Math.round(requests.reduce((s,r) => s+r.amount,0) / requests.length).toLocaleString()}` : 'N/A', color: 'var(--maroon)' },
                { label: 'Total requested', value: `$${requests.reduce((s,r) => s+r.amount,0).toLocaleString()}`, color: '#f59e0b' },
                { label: 'Total approved', value: `$${approved.reduce((s,r) => s+r.amount,0).toLocaleString()}`, color: '#3b82f6' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.81rem', color: 'var(--gray-500)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card">
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Income by Source</p>
              {incomeBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={incomeBySource} barSize={32}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [`$${v.toLocaleString()}`, 'Amount']} />
                    <Bar dataKey="amount" radius={[4,4,0,0]}>{incomeBySource.map((e,i) => <Cell key={i} fill={e.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-300)', fontSize: '0.84rem' }}>No income recorded yet</div>}
            </div>
            <div className="card">
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Spending by Event</p>
              {spendingByEvent.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={spendingByEvent} barSize={32}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [`$${v.toLocaleString()}`, 'Approved']} />
                    <Bar dataKey="total" fill="var(--maroon)" radius={[4,4,0,0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-300)', fontSize: '0.84rem' }}>No spending data yet</div>}
            </div>
          </div>
        </div>
      )}

      {/* My Requests (VP of Events view) */}
      {tab === 'requests' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {requests.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
              <DollarSign size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No requests yet</p>
              <p style={{ fontSize: '0.84rem', marginTop: 4 }}>Use "Budget Request" above to submit a new request</p>
            </div>
          ) : requests.map(r => (
            <div key={r.id} className="card card-hover">
              {r.ai_flag && (
                <div style={{ display: 'flex', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.9rem' }}>
                  <AlertTriangle size={13} color="#92660a" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: '0.79rem', color: '#92660a' }}><strong>AI Flag:</strong> {r.ai_flag}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.95rem' }}>{r.event_name || 'Unknown event'}</span>
                    <span className={`badge badge-${r.status}`}>{r.status.replace('_', ' ')}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{r.purpose}</p>
                  {r.reviewer_notes && <p style={{ fontSize: '0.79rem', color: '#1d4ed8', marginTop: 4 }}>💬 {r.reviewer_notes}</p>}
                  <p style={{ fontSize: '0.72rem', color: 'var(--gray-300)', marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--maroon)', flexShrink: 0 }}>${r.amount.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Queue */}
      {tab === 'queue' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pending.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--gray-500)' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontWeight: 600 }}>All caught up — no pending requests</p>
            </div>
          ) : pending.map(r => (
            <div key={r.id} className="card" style={{ borderLeft: '3px solid #f59e0b' }}>
              {r.ai_flag && (
                <div style={{ display: 'flex', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={13} color="#92660a" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: '0.79rem', color: '#92660a' }}><strong>AI Flag:</strong> {r.ai_flag}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.9rem' }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--gray-900)', marginBottom: 2 }}>{r.event_name}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{r.purpose}</p>
                  <p style={{ fontSize: '0.73rem', color: 'var(--gray-300)', marginTop: 3 }}>By {r.requester_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--maroon)', marginLeft: '1rem' }}>${r.amount.toLocaleString()}</p>
              </div>
              {r.itemized_breakdown?.length > 0 && (
                <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '0.75rem', marginBottom: '0.9rem' }}>
                  {r.itemized_breakdown.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-500)', padding: '0.18rem 0' }}>
                      <span>{item.description}</span>
                      <span style={{ color: 'var(--gray-700)', fontWeight: 600 }}>${parseFloat(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '0.9rem' }}>
                <label>Note to requester (optional)</label>
                <input value={notes[r.id] || ''} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} placeholder="Add context for your decision..." />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" disabled={reviewing[r.id]} onClick={() => review(r.id, 'approved')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle2 size={13} /> Approve</button>
                <button className="btn" disabled={reviewing[r.id]} onClick={() => review(r.id, 'rejected')} style={{ background: '#fef2f2', color: '#991b1b', border: '1.5px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 5 }}><XCircle size={13} /> Reject</button>
                <button className="btn btn-ghost" disabled={reviewing[r.id]} onClick={() => review(r.id, 'needs_revision')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><RotateCcw size={13} /> Needs revision</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Income */}
      {tab === 'income' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.84rem', color: 'var(--gray-500)' }}>Total recorded: <strong style={{ color: '#10b981' }}>${totalIncome.toLocaleString()}</strong></p>
            {canAddIncome && <button className="btn btn-primary" style={{ background: '#166534' }} onClick={() => setShowIncomeForm(true)}><Plus size={14} /> Add Income</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {income.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
                <ArrowDownCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontWeight: 600 }}>No income recorded yet</p>
              </div>
            ) : income.map(inc => (
              <div key={inc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderLeft: `3px solid ${SOURCE_COLORS[inc.source]}` }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '0.9rem' }}>{inc.description}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: '0.72rem', background: `${SOURCE_COLORS[inc.source]}15`, color: SOURCE_COLORS[inc.source], padding: '0.15rem 0.5rem', borderRadius: 99, fontWeight: 700 }}>{SOURCE_LABELS[inc.source]}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>by {inc.adder_name || 'Unknown'}</span>
                    {inc.received_date && <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{new Date(inc.received_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', color: '#166534', flexShrink: 0 }}>+${parseFloat(inc.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {requests.filter(r => r.status !== 'pending').map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
              {STATUS_ICON[r.status]}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '0.9rem' }}>{r.event_name}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{r.purpose}</p>
                {r.reviewer_notes && <p style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: 2 }}>💬 {r.reviewer_notes}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--maroon)' }}>${r.amount.toLocaleString()}</p>
                <span className={`badge badge-${r.status}`}>{r.status.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="fade-in card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {['Timestamp', 'Action', 'Entity', 'Details'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1.25rem', fontSize: '0.7rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry, i) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                  <td style={{ padding: '0.65rem 1.25rem', fontSize: '0.78rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{new Date(entry.created_at).toLocaleString()}</td>
                  <td style={{ padding: '0.65rem 1.25rem', fontSize: '0.78rem', color: 'var(--gray-900)', fontWeight: 600 }}>{entry.action.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '0.65rem 1.25rem', fontSize: '0.78rem', color: 'var(--gray-500)' }}>{entry.entity_type}</td>
                  <td style={{ padding: '0.65rem 1.25rem', fontSize: '0.72rem', color: 'var(--gray-300)', fontFamily: 'monospace' }}>{JSON.stringify(entry.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}