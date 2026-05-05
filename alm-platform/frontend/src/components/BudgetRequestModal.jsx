import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, DollarSign } from 'lucide-react'
import api from '../lib/api'

const EXPENSE_CATS = ['Events','Merchandise','National Dues','Retreat','Miscellaneous']

export default function BudgetRequestModal({ onClose, defaultEventId = null }) {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({
    event_id: defaultEventId || '',
    amount: '',
    purpose: '',
    category: 'Events',
    items: [{ description: '', amount: '' }]
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get('/events/').then(r => setEvents(r.data)).catch(() => {})
  }, [])

  const updateItem = (i, field, val) => {
    const items = [...form.items]
    items[i] = { ...items[i], [field]: val }
    setForm({ ...form, items })
  }

  const submit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/budget/requests', {
        event_id: form.event_id,
        amount: parseFloat(form.amount),
        purpose: form.purpose,
        category: form.category,
        itemized_breakdown: form.items
          .filter(it => it.description)
          .map(it => ({ description: it.description, amount: parseFloat(it.amount) || 0 }))
      })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit')
    } finally { setSubmitting(false) }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(2px)' }}>
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{ background: 'var(--white)', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--maroon-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="var(--maroon)" />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-primary)' }}>Budget Request</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Submitted to VP of Finance for approval</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--green-bg)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <span style={{ fontSize: 22 }}>✓</span>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 4 }}>Request submitted</p>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>VP of Finance will review your request</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Event</label>
                <select value={form.event_id} onChange={e => setForm({ ...form, event_id: e.target.value })} required>
                  <option value="">Select event...</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Total amount ($)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="Brief description" required />
              </div>
            </div>

            {/* Itemized */}
            <p className="section-title">Itemized breakdown <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '0.72rem', color: 'var(--text-muted)' }}>(optional)</span></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
              {form.items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 30px', gap: 6 }}>
                  <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder={`Item ${i + 1}`} />
                  <input type="number" step="0.01" value={item.amount} onChange={e => updateItem(i, 'amount', e.target.value)} placeholder="$0" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red-border)'; e.currentTarget.style.color = 'var(--red)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: '', amount: '' }] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', fontFamily: 'var(--font-body)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--maroon)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                <Plus size={13} /> Add line item
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', paddingTop: '0.25rem' }}>
              <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                {submitting ? <><Loader2 size={14} className="spin" /> Submitting…</> : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}