import { useState } from 'react'
import { Calendar, MapPin, Users, ChevronDown, ChevronUp, Trash2, CheckCircle2, Circle } from 'lucide-react'
import api from '../lib/api'

const CAT_COLORS = { logistics:'#3b82f6', marketing:'#8b5cf6', finance:'var(--gold)', volunteers:'#10b981', setup:'#f97316' }
const TYPE_STYLES = {
  social:          { bg:'#FDF4FF', color:'#7C3AED', label:'Social' },
  fundraiser:      { bg:'#FFFBEB', color:'#92660A', label:'Fundraiser' },
  professional:    { bg:'#EFF6FF', color:'#1E40AF', label:'Professional' },
  service:         { bg:'#F0FDFA', color:'#0F766E', label:'Service' },
  religious:       { bg:'#F0FDF4', color:'#166534', label:'Religious' },
  chapter_meeting: { bg:'#FFF1F2', color:'#9F1239', label:'Chapter Meeting' },
  brotherhood:     { bg:'#FFF7ED', color:'#C2410C', label:'Brotherhood' },
  community:       { bg:'#F0FDF4', color:'#166534', label:'Community' },
  retreat:         { bg:'#EFF6FF', color:'#1E40AF', label:'Retreat' },
  banquet:         { bg:'#FFFBEB', color:'#92660A', label:'Banquet' },
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
  const typeStyle = TYPE_STYLES[event.event_type] || { bg: 'var(--surface)', color: 'var(--text-secondary)', label: event.event_type }

  return (
    <div className="card card-hover" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 99, background: typeStyle.bg, color: typeStyle.color, letterSpacing: '0.03em' }}>
          {typeStyle.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 500, color: upcoming ? 'var(--green)' : 'var(--text-muted)', background: upcoming ? 'var(--green-bg)' : 'var(--surface)', padding: '0.18rem 0.55rem', borderRadius: 99, border: `1px solid ${upcoming ? 'var(--green-border)' : 'var(--border)'}` }}>
            {upcoming ? 'Upcoming' : 'Past'}
          </span>
          {(role === 'vp_events' || role === 'president') && (
            <button onClick={del} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', padding: 2, borderRadius: 4, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--border-strong)'}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.75rem', lineHeight: 1.3 }}>
        {event.name}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: event.description ? '0.75rem' : '1rem' }}>
        <Meta icon={<Calendar size={12} />} text={new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} />
        {event.venue && <Meta icon={<MapPin size={12} />} text={event.venue} />}
        {event.expected_attendees > 0 && <Meta icon={<Users size={12} />} text={`${event.expected_attendees} expected`} />}
      </div>

      {event.description && (
        <p style={{ fontSize: '0.81rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>{event.description}</p>
      )}

      {checklist.length > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: '0.75rem' }} />
          <button onClick={() => setExpanded(!expanded)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.77rem', fontWeight: 500, color: 'var(--text-muted)',
            padding: 0, transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--maroon)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            AI Checklist · {done}/{checklist.length} done
          </button>

          {expanded && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {checklist.map((item, i) => (
                <div key={i} onClick={() => setChecked(c => ({ ...c, [i]: !c[i] }))}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', padding: '0.35rem 0.5rem', borderRadius: 6, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {checked[i]
                    ? <CheckCircle2 size={13} color="var(--green)" style={{ marginTop: 2, flexShrink: 0 }} />
                    : <Circle size={13} color="var(--border-strong)" style={{ marginTop: 2, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.79rem', color: checked[i] ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked[i] ? 'line-through' : 'none' }}>{item.task}</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 1 }}>
                      <span style={{ fontSize: '0.64rem', color: CAT_COLORS[item.category] || 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.category}</span>
                      {item.due_offset_days != null && <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>{item.due_offset_days}d before</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Meta({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.79rem' }}>
      <span style={{ opacity: 0.6 }}>{icon}</span>{text}
    </div>
  )
}