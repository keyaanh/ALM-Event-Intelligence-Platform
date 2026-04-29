import { useState, useEffect } from 'react'
import '../index.css'
import { ChevronLeft, ChevronRight, Search, Shield, CheckCircle2, XCircle, AlertTriangle, Lock } from 'lucide-react'

const API = '/api'
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const TYPE_PALETTE = {
  social:'#f1770d', fundraiser:'#f206fe', professional:'#707985',
  service:'#0abced', religious:'#045c1d', chapter_meeting:'#f10b07',
  brotherhood:'#8b5cf6', community:'#10b981', retreat:'#3b82f6', banquet:'#C9963A'
}
const STATUS_STYLE = {
  present: { bg:'#f0fdf4', color:'#166534', label:'Present' },
  tardy:   { bg:'#fffbeb', color:'#92660a', label:'Tardy' },
  excused: { bg:'#eff6ff', color:'#1d4ed8', label:'Excused' },
  absent:  { bg:'#fef2f2', color:'#991b1b', label:'Absent' },
}

export default function MemberPortal() {
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [view, setView] = useState('calendar')

  // Attendance flow states
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [pinInput, setPinInput] = useState('')
  const [pinStep, setPinStep] = useState('search') // 'search' | 'pin' | 'verified'
  const [pinError, setPinError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [attendanceData, setAttendanceData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Public endpoints — no auth token needed
    fetch(`${API}/events/public`).then(r => r.json()).then(setEvents).catch(() => {})
    fetch(`${API}/attendance/public/members`).then(r => r.json()).then(setMembers).catch(() => {})
  }, [])

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6)

  const selectMember = (member) => {
    setSelectedMember(member)
    setPinStep('pin')
    setPinInput('')
    setPinError('')
  }

  const verifyPin = async () => {
    if (pinInput.length !== 4) { setPinError('Enter your 4-digit PIN'); return }
    setVerifying(true)
    setPinError('')
    try {
      const res = await fetch(`${API}/attendance/public/verify-pin?member_id=${selectedMember.id}&pin=${pinInput}`, { method:'POST' })
      const data = await res.json()
      if (data.no_pin) {
        setPinError('No PIN set for your account yet. Ask your VP of Standards to set one.')
      } else if (!data.valid) {
        setPinError('Incorrect PIN. Try again.')
        setPinInput('')
      } else {
        // PIN correct — load attendance
        setLoading(true)
        setPinStep('verified')
        const attRes = await fetch(`${API}/attendance/public/my-attendance/${selectedMember.id}?pin=${pinInput}`)
        const attData = await attRes.json()
        setAttendanceData(attData)
        setLoading(false)
      }
    } catch (e) {
      setPinError('Something went wrong. Try again.')
    } finally { setVerifying(false) }
  }

  const resetSearch = () => {
    setSelectedMember(null)
    setPinStep('search')
    setPinInput('')
    setPinError('')
    setAttendanceData(null)
    setSearch('')
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
  const isToday = (d) => d && today.getFullYear()===year && today.getMonth()===month && today.getDate()===d

  return (
    <div style={{ minHeight:'100vh', background:'var(--off-white)' }}>
      {/* Header */}
      <div style={{ background:'var(--maroon)', padding:'1.1rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, color:'white' }}>Λ</div>
          <div>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1rem', color:'white', lineHeight:1.1 }}>Alpha Lambda Mu</p>
            <p style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Member Portal</p>
          </div>
        </div>
        <a href="/login" style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.65)', textDecoration:'none', border:'1px solid rgba(255,255,255,0.2)', padding:'0.3rem 0.85rem', borderRadius:7, transition:'all 0.15s' }}>
          Officer Login →
        </a>
      </div>

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'2rem 1.5rem' }}>
        {/* Toggle */}
        <div style={{ display:'flex', gap:4, marginBottom:'2rem', background:'white', borderRadius:10, padding:4, width:'fit-content', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
          {[['calendar','📅 Events Calendar'],['attendance','🔒 My Attendance']].map(([key,label]) => (
            <button key={key} onClick={()=>{ setView(key); if(key==='calendar') resetSearch() }}
              style={{ padding:'0.5rem 1.25rem', border:'none', borderRadius:7, cursor:'pointer', background:view===key?'var(--maroon)':'transparent', color:view===key?'white':'var(--gray-500)', fontWeight:700, fontSize:'0.84rem', transition:'all 0.15s', fontFamily:'var(--font-body)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── CALENDAR ── */}
        {view === 'calendar' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <button onClick={()=>setCalMonth(new Date(year,month-1,1))} className="btn btn-ghost" style={{ padding:'0.4rem 0.75rem' }}><ChevronLeft size={16}/></button>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', fontWeight:700 }}>{MONTHS[month]} {year}</h2>
              <button onClick={()=>setCalMonth(new Date(year,month+1,1))} className="btn btn-ghost" style={{ padding:'0.4rem 0.75rem' }}><ChevronRight size={16}/></button>
            </div>

            <div className="card" style={{ padding:0, overflow:'hidden', boxShadow:'var(--shadow)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
                {DAYS.map(d => <div key={d} style={{ padding:'0.6rem', textAlign:'center', fontSize:'0.7rem', fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--gray-50)' }}>{d}</div>)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                {calCells.map((day, idx) => {
                  const dayEvents = getEventsForDay(day)
                  const active = isToday(day)
                  return (
                    <div key={idx} onClick={()=>day && setSelectedDay(selectedDay===day?null:day)}
                      style={{ minHeight:90, padding:'0.5rem', borderRight:(idx+1)%7!==0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', background:active?'var(--maroon-faint)':selectedDay===day?'var(--gray-50)':'white', cursor:day?'pointer':'default', transition:'background 0.1s' }}
                      onMouseEnter={e=>{ if(day&&!active) e.currentTarget.style.background='var(--gray-50)' }}
                      onMouseLeave={e=>{ if(day&&!active&&selectedDay!==day) e.currentTarget.style.background='white' }}>
                      {day && (
                        <>
                          <div style={{ width:24, height:24, borderRadius:'50%', background:active?'var(--maroon)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:3 }}>
                            <span style={{ fontSize:'0.8rem', fontWeight:active?700:500, color:active?'white':'var(--gray-700)' }}>{day}</span>
                          </div>
                          {dayEvents.map(ev => (
                            <div key={ev.id} style={{ fontSize:'0.63rem', fontWeight:600, padding:'0.1rem 0.3rem', borderRadius:3, marginBottom:2, background:TYPE_PALETTE[ev.event_type]||'var(--maroon)', color:'white', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
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

            {/* Selected day */}
            {selectedDay && getEventsForDay(selectedDay).length > 0 && (
              <div className="card fade-in" style={{ marginTop:'1rem' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'0.75rem' }}>{MONTHS[month]} {selectedDay}</p>
                {getEventsForDay(selectedDay).map(ev => (
                  <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.7rem', background:'var(--gray-50)', borderRadius:8, marginBottom:6 }}>
                    <div style={{ width:9, height:9, borderRadius:'50%', background:TYPE_PALETTE[ev.event_type]||'var(--maroon)', flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:'0.88rem' }}>{ev.name}</p>
                      <p style={{ fontSize:'0.76rem', color:'var(--gray-500)' }}>{ev.event_type.replace('_',' ')}{ev.venue && ` · ${ev.venue}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming list */}
            <div style={{ marginTop:'1.5rem' }}>
              <p style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--gray-700)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.75rem' }}>Upcoming Events</p>
              {events.filter(e => new Date(e.date) >= new Date()).slice(0,6).length === 0 ? (
                <p style={{ color:'var(--gray-400)', fontSize:'0.84rem' }}>No upcoming events scheduled</p>
              ) : events.filter(e => new Date(e.date) >= new Date()).slice(0,6).map(ev => (
                <div key={ev.id} className="card" style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.85rem 1.25rem', marginBottom:'0.6rem', borderLeft:`3px solid ${TYPE_PALETTE[ev.event_type]||'var(--maroon)'}` }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:700, fontSize:'0.88rem' }}>{ev.name}</p>
                    <p style={{ fontSize:'0.76rem', color:'var(--gray-500)' }}>
                      {new Date(ev.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                      {ev.venue && ` · ${ev.venue}`}
                    </p>
                  </div>
                  <span style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'capitalize', color:TYPE_PALETTE[ev.event_type]||'var(--maroon)', background:`${TYPE_PALETTE[ev.event_type]||'var(--maroon)'}15`, padding:'0.18rem 0.55rem', borderRadius:99 }}>
                    {ev.event_type.replace('_',' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {view === 'attendance' && (
          <div>
            {/* STEP 1: Search */}
            {pinStep === 'search' && (
              <div className="card" style={{ maxWidth:480, margin:'0 auto', padding:'2.5rem', textAlign:'center' }}>
                <Shield size={38} color="var(--maroon)" style={{ margin:'0 auto 1rem' }}/>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', marginBottom:6 }}>View Your Attendance</h2>
                <p style={{ color:'var(--gray-500)', fontSize:'0.84rem', marginBottom:'1.5rem', lineHeight:1.6 }}>
                  Search your name, then enter your personal PIN to securely view your record.
                </p>
                <div style={{ position:'relative', marginBottom:8 }}>
                  <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--gray-300)' }}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your name..." style={{ paddingLeft:'2.2rem', fontSize:'0.9rem', textAlign:'left' }}/>
                </div>
                {search && (
                  <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', boxShadow:'var(--shadow)', marginTop:4, textAlign:'left' }}>
                    {filteredMembers.length === 0 ? (
                      <p style={{ padding:'1rem', color:'var(--gray-400)', fontSize:'0.84rem', textAlign:'center' }}>No members found</p>
                    ) : filteredMembers.map(m => (
                      <div key={m.id} onClick={()=>selectMember(m)}
                        style={{ padding:'0.75rem 1rem', cursor:'pointer', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, transition:'background 0.1s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--maroon-faint)'}
                        onMouseLeave={e=>e.currentTarget.style.background='white'}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--maroon)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'0.82rem', flexShrink:0 }}>
                          {m.full_name.charAt(0)}
                        </div>
                        <span style={{ fontWeight:600, color:'var(--gray-900)', fontSize:'0.88rem' }}>{m.full_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PIN entry */}
            {pinStep === 'pin' && selectedMember && (
              <div className="card" style={{ maxWidth:380, margin:'0 auto', padding:'2.5rem', textAlign:'center' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--maroon)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'1.2rem', margin:'0 auto 1rem' }}>
                  {selectedMember.full_name.charAt(0)}
                </div>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', marginBottom:4 }}>{selectedMember.full_name}</h2>
                <p style={{ color:'var(--gray-500)', fontSize:'0.82rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Lock size={13}/> Enter your 4-digit PIN
                </p>

                {/* PIN dots */}
                <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:'1.25rem' }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ width:14, height:14, borderRadius:'50%', background:pinInput.length>i?'var(--maroon)':'var(--gray-200)', transition:'background 0.15s' }}/>
                  ))}
                </div>

                <input
                  type="password" inputMode="numeric" maxLength={4}
                  value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/\D/g,'').slice(0,4))}
                  onKeyDown={e=>e.key==='Enter'&&verifyPin()}
                  placeholder="••••"
                  style={{ textAlign:'center', fontSize:'1.4rem', letterSpacing:'0.3em', width:'100%', marginBottom:'1rem' }}
                  autoFocus
                />

                {pinError && (
                  <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'0.6rem 0.9rem', color:'#991b1b', fontSize:'0.82rem', marginBottom:'1rem' }}>
                    {pinError}
                  </div>
                )}

                <div style={{ display:'flex', gap:'0.6rem' }}>
                  <button onClick={resetSearch} className="btn btn-ghost" style={{ flex:1 }}>← Back</button>
                  <button onClick={verifyPin} disabled={verifying||pinInput.length!==4} className="btn btn-primary" style={{ flex:1 }}>
                    {verifying ? 'Checking…' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Verified — show attendance */}
            {pinStep === 'verified' && (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem' }}>
                  <button onClick={resetSearch} className="btn btn-ghost" style={{ padding:'0.4rem 0.9rem', fontSize:'0.8rem' }}>← Back</button>
                  <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem' }}>{attendanceData?.full_name}</h2>
                  <span style={{ fontSize:'0.72rem', color:'#166534', background:'#f0fdf4', padding:'0.2rem 0.6rem', borderRadius:99, border:'1px solid #86efac', fontWeight:700 }}>✓ Verified</span>
                </div>

                {loading ? (
                  <div style={{ textAlign:'center', padding:'3rem', color:'var(--gray-500)' }}>Loading your record…</div>
                ) : attendanceData && (
                  <>
                    {/* Strike warning */}
                    {attendanceData.strikes >= 2 && (
                      <div style={{ display:'flex', gap:10, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'1rem 1.25rem', marginBottom:'1.25rem' }}>
                        <AlertTriangle size={18} color="#991b1b" style={{ flexShrink:0, marginTop:1 }}/>
                        <div>
                          <p style={{ fontWeight:700, color:'#991b1b', fontSize:'0.9rem' }}>
                            {attendanceData.strikes >= 3 ? 'Retreat Ineligible — 3+ Strikes' : '⚠️ Warning — 2 Strikes'}
                          </p>
                          <p style={{ fontSize:'0.82rem', color:'#991b1b', marginTop:2 }}>
                            {attendanceData.strikes >= 3
                              ? 'You have 3+ strikes and are ineligible for the retreat. Please meet with VP of Standards.'
                              : 'One more strike makes you ineligible for the retreat. Contact your VP of Standards.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem', marginBottom:'1.25rem' }}>
                      {[
                        { label:'Present', value:attendanceData.present, color:'#166534', bg:'#f0fdf4' },
                        { label:'Tardy', value:attendanceData.tardy, color:'#92660a', bg:'#fffbeb' },
                        { label:'Unexcused', value:attendanceData.unexcused, color:'#991b1b', bg:'#fef2f2' },
                        { label:'Strikes', value:attendanceData.strikes, color:attendanceData.strikes>=3?'#991b1b':attendanceData.strikes>=2?'#92660a':'#166534', bg:attendanceData.strikes>=3?'#fef2f2':attendanceData.strikes>=2?'#fffbeb':'#f0fdf4' },
                      ].map(s => (
                        <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'1rem', textAlign:'center' }}>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.6rem', color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:'0.7rem', color:s.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:3 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Eligibility */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0.85rem 1.25rem', borderRadius:10, marginBottom:'1.25rem', background:attendanceData.retreat_ineligible?'#fef2f2':'#f0fdf4', border:`1px solid ${attendanceData.retreat_ineligible?'#fca5a5':'#86efac'}` }}>
                      {attendanceData.retreat_ineligible ? <XCircle size={17} color="#991b1b"/> : <CheckCircle2 size={17} color="#166534"/>}
                      <span style={{ fontWeight:700, color:attendanceData.retreat_ineligible?'#991b1b':'#166534', fontSize:'0.88rem' }}>
                        {attendanceData.retreat_ineligible ? 'Currently ineligible for retreat' : 'Eligible for retreat ✓'}
                      </span>
                    </div>

                    {/* History */}
                    <div className="card" style={{ padding:0, overflow:'hidden' }}>
                      <div style={{ padding:'0.75rem 1.25rem', background:'var(--maroon)' }}>
                        <p style={{ fontWeight:700, fontSize:'0.84rem', color:'white' }}>Attendance History</p>
                      </div>
                      {attendanceData.history.length === 0 ? (
                        <p style={{ padding:'2rem', color:'var(--gray-400)', textAlign:'center', fontSize:'0.84rem' }}>No attendance recorded yet</p>
                      ) : attendanceData.history.map(({ event, status }) => {
                        const st = STATUS_STYLE[status]
                        return (
                          <div key={event.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem 1.25rem', borderBottom:'1px solid var(--border)' }}>
                            <div style={{ flex:1 }}>
                              <p style={{ fontWeight:600, fontSize:'0.87rem', color:'var(--gray-900)' }}>{event.name}</p>
                              <p style={{ fontSize:'0.74rem', color:'var(--gray-400)' }}>
                                {new Date(event.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}
                              </p>
                            </div>
                            <span style={{ fontSize:'0.71rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:99, background:st.bg, color:st.color }}>
                              {st.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}