import { useState, useEffect } from 'react'
import BudgetRequestModal from '../components/BudgetRequestModal'
import api from '../lib/api'
import { Shield, AlertTriangle, CheckCircle2, XCircle, Clock, Users, TrendingUp, Save, Loader2 , DollarSign } from 'lucide-react'

const STATUS_OPTIONS = ['present','tardy','excused','absent']
const STATUS_STYLE = {
  present:  { bg: '#f0fdf4', color: 'var(--green)', border: 'var(--green-border)', label: 'P' },
  tardy:    { bg: '#fffbeb', color: 'var(--yellow)', border: 'var(--yellow-border)', label: 'T' },
  excused:  { bg: '#eff6ff', color: 'var(--blue)', border: 'var(--blue-border)', label: 'E' },
  absent:   { bg: '#fef2f2', color: 'var(--red)', border: 'var(--red-border)', label: 'A' },
  unmarked: { bg: 'var(--surface)', color: 'var(--border-strong)', border: 'var(--border)', label: '—' },
}
const MANDATORY_TYPES = new Set(['social','fundraiser','professional','service','religious','chapter_meeting','brotherhood'])

export default function StandardsPage() {
  const [strikes, setStrikes] = useState(null)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [attendance, setAttendance] = useState({}) // {eventId: {memberId: status}}
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('tracker')
  const [pins, setPins] = useState({})
  const [savingPin, setSavingPin] = useState(null)
  const role = localStorage.getItem('alm_role')
  const canEdit = role === 'vp_standards' || role === 'president'

  const savePin = async (memberId, pin) => {
    if (!pin || pin.length !== 4 || isNaN(pin)) { alert('PIN must be exactly 4 digits'); return }
    setSavingPin(memberId)
    try {
      await api.patch(`/attendance/members/${memberId}/pin`, { pin })
      alert('PIN saved!')
    } catch (err) { alert('Failed to save PIN') }
    finally { setSavingPin(null) }
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [strikesRes, eventsRes, membersRes] = await Promise.all([
      api.get('/attendance/strikes'),
      api.get('/events/'),
      api.get('/attendance/members')
    ])
    setStrikes(strikesRes.data)
    const mandatory = eventsRes.data.filter(e => MANDATORY_TYPES.has(e.event_type))
    setEvents(mandatory)
    setMembers(membersRes.data)
    if (mandatory.length > 0 && !selectedEvent) setSelectedEvent(mandatory[0].id)
  }

  const fetchEventAttendance = async (eventId) => {
    const res = await api.get(`/attendance/event/${eventId}`)
    const map = {}
    res.data.forEach(a => { map[a.member_id] = a.status })
    setAttendance(prev => ({ ...prev, [eventId]: map }))
  }

  useEffect(() => {
    if (selectedEvent && !attendance[selectedEvent]) {
      fetchEventAttendance(selectedEvent)
    }
  }, [selectedEvent])

  const setStatus = (memberId, status) => {
    if (!canEdit) return
    setAttendance(prev => ({
      ...prev,
      [selectedEvent]: { ...(prev[selectedEvent] || {}), [memberId]: status }
    }))
  }

  const cycleStatus = (memberId) => {
    const current = attendance[selectedEvent]?.[memberId] || 'unmarked'
    const cycle = ['present', 'tardy', 'excused', 'absent', 'unmarked']
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length]
    const actual = next === 'unmarked' ? null : next
    if (actual) setStatus(memberId, actual)
    else {
      setAttendance(prev => {
        const updated = { ...(prev[selectedEvent] || {}) }
        delete updated[memberId]
        return { ...prev, [selectedEvent]: updated }
      })
    }
  }

  const saveAttendance = async () => {
    if (!selectedEvent || !canEdit) return
    setSaving(true)
    try {
      const records = members.map(m => ({
        member_id: m.id,
        status: attendance[selectedEvent]?.[m.id] || 'absent'
      }))
      await api.post('/attendance/bulk', { event_id: selectedEvent, records })
      await fetchAll()
    } catch (err) { alert('Failed to save') }
    finally { setSaving(false) }
  }

  const selectedEventData = events.find(e => e.id === selectedEvent)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Standards</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: 3 }}>Attendance tracking, strikes, and retreat eligibility</p>
        </div>
        {strikes && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="card" style={{ padding: '0.75rem 1.25rem', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--maroon)' }}>{strikes.chapter_attendance_rate}%</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chapter Rate</div>
            </div>
            <div className="card" style={{ padding: '0.75rem 1.25rem', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--red)' }}>
                {strikes.members?.filter(m => m.retreat_ineligible).length || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ineligible</div>
            </div>
          </div>
        )}
      </div>

            <button
        className="btn btn-ghost btn-sm"
        onClick={() => setShowBudgetModal(true)}
        style={{ display:'flex', alignItems:'center', gap:5, marginBottom:'1rem' }}>
        <DollarSign size={13}/> Budget Request
      </button>

      <div className="tabs">
        {[{ key: 'tracker', label: 'Attendance Tracker' }, { key: 'strikes', label: 'Strikes & Eligibility' }].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Attendance Tracker */}
      {tab === 'tracker' && (
        <div className="fade-in">
          {/* Event selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {events.map(e => (
              <button key={e.id} onClick={() => setSelectedEvent(e.id)} style={{
                padding: '0.45rem 1rem', borderRadius: 8, border: '1.5px solid',
                borderColor: selectedEvent === e.id ? 'var(--maroon)' : 'var(--border)',
                background: selectedEvent === e.id ? 'var(--maroon-faint)' : 'white',
                color: selectedEvent === e.id ? 'var(--maroon)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s'
              }}>
                {e.name}
              </button>
            ))}
            {events.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No mandatory events yet. Create events with mandatory types to track attendance.</p>}
          </div>

          {selectedEvent && (
            <>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Click to cycle:</span>
                {STATUS_OPTIONS.map(s => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 5, background: STATUS_STYLE[s].bg, border: `1px solid ${STATUS_STYLE[s].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: STATUS_STYLE[s].color }}>{STATUS_STYLE[s].label}</span>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s}</span>
                  </span>
                ))}
                {canEdit && (
                  <button className="btn btn-primary" onClick={saveAttendance} disabled={saving} style={{ marginLeft: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                    {saving ? <><Loader2 size={13} className="spin" /> Saving…</> : <><Save size={13} /> Save Attendance</>}
                  </button>
                )}
              </div>

              {/* Grid */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedEventData?.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {Object.values(attendance[selectedEvent] || {}).filter(s => s === 'present' || s === 'tardy').length} / {members.length} present
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                  {members.map((member, i) => {
                    const status = attendance[selectedEvent]?.[member.id] || 'unmarked'
                    const style = STATUS_STYLE[status]
                    return (
                      <div key={member.id} onClick={() => canEdit && cycleStatus(member.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none', borderRight: '1px solid var(--border)', cursor: canEdit ? 'pointer' : 'default', transition: 'background 0.1s', background: status !== 'unmarked' ? style.bg : 'white' }}
                        onMouseEnter={e => { if (canEdit) e.currentTarget.style.background = 'var(--surface)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = status !== 'unmarked' ? style.bg : 'white' }}>
                        <span style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 500 }}>{member.full_name}</span>
                        <span style={{ width: 26, height: 26, borderRadius: 6, background: style.bg, border: `1.5px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: style.color, flexShrink: 0 }}>{style.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Strikes & Eligibility */}
      {tab === 'strikes' && strikes && (
        <div className="fade-in">
          {/* Chapter summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Chapter Attendance', value: `${strikes.chapter_attendance_rate}%`, color: strikes.chapter_attendance_rate >= 75 ? '#10b981' : strikes.chapter_attendance_rate >= 50 ? '#f59e0b' : '#ef4444' },
              { label: 'Total Members', value: strikes.total_members, color: 'var(--maroon)' },
              { label: 'Mandatory Events', value: strikes.total_mandatory_events, color: 'var(--blue)' },
              { label: 'Retreat Ineligible', value: strikes.members?.filter(m => m.retreat_ineligible).length, color: 'var(--red)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Member strikes table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--maroon)' }}>
                  {['Member', 'Present', 'Tardy', 'Excused', 'Unexcused', 'Strikes', 'Retreat'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, textAlign: h === 'Member' ? 'left' : 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {strikes.members?.map((m, i) => (
                  <tr key={m.member_id} style={{ background: m.retreat_ineligible ? '#fef2f2' : i % 2 === 0 ? 'white' : 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.full_name}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 700 }}>{m.present}</span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--yellow)', fontWeight: 700 }}>{m.tardy}</span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 700 }}>{m.excused}</span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 700 }}>{m.unexcused}</span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: m.strikes >= 3 ? '#fef2f2' : m.strikes >= 2 ? '#fffbeb' : '#f0fdf4', color: m.strikes >= 3 ? '#991b1b' : m.strikes >= 2 ? '#92660a' : '#166534', fontWeight: 800, fontSize: '0.85rem', border: `2px solid ${m.strikes >= 3 ? 'var(--red-border)' : m.strikes >= 2 ? 'var(--yellow-border)' : 'var(--green-border)'}` }}>
                        {m.strikes}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      {m.retreat_ineligible
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--red)', fontWeight: 700, background: 'var(--red-bg)', padding: '0.2rem 0.6rem', borderRadius: 99, border: '1px solid #fca5a5' }}><XCircle size={11} /> Ineligible</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--green)', fontWeight: 700, background: 'var(--green-bg)', padding: '0.2rem 0.6rem', borderRadius: 99, border: '1px solid #86efac' }}><CheckCircle2 size={11} /> Eligible</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        {/* PIN Management */}
        {canEdit && (
          <div style={{ marginTop:'1.5rem' }}>
            <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' }}>Member Portal PINs</p>
            <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:'1rem' }}>Set a 4-digit PIN for each member so they can privately view their own attendance on the member portal.</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:'0.6rem' }}>
              {strikes?.members?.map(m => (
                <div key={m.member_id} style={{ display:'flex', alignItems:'center', gap:8, padding:'0.6rem 0.75rem', background:'white', borderRadius:8, border:'1px solid var(--border)' }}>
                  <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-primary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.full_name}</span>
                  <input
                    type="text" maxLength={4} placeholder="PIN"
                    value={pins[m.member_id] || ''}
                    onChange={e => setPins(p => ({...p, [m.member_id]: e.target.value.replace(/\D/g,'').slice(0,4)}))}
                    style={{ width:56, padding:'0.3rem 0.4rem', fontSize:'0.82rem', textAlign:'center', letterSpacing:'0.15em' }}
                  />
                  <button
                    onClick={() => savePin(m.member_id, pins[m.member_id])}
                    disabled={savingPin === m.member_id || !pins[m.member_id]}
                    className="btn btn-primary"
                    style={{ padding:'0.3rem 0.6rem', fontSize:'0.72rem', flexShrink:0 }}>
                    {savingPin === m.member_id ? '…' : 'Set'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
      {showBudgetModal && <BudgetRequestModal onClose={() => setShowBudgetModal(false)} />}
    </div>
  )
}