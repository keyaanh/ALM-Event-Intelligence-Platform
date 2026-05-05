import { useState, useEffect } from 'react'
import BudgetRequestModal from '../components/BudgetRequestModal'
import api from '../lib/api'
import EventCard from '../components/EventCard'
import { Plus, Loader2, CalendarDays, Users, TrendingUp, Clock, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react'
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

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function EventDashboard() {
  const [events, setEvents] = useState([])
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState('events')
  const [listTab, setListTab] = useState('all')
  const [chapterRate, setChapterRate] = useState(null)
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [form, setForm] = useState({ name: '', event_type: 'social', date: '', venue: '', expected_attendees: '', description: '' })
  const role = localStorage.getItem('alm_role')
  const canEdit = role === 'vp_events' || role === 'president'

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/events/')
      setEvents(data)
    } finally { setLoading(false) }
  }

  const fetchAttendance = async () => {
    try {
      const { data } = await api.get('/attendance/strikes')
      setChapterRate(data.chapter_attendance_rate)
    } catch {}
  }

  useEffect(() => { fetchEvents(); fetchAttendance() }, [])

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const createEvent = async (e) => {
    e.preventDefault(); setCreating(true)
    try {
      await api.post('/events/', { ...form, expected_attendees: parseInt(form.expected_attendees) || 0 })
      setShowForm(false)
      setForm({ name: '', event_type: 'social', date: '', venue: '', expected_attendees: '', description: '' })
      await fetchEvents()
    } catch (err) { alert(err.response?.data?.detail || 'Failed to create event') }
    finally { setCreating(false) }
  }

  const upcoming = events.filter(e => new Date(e.date) >= new Date())
  const past = events.filter(e => new Date(e.date) < new Date())

  const typeData = EVENT_TYPES.map(t => ({
    name: t.label, value: events.filter(e => e.event_type === t.value).length
  })).filter(d => d.value > 0)

  const attendanceData = events.map(e => ({
    name: e.name.length > 10 ? e.name.slice(0, 10) + '…' : e.name,
    expected: e.expected_attendees || 0,
    actual: e.actual_attendance || 0,
  }))

  const filteredEvents = listTab === 'upcoming' ? upcoming : listTab === 'past' ? past : events

  // Calendar logic
  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calCells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  while (calCells.length % 7 !== 0) calCells.push(null)

  const getEventsForDay = (day) => {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  const today = new Date()
  const isToday = (day) => day && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Events</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: 3 }}>Manage and track Alpha Lambda Mu events</p>
        </div>
        {canEdit && (
          <div style={{display:'flex',gap:'0.6rem'}}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowBudgetModal(true)}
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              <DollarSign size={13}/> Budget Request
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={15} /> New Event
            </button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Events', value: events.length, icon: <CalendarDays size={18} />, color: 'var(--maroon)' },
          { label: 'Upcoming', value: upcoming.length, icon: <Clock size={18} />, color: 'var(--blue)' },
          { label: 'Past Events', value: past.length, icon: <TrendingUp size={18} />, color: 'var(--green)' },
          { label: 'Chapter Attendance', value: chapterRate !== null ? `${chapterRate}%` : '—', icon: <Users size={18} />, color: chapterRate >= 75 ? '#10b981' : chapterRate >= 50 ? '#f59e0b' : '#ef4444' },
        ].map(s => (
          <div key={s.label} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {events.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
          <div className="card">
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Events by Type</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {typeData.map((entry, i) => <Cell key={i} fill={TYPE_PALETTE[EVENT_TYPES.find(t => t.label === entry.name)?.value] || '#8b5cf6'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Expected vs Actual Attendance</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={attendanceData} barSize={18}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="expected" fill="var(--maroon)" radius={[4,4,0,0]} opacity={0.5} name="Expected" />
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

      {/* Main tabs */}
      <div className="tabs">
        {[{ key: 'events', label: 'Events' }, { key: 'calendar', label: 'Calendar' }].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Events list */}
      {tab === 'events' && (
        <div className="fade-in">
          <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem' }}>
            {[{ key: 'all', label: `All (${events.length})` }, { key: 'upcoming', label: `Upcoming (${upcoming.length})` }, { key: 'past', label: `Past (${past.length})` }].map(t => (
              <button key={t.key} onClick={() => setListTab(t.key)} style={{ padding: '0.4rem 1rem', borderRadius: 7, border: '1.5px solid', borderColor: listTab === t.key ? 'var(--maroon)' : 'var(--border)', background: listTab === t.key ? 'var(--maroon-faint)' : 'white', color: listTab === t.key ? 'var(--maroon)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', marginRight: 6, transition: 'all 0.15s' }}>{t.label}</button>
            ))}
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading…</div>
          ) : filteredEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <CalendarDays size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontWeight: 600 }}>No events yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {filteredEvents.map(event => <EventCard key={event.id} event={event} onDelete={fetchEvents} />)}
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      {tab === 'calendar' && (
        <div className="fade-in">
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem' }}><ChevronLeft size={16} /></button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>{MONTHS[month]} {year}</h2>
            <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem' }}><ChevronRight size={16} /></button>
          </div>

          {/* Calendar grid */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
              {DAYS.map(d => (
                <div key={d} style={{ padding: '0.6rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface)' }}>{d}</div>
              ))}
            </div>
            {/* Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {calCells.map((day, idx) => {
                const dayEvents = getEventsForDay(day)
                const active = isToday(day)
                const isSelected = selectedDay === day
                return (
                  <div key={idx} onClick={() => day && setSelectedDay(isSelected ? null : day)}
                    style={{ minHeight: 90, padding: '0.5rem', borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)', background: active ? 'var(--maroon-faint)' : isSelected ? 'var(--surface)' : 'white', cursor: day ? 'pointer' : 'default', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (day && !active) e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={e => { if (day && !active && !isSelected) e.currentTarget.style.background = 'white' }}>
                    {day && (
                      <>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: active ? 'var(--maroon)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: active ? 700 : 500, color: active ? 'white' : 'var(--text-secondary)' }}>{day}</span>
                        </div>
                        {dayEvents.map(ev => (
                          <div key={ev.id} style={{ fontSize: '0.67rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: 4, marginBottom: 2, background: TYPE_PALETTE[ev.event_type] || 'var(--maroon)', color: 'white', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {ev.name}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (() => {
            const dayEvents = getEventsForDay(selectedDay)
            return (
              <div className="card fade-in" style={{ marginTop: '1rem' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.75rem' }}>
                  {MONTHS[month]} {selectedDay}, {year}
                </p>
                {dayEvents.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ color: 'var(--gray-400)', fontSize: '0.84rem' }}>No events scheduled</p>
                    {canEdit && (
                      <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }} onClick={() => {
                        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
                        setForm(f => ({ ...f, date: dateStr }))
                        setShowForm(true)
                        setTab('events')
                      }}><Plus size={13} /> Add Event</button>
                    )}
                  </div>
                ) : dayEvents.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_PALETTE[ev.event_type] || 'var(--maroon)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ev.name}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ev.event_type.replace('_', ' ')} {ev.venue && `· ${ev.venue}`}</p>
                      {ev.description && <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>{ev.description}</p>}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'white', background: TYPE_PALETTE[ev.event_type] || 'var(--maroon)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>{ev.expected_attendees} exp.</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
      {showBudgetModal && <BudgetRequestModal onClose={() => setShowBudgetModal(false)} />}
    </div>
  )
}