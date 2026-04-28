import { useState, useEffect } from 'react'
import api from '../lib/api'
import EventCard from '../components/EventCard'
import { Plus, Loader2, CalendarDays, Users, TrendingUp, Clock } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const EVENT_TYPES = [
  { value: 'social', label: 'Social' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'professional', label: 'Professional' },
  { value: 'service', label: 'Service' },
  { value: 'religious', label: 'Religious' },
  { value: 'chapter_meeting', label: 'Chapter Meeting' },
  { value: 'brotherhood', label: 'Brotherhood' },
  { value: 'community', label: 'Community' },
  { value: 'retreat', label: 'Retreat' },
  { value: 'banquet', label: 'Banquet' },
]

const TYPE_PALETTE = {
  social: '#f1770d', fundraiser: '#f206fe', professional: '#707985',
  service: '#0abced', religious: '#045c1d', chapter_meeting: '#f10b07',
  brotherhood: '#8b5cf6', community: '#10b981', retreat: '#3b82f6', banquet: '#C9963A'
}

export default function EventDashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState('all')
  const [form, setForm] = useState({ name: '', event_type: 'social', date: '', venue: '', expected_attendees: '', description: '' })
  const role = localStorage.getItem('alm_role')

  const fetchEvents = async () => {
    try { const { data } = await api.get('/events/'); setEvents(data) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchEvents() }, [])

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const createEvent = async (e) => {
    e.preventDefault(); setCreating(true)
    try {
      await api.post('/events/', { ...form, expected_attendees: parseInt(form.expected_attendees) || 0 })
      setShowForm(false)
      setForm({ name: '', event_type: 'social', date: '', venue: '', expected_attendees: '', description: '' })
      await fetchEvents()
    } catch (err) {
      const msg = err.response?.data?.detail
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed to create event')
    }
    finally { setCreating(false) }
  }

  const upcoming = events.filter(e => new Date(e.date) >= new Date())
  const past = events.filter(e => new Date(e.date) < new Date())
  const totalExpected = events.reduce((s, e) => s + (e.expected_attendees || 0), 0)

  const typeData = EVENT_TYPES.map(t => ({
    name: t.label,
    value: events.filter(e => e.event_type === t.value).length
  })).filter(d => d.value > 0)

  const attendanceData = events.slice(-6).map(e => ({
    name: e.name.length > 12 ? e.name.slice(0, 12) + '…' : e.name,
    expected: e.expected_attendees || 0,
    actual: e.actual_attendance || 0,
  }))

  const filteredEvents = tab === 'upcoming' ? upcoming : tab === 'past' ? past : events

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>Events</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.84rem', marginTop: 3 }}>Manage and track Alpha Lambda Mu events</p>
        </div>
        {(role === 'vp_events' || role === 'president') && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={15} /> New Event
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Events', value: events.length, icon: <CalendarDays size={18} />, color: 'var(--maroon)' },
          { label: 'Upcoming', value: upcoming.length, icon: <Clock size={18} />, color: '#3b82f6' },
          { label: 'Past Events', value: past.length, icon: <TrendingUp size={18} />, color: '#10b981' },
          { label: 'Total Expected', value: totalExpected.toLocaleString(), icon: <Users size={18} />, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {events.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
          <div className="card">
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Events by Type</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {typeData.map((entry, i) => (
                    <Cell key={i} fill={TYPE_PALETTE[EVENT_TYPES.find(t => t.label === entry.name)?.value] || '#8b5cf6'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Expected vs Actual Attendance</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={attendanceData} barSize={18}>
                <XAxis dataKey="name" tick={{ fill: 'var(--gray-500)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--gray-500)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="expected" fill="var(--maroon)" radius={[4,4,0,0]} opacity={0.4} name="Expected" />
                <Bar dataKey="actual" fill="var(--maroon)" radius={[4,4,0,0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card fade-in" style={{ marginBottom: '1.75rem', borderColor: 'var(--maroon)', borderWidth: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--maroon)' }}>Create new event</h3>
            <span style={{ fontSize: '0.75rem', background: 'var(--maroon-faint)', color: 'var(--maroon)', padding: '0.2rem 0.65rem', borderRadius: 99, fontWeight: 600 }}>✦ AI checklist will be generated</span>
          </div>
          <form onSubmit={createEvent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Event name</label>
                <input name="name" value={form.name} onChange={handle} placeholder="Spring Mixer 2026" required />
              </div>
              <div className="form-group">
                <label>Event type</label>
                <select name="event_type" value={form.event_type} onChange={handle}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input name="date" type="date" value={form.date} onChange={handle} required />
              </div>
              <div className="form-group">
                <label>Venue</label>
                <input name="venue" value={form.venue} onChange={handle} placeholder="Student Union Ballroom" />
              </div>
              <div className="form-group">
                <label>Expected attendees</label>
                <input name="expected_attendees" type="number" value={form.expected_attendees} onChange={handle} placeholder="50" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input name="description" value={form.description} onChange={handle} placeholder="Brief description..." />
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? <><Loader2 size={14} className="spin" /> Generating AI checklist…</> : 'Create Event'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'all', label: `All (${events.length})` },
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'past', label: `Past (${past.length})` },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-500)' }}>Loading events…</div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-500)' }}>
          <CalendarDays size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>No events yet</p>
          <p style={{ fontSize: '0.84rem', marginTop: 4 }}>Create your first event to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filteredEvents.map(event => <EventCard key={event.id} event={event} onDelete={fetchEvents} />)}
        </div>
      )}
    </div>
  )
}