import { useState } from 'react'
import { Calendar, MapPin, Users, ChevronDown, ChevronUp, Trash2, CheckCircle2, Circle } from 'lucide-react'
import api from '../lib/api'

const CATEGORY_COLORS = {
  logistics: '#3b82f6', marketing: '#8b5cf6', finance: '#f59e0b',
  volunteers: '#10b981', setup: '#f97316'
}
const TYPE_COLORS = {
  social: { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe' },
  fundraiser: { bg: '#fffbeb', text: '#92660a', border: '#fde68a' },
  professional: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  community: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
}

export default function EventCard({ event, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [checked, setChecked] = useState({})
  const role = localStorage.getItem('alm_role')

  const del = async () => {
    if (!confirm(`Delete "${event.name}"?`)) return
    await api.delete(`/events/${event.id}`)
    onDelete()
  }

  const upcoming = new Date(event.date) >= new Date()
  const checklist = event.checklist || []
  const done = Object.values(checked).filter(Boolean).length
  const typeStyle = TYPE_COLORS[event.event_type] || TYPE_COLORS.social

  return (
    <div className="card card-hover fade-in" style={{ position: 'relative' }}>
      {/* Type badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.9rem' }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.65rem',
          borderRadius: 99, textTransform: 'capitalize', letterSpacing: '0.03em',
          background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}`
        }}>{event.event_type}</span>
        <span style={{
          fontSize: '0.68rem', fontWeight: 600, padding: '0.2rem 0.55rem',
          borderRadius: 99, background: upcoming ? '#f0fdf4' : 'var(--gray-100)',
          color: upcoming ? '#166534' : 'var(--gray-500)',
          border: `1px solid ${upcoming ? '#bbf7d0' : 'var(--border)'}`
        }}>{upcoming ? 'Upcoming' : 'Past'}</span>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--gray-900)', marginBottom: '0.75rem', lineHeight: 1.3 }}>
        {event.name}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: '1rem' }}>
        <Meta icon={<Calendar size={12} />} text={new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} />
        {event.venue && <Meta icon={<MapPin size={12} />} text={event.venue} />}
        {event.expected_attendees > 0 && <Meta icon={<Users size={12} />} text={`${event.expected_attendees} expected`} />}
      </div>

      {event.description && (
        <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: '1rem', lineHeight: 1.6 }}>{event.description}</p>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '0.75rem 0' }} />
          <button onClick={() => setExpanded(!expanded)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maroon)',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem',
            fontWeight: 600, padding: 0, fontFamily: 'var(--font-body)'
          }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            AI Checklist · {done}/{checklist.length} done
          </button>

          {expanded && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {checklist.map((item, i) => (
                <div key={i} onClick={() => setChecked(c => ({ ...c, [i]: !c[i] }))}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '0.4rem 0.5rem', borderRadius: 6, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {checked[i]
                    ? <CheckCircle2 size={14} color="#166534" style={{ marginTop: 1, flexShrink: 0 }} />
                    : <Circle size={14} color="var(--gray-300)" style={{ marginTop: 1, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.8rem', color: checked[i] ? 'var(--gray-300)' : 'var(--gray-700)', textDecoration: checked[i] ? 'line-through' : 'none' }}>{item.task}</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 1 }}>
                      <span style={{ fontSize: '0.65rem', color: CATEGORY_COLORS[item.category] || 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.category}</span>
                      {item.due_offset_days != null && <span style={{ fontSize: '0.65rem', color: 'var(--gray-300)' }}>{item.due_offset_days}d before</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete button */}
      {(role === 'vp_events' || role === 'admin') && (
        <button onClick={del} style={{
          position: 'absolute', top: 14, right: 14, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--gray-300)', transition: 'color 0.15s', padding: 2, borderRadius: 4
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-300)'}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function Meta({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: '0.79rem' }}>
      <span style={{ color: 'var(--gray-300)' }}>{icon}</span> {text}
    </div>
  )
}