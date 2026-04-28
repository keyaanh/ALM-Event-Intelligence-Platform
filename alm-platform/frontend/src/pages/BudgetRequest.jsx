import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Plus, Trash2, AlertTriangle, Loader2, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const STATUS_COLOR = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', needs_revision: '#3b82f6' }

export default function BudgetRequest() {
  const [requests, setRequests] = useState([])
  const [events, setEvents] = useState([])
  const [budget, setBudget] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('all')
  const [form, setForm] = useState({ event_id: '', amount: '', purpose: '', items: [{ description: '', amount: '' }] })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [reqRes, evRes, budRes] = await Promise.all([
      api.get('/budget/requests'), api.get('/events/'), api.get('/budget/org')
    ])
    setRequests(reqRes.data); setEvents(evRes.data); setBudget(budRes.data)
  }

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const updateItem = (i, field, val) => { const items = [...form.items]; items[i] = { ...items[i], [field]: val }; setForm({ ...form, items }) }
  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', amount: '' }] })
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await api.post('/budget/requests', {
        event_id: form.event_id, amount: parseFloat(form.amount), purpose: form.purpose,
        itemized_breakdown: form.items.filter(it => it.description).map(it => ({ description: it.description, amount: parseFloat(it.amount) || 0 }))
      })
      setShowForm(false)
      setForm({ event_id: '', amount: '', purpose: '', items: [{ description: '', amount: '' }] })
      await fetchAll()
    } catch (err) { alert(err.response?.data?.detail || 'Failed to submit') }
    finally { setSubmitting(false) }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const approved = requests.filter(r => r.status === 'approved')
  const chartData = requests.slice(0, 8).map(r => ({ name: r.event_name?.slice(0, 10) || 'Event', amount: r.amount, status: r.status }))
  const pct = budget ? Math.min(100, (budget.spent / budget.total_budget) * 100) : 0
  const filtered = tab === 'pending' ? pending : tab === 'approved' ? approved : requests

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Budget Requests</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.84rem', marginTop: 3 }}>Submit and track your event budget requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* Budget overview stats */}
      {budget && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total Budget', value: `$${budget.total_budget.toLocaleString()}`, icon: <DollarSign size={18} />, color: 'var(--maroon)' },
            { label: 'Spent', value: `$${budget.spent.toLocaleString()}`, icon: <TrendingUp size={18} />, color: '#f59e0b' },
            { label: 'Remaining', value: `$${budget.remaining.toLocaleString()}`, icon: <CheckCircle size={18} />, color: '#10b981' },
            { label: 'Pending', value: pending.length, icon: <Clock size={18} />, color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Budget bar + chart */}
      {budget && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
          <div className="card">
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>{budget.semester} — Budget Usage</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>Spent</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-900)' }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 12, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : 'var(--maroon)', borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>${budget.spent.toLocaleString()} used</span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>${budget.remaining.toLocaleString()} left</span>
            </div>
          </div>

          <div className="card">
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Requests by Event</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chartData} barSize={22}>
                <XAxis dataKey="name" tick={{ fill: 'var(--gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`$${v}`, 'Amount']} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={STATUS_COLOR[entry.status] || '#8b5cf6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <div className="card fade-in" style={{ marginBottom: '1.75rem', borderColor: 'var(--maroon)', borderWidth: 1.5 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--maroon)', marginBottom: '1.25rem' }}>New budget request</h3>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Event</label>
                <select name="event_id" value={form.event_id} onChange={handle} required>
                  <option value="">Select event...</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Total amount ($)</label>
                <input name="amount" type="number" step="0.01" value={form.amount} onChange={handle} placeholder="250.00" required />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Purpose</label>
                <input name="purpose" value={form.purpose} onChange={handle} placeholder="Brief description of what funds are for" required />
              </div>
            </div>

            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Itemized breakdown</p>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 36px', gap: 8, marginBottom: 8 }}>
                <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" />
                <input type="number" step="0.01" value={item.amount} onChange={e => updateItem(i, 'amount', e.target.value)} placeholder="$0.00" />
                <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.9rem', marginBottom: '1.25rem' }}>+ Add item</button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="spin" /> Submitting...</> : 'Submit for approval'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'all', label: `All (${requests.length})` },
          { key: 'pending', label: `Pending (${pending.length})` },
          { key: 'approved', label: `Approved (${approved.length})` },
        ].map(t => <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {/* Requests list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>No requests yet</div>
        ) : filtered.map(r => (
          <div key={r.id} className="card card-hover">
            {r.ai_flag && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.9rem' }}>
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
    </div>
  )
}