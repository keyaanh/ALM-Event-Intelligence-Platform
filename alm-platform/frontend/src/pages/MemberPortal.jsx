import { useState, useEffect } from 'react'
import '../index.css'
import { Calendar, ChevronLeft, ChevronRight, Search, Shield, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

const API_BASE = '/api'
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const TYPE_PALETTE = {
  social:'#f1770d', fundraiser:'#f206fe', professional:'#707985',
  service:'#0abced', religious:'#045c1d', chapter_meeting:'#f10b07',
  brotherhood:'#8b5cf6', community:'#10b981', retreat:'#3b82f6', banquet:'#C9963A'
}
const STATUS_STYLE = {
  present:  { bg:'#f0fdf4', color:'#166534', label:'Present' },
  tardy:    { bg:'#fffbeb', color:'#92660a', label:'Tardy' },
  excused:  { bg:'#eff6ff', color:'#1d4ed8', label:'Excused' },
  absent:   { bg:'#fef2f2', color:'#991b1b', label:'Absent' },
}

export default function MemberPortal() {
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberStrikes, setMemberStrikes] = useState(null)
  const [memberAttendance, setMemberAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('calendar') // 'calendar' | 'attendance'

  useEffect(() => {
  fetch(`${API_BASE}/events/`)
    .then(r => r.json())
    .then(data => setEvents(Array.isArray(data) ? data : []))
    .catch(() => setEvents([]))

  fetch(`${API_BASE}/attendance/members`)
    .then(r => r.json())
    .then(data => setMembers(Array.isArray(data) ? data : data.members || []))
    .catch(() => setMembers([]))
}, [])

  const lookupAttendance = async (member) => {
    setLoading(true)
    setSelectedMember(member)
    setView('attendance')
    try {
      const strikesRes = await fetch(`${API_BASE}/attendance/strikes`)
      const strikesData = await strikesRes.json()
      const myRecord = strikesData.members?.find(m => m.member_id === member.id)
      setMemberStrikes(myRecord || null)

      // Get all events and attendance for this member
      const eventsRes = await fetch(`${API_BASE}/events/`)
      const allEvents = await eventsRes.json()

      const attendanceByEvent = await Promise.all(
        allEvents.map(async ev => {
          const attRes = await fetch(`${API_BASE}/attendance/event/${ev.id}`)
          const attData = await attRes.json()
          const myAtt = attData.find(a => a.member_id === member.id)
          return { event: ev, status: myAtt?.status || null }
        })
      )
      setMemberAttendance(attendanceByEvent.filter(a => a.status !== null))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Calendar
  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calCells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  while (calCells.length % 7 !== 0) calCells.push(null)

  const getEventsForDay = (day) => {
    if (!day) return []
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return events.filter(e => e.date === dateStr)
  }

  const today = new Date()
  const isToday = (day) => day && today.getFullYear()===year && today.getMonth()===month && today.getDate()===day

  const filteredMembers = members
  .filter(m => (m.full_name || '').toLowerCase().includes(search.toLowerCase()))
  .slice(0, 8)

  return (
    <div style={{ minHeight:'100vh', background:'var(--off-white)', fontFamily:'var(--font-body)' }}>

      {/* Header */}
      <div style={{ background:'var(--maroon)', padding:'1.25rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:17, color:'white' }}>Λ</div>
          <div>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.1rem', color:'white', lineHeight:1.1 }}>Alpha Lambda Mu</p>
            <p style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Member Portal</p>
          </div>
        </div>
        <a href="/login" style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.7)', textDecoration:'none', border:'1px solid rgba(255,255,255,0.25)', padding:'0.35rem 0.9rem', borderRadius:7, transition:'all 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.color='white'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'}>
          Officer Login →
        </a>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 1.5rem' }}>

        {/* Toggle */}
        <div style={{ display:'flex', gap:4, marginBottom:'2rem', background:'white', borderRadius:10, padding:4, width:'fit-content', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          {[['calendar','📅 Events Calendar'],['attendance','👤 My Attendance']].map(([key,label]) => (
            <button key={key} onClick={()=>{ setView(key); if(key==='calendar') setSelectedMember(null) }}
              style={{ padding:'0.5rem 1.25rem', border:'none', borderRadius:7, cursor:'pointer', background:view===key?'var(--maroon)':'transparent', color:view===key?'white':'var(--gray-500)', fontWeight:700, fontSize:'0.84rem', transition:'all 0.15s', fontFamily:'var(--font-body)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── CALENDAR VIEW ── */}
        {view === 'calendar' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <button onClick={()=>setCalMonth(new Date(year,month-1,1))} className="btn btn-ghost" style={{ padding:'0.4rem 0.75rem' }}><ChevronLeft size={16}/></button>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', fontWeight:700 }}>{MONTHS[month]} {year}</h2>
              <button onClick={()=>setCalMonth(new Date(year,month+1,1))} className="btn btn-ghost" style={{ padding:'0.4rem 0.75rem' }}><ChevronRight size={16}/></button>
            </div>

            <div className="card" style={{ padding:0, overflow:'hidden', boxShadow:'var(--shadow)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
                {DAYS.map(d => <div key={d} style={{ padding:'0.65rem', textAlign:'center', fontSize:'0.72rem', fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--gray-50)' }}>{d}</div>)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                {calCells.map((day, idx) => {
                  const dayEvents = getEventsForDay(day)
                  const active = isToday(day)
                  return (
                    <div key={idx} onClick={()=>day && setSelectedDay(selectedDay===day?null:day)}
                      style={{ minHeight:100, padding:'0.5rem', borderRight:(idx+1)%7!==0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', background:active?'var(--maroon-faint)':selectedDay===day?'var(--gray-50)':'white', cursor:day?'pointer':'default', transition:'background 0.1s' }}
                      onMouseEnter={e=>{ if(day&&!active) e.currentTarget.style.background='var(--gray-50)' }}
                      onMouseLeave={e=>{ if(day&&!active&&selectedDay!==day) e.currentTarget.style.background='white' }}>
                      {day && (
                        <>
                          <div style={{ width:26, height:26, borderRadius:'50%', background:active?'var(--maroon)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:3 }}>
                            <span style={{ fontSize:'0.82rem', fontWeight:active?700:500, color:active?'white':'var(--gray-700)' }}>{day}</span>
                          </div>
                          {dayEvents.map(ev => (
                            <div key={ev.id} style={{ fontSize:'0.65rem', fontWeight:600, padding:'0.12rem 0.35rem', borderRadius:4, marginBottom:2, background:TYPE_PALETTE[ev.event_type]||'var(--maroon)', color:'white', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
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
              return dayEvents.length > 0 ? (
                <div className="card fade-in" style={{ marginTop:'1rem' }}>
                  <p style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'0.75rem' }}>{MONTHS[month]} {selectedDay}, {year}</p>
                  {dayEvents.map(ev => (
                    <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem', background:'var(--gray-50)', borderRadius:8, marginBottom:6 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:TYPE_PALETTE[ev.event_type]||'var(--maroon)', flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:700, fontSize:'0.9rem' }}>{ev.name}</p>
                        <p style={{ fontSize:'0.78rem', color:'var(--gray-500)' }}>{ev.event_type.replace('_',' ')} {ev.venue && `· ${ev.venue}`}</p>
                        {ev.description && <p style={{ fontSize:'0.78rem', color:'var(--gray-400)', marginTop:2 }}>{ev.description}</p>}
                      </div>
                      <span style={{ fontSize:'0.72rem', color:'white', background:TYPE_PALETTE[ev.event_type]||'var(--maroon)', padding:'0.2rem 0.6rem', borderRadius:99 }}>{ev.expected_attendees} exp.</span>
                    </div>
                  ))}
                </div>
              ) : null
            })()}

            {/* Upcoming events list */}
            <div style={{ marginTop:'1.5rem' }}>
              <p style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--gray-700)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' }}>Upcoming Events</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                {events.filter(e => new Date(e.date) >= new Date()).slice(0,5).map(ev => (
                  <div key={ev.id} className="card" style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.9rem 1.25rem', borderLeft:`3px solid ${TYPE_PALETTE[ev.event_type]||'var(--maroon)'}` }}>
                    <div>
                      <p style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--gray-900)' }}>{ev.name}</p>
                      <p style={{ fontSize:'0.78rem', color:'var(--gray-500)' }}>
                        {new Date(ev.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                        {ev.venue && ` · ${ev.venue}`}
                      </p>
                    </div>
                    <span style={{ marginLeft:'auto', fontSize:'0.7rem', fontWeight:700, textTransform:'capitalize', color:TYPE_PALETTE[ev.event_type]||'var(--maroon)', background:`${TYPE_PALETTE[ev.event_type]||'var(--maroon)'}15`, padding:'0.2rem 0.6rem', borderRadius:99 }}>
                      {ev.event_type.replace('_',' ')}
                    </span>
                  </div>
                ))}
                {events.filter(e => new Date(e.date) >= new Date()).length === 0 && (
                  <p style={{ color:'var(--gray-400)', fontSize:'0.84rem', textAlign:'center', padding:'1.5rem' }}>No upcoming events</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ATTENDANCE VIEW ── */}
        {view === 'attendance' && (
          <div>
            {!selectedMember ? (
              <div>
                <div className="card" style={{ marginBottom:'1.5rem', padding:'2rem', textAlign:'center' }}>
                  <Shield size={36} color="var(--maroon)" style={{ margin:'0 auto 0.75rem' }}/>
                  <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', marginBottom:6 }}>Check Your Attendance</h2>
                  <p style={{ color:'var(--gray-500)', fontSize:'0.84rem', marginBottom:'1.25rem' }}>Search your name to see your attendance record and strike count</p>
                  <div style={{ maxWidth:360, margin:'0 auto', position:'relative' }}>
                    <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--gray-300)' }}/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Type your name..." style={{ paddingLeft:'2.25rem', fontSize:'0.9rem' }}/>
                  </div>
                  {search && (
                    <div style={{ maxWidth:360, margin:'0.5rem auto 0', background:'white', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', boxShadow:'var(--shadow)' }}>
                      {filteredMembers.length === 0 ? (
                        <p style={{ padding:'1rem', color:'var(--gray-400)', fontSize:'0.84rem' }}>No members found</p>
                      ) : filteredMembers.map(m => (
                        <div key={m.id} onClick={()=>lookupAttendance(m)}
                          style={{ padding:'0.75rem 1rem', cursor:'pointer', borderBottom:'1px solid var(--border)', transition:'background 0.1s', display:'flex', alignItems:'center', gap:10 }}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--maroon-faint)'}
                          onMouseLeave={e=>e.currentTarget.style.background='white'}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--maroon)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'0.85rem', flexShrink:0 }}>
                            {m.full_name.charAt(0)}
                          </div>
                          <span style={{ fontWeight:600, color:'var(--gray-900)', fontSize:'0.88rem' }}>{m.full_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : loading ? (
              <div style={{ textAlign:'center', padding:'4rem', color:'var(--gray-500)' }}>
                <div className="spin" style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--maroon)', borderRadius:'50%', margin:'0 auto 1rem' }}/>
                Loading your record…
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem' }}>
                  <button onClick={()=>{ setSelectedMember(null); setSearch(''); setMemberStrikes(null) }} className="btn btn-ghost" style={{ padding:'0.4rem 0.9rem', fontSize:'0.8rem' }}>← Back</button>
                  <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>{selectedMember.full_name}</h2>
                </div>

                {memberStrikes && (
                  <>
                    {/* Strike alert */}
                    {memberStrikes.strikes >= 2 && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'1rem 1.25rem', marginBottom:'1.25rem' }}>
                        <AlertTriangle size={18} color="#991b1b" style={{ flexShrink:0, marginTop:1 }}/>
                        <div>
                          <p style={{ fontWeight:700, color:'#991b1b', fontSize:'0.9rem' }}>
                            {memberStrikes.strikes >= 3 ? 'Retreat Ineligible — 3+ Strikes' : 'Warning — 2 Strikes'}
                          </p>
                          <p style={{ fontSize:'0.82rem', color:'#991b1b', marginTop:2 }}>
                            {memberStrikes.strikes >= 3
                              ? 'You have 3 or more strikes and are currently ineligible for the retreat. Please meet with the Standards committee.'
                              : 'You have 2 strikes. One more will make you ineligible for the retreat. Please contact the VP of Standards.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.25rem' }}>
                      {[
                        { label:'Present', value:memberStrikes.present, color:'#166534', bg:'#f0fdf4' },
                        { label:'Tardy', value:memberStrikes.tardy, color:'#92660a', bg:'#fffbeb' },
                        { label:'Unexcused', value:memberStrikes.unexcused, color:'#991b1b', bg:'#fef2f2' },
                        { label:'Strikes', value:memberStrikes.strikes, color:memberStrikes.strikes>=3?'#991b1b':memberStrikes.strikes>=2?'#92660a':'#166534', bg:memberStrikes.strikes>=3?'#fef2f2':memberStrikes.strikes>=2?'#fffbeb':'#f0fdf4' },
                      ].map(s => (
                        <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'1rem', textAlign:'center' }}>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.6rem', color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:'0.72rem', color:s.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:3 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Retreat eligibility */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0.9rem 1.25rem', borderRadius:10, marginBottom:'1.25rem', background:memberStrikes.retreat_ineligible?'#fef2f2':'#f0fdf4', border:`1px solid ${memberStrikes.retreat_ineligible?'#fca5a5':'#86efac'}` }}>
                      {memberStrikes.retreat_ineligible ? <XCircle size={18} color="#991b1b"/> : <CheckCircle2 size={18} color="#166534"/>}
                      <span style={{ fontWeight:700, color:memberStrikes.retreat_ineligible?'#991b1b':'#166534', fontSize:'0.9rem' }}>
                        {memberStrikes.retreat_ineligible ? 'Currently ineligible for retreat' : 'Eligible for retreat ✓'}
                      </span>
                    </div>
                  </>
                )}

                {/* Attendance history */}
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <div style={{ padding:'0.75rem 1.25rem', background:'var(--maroon)', color:'white' }}>
                    <p style={{ fontWeight:700, fontSize:'0.84rem' }}>Attendance History</p>
                  </div>
                  {memberAttendance.length === 0 ? (
                    <p style={{ padding:'2rem', color:'var(--gray-400)', textAlign:'center', fontSize:'0.84rem' }}>No attendance recorded yet</p>
                  ) : memberAttendance.map(({ event, status }) => {
                    const st = STATUS_STYLE[status]
                    return (
                      <div key={event.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem 1.25rem', borderBottom:'1px solid var(--border)' }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--gray-900)' }}>{event.name}</p>
                          <p style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{new Date(event.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</p>
                        </div>
                        <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.65rem', borderRadius:99, background:st.bg, color:st.color }}>
                          {st.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}