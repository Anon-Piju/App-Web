import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Star, Edit2, X, Check, Clock, Dumbbell, ChevronDown } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, subDays, eachDayOfInterval, startOfMonth, endOfMonth, getMonth, getYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

// ── Fixed splits (rest only) ────────────────────────────────
const REST_SPLIT = { id: 'rest', label: 'Rest', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' }

const PUSH_PULL = ['Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'Otro']
const MUSCLE_GROUPS_MAP = {
  Push:      ['Pecho', 'Tríceps', 'Hombro', 'Push general'],
  Pull:      ['Espalda', 'Bíceps', 'Antebrazo', 'Pull general'],
  Legs:      ['Cuádriceps', 'Femoral', 'Glúteo', 'Pantorrilla', 'Pierna completa'],
  'Full Body': ['Cuerpo completo'],
  Cardio:    ['Carrera', 'Ciclismo', 'Cardio general'],
  Otro:      ['Core', 'Cuello', 'Otro'],
}

// ── Heatmap uses custom block colors ────────────────────────
function CalendarHeatmap({ workouts, customBlocks }) {
  const todayMon = startOfWeek(new Date(), { weekStartsOn: 1 })
  const startMon = addDays(todayMon, -11 * 7)
  const allDays  = eachDayOfInterval({ start: startMon, end: addDays(todayMon, 6) })
  const weeks = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))
  const DAY_LABELS = ['L','M','X','J','V','S','D']

  function getCellColor(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const w = workouts.find(x => x.date === dateStr)
    if (!w) return 'rgba(255,255,255,0.05)'
    if (w.split_id === 'rest') return 'rgba(255,255,255,0.12)'
    // custom block color
    if (w.custom_block_id) {
      const cb = customBlocks.find(b => b.id === w.custom_block_id)
      if (cb?.color) return cb.color + 'cc'
    }
    return 'rgba(124,106,247,0.7)'
  }

  function getTitle(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const w = workouts.find(x => x.date === dateStr)
    if (!w) return format(day, 'd MMM', { locale: es })
    if (w.custom_block_id) {
      const cb = customBlocks.find(b => b.id === w.custom_block_id)
      return `${format(day, 'd MMM', { locale: es })} — ${cb?.name || 'Bloque'}`
    }
    return `${format(day, 'd MMM', { locale: es })}${w.split_id ? ' — ' + w.split_id : ''}`
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 10px)', gap: '2px' }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: 500 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 10px)', gap: '2px' }}>
            {week.map(day => (
              <div key={day.toISOString()} title={getTitle(day)}
                style={{
                  width: '10px', height: '10px',
                  background: getCellColor(day),
                  borderRadius: '2px',
                  outline: isSameDay(day, new Date()) ? '1px solid rgba(255,255,255,0.6)' : 'none',
                  outlineOffset: '1px',
                }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Monthly calendar — 2 rows × 6 cols, small cells ─────────
function MonthlyCalendar({ workouts, customBlocks }) {
  const DAY_LABELS = ['L','M','X','J','V','S','D']
  const today = new Date()
  // Last 12 months, displayed as 2×6 grid
  const months = Array.from({ length: 12 }, (_, i) => {
    return new Date(today.getFullYear(), today.getMonth() - (11 - i), 1)
  })

  function getCellColor(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const w = workouts.find(x => x.date === dateStr)
    if (!w) return null
    if (w.split_id === 'rest') return 'rgba(255,255,255,0.15)'
    if (w.custom_block_id) {
      const cb = customBlocks.find(b => b.id === w.custom_block_id)
      if (cb?.color) return cb.color + 'cc'
    }
    return 'rgba(124,106,247,0.8)'
  }

  function getBlockName(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const w = workouts.find(x => x.date === dateStr)
    if (!w) return ''
    if (w.custom_block_id) {
      const cb = customBlocks.find(b => b.id === w.custom_block_id)
      return cb?.name || ''
    }
    return w.split_id || ''
  }

  function MonthMini({ monthStart }) {
    const days = eachDayOfInterval({ start: startOfMonth(monthStart), end: endOfMonth(monthStart) })
    const firstDow = (startOfMonth(monthStart).getDay() + 6) % 7
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '3px', textTransform: 'capitalize', letterSpacing: '0.02em' }}>
          {format(monthStart, 'MMM', { locale: es })} {format(monthStart, 'yy')}
        </p>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ fontSize: '6px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {days.map(day => {
            const color = getCellColor(day)
            const isToday = isSameDay(day, new Date())
            const name = getBlockName(day)
            return (
              <div key={day.toISOString()}
                title={name ? `${format(day, 'd')} — ${name}` : format(day, 'd')}
                style={{
                  aspectRatio: '1',
                  borderRadius: '2px',
                  background: color || 'rgba(255,255,255,0.04)',
                  outline: isToday ? '1px solid rgba(255,255,255,0.6)' : 'none',
                  outlineOffset: '0px',
                }} />
            )
          })}
        </div>
      </div>
    )
  }

  // Split into 2 rows of 6
  const row1 = months.slice(0, 6)
  const row2 = months.slice(6, 12)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        {row1.map(m => <MonthMini key={m.toISOString()} monthStart={m} />)}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {row2.map(m => <MonthMini key={m.toISOString()} monthStart={m} />)}
      </div>
    </div>
  )
}

// ── Stats bar ────────────────────────────────────────────────
function StatsBar({ workouts }) {
  const trained = workouts.filter(w => w.split_id !== 'rest' || w.custom_block_id)

  let streak = 0
  for (let i = 0; i < 90; i++) {
    const day = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const workout = workouts.find(w => w.date === day)
    if (!workout) { if (i > 0) break }
    else if (workout.split_id !== 'rest') streak++
  }

  const withDur = trained.filter(w => w.duration_min)
  const avgDur = withDur.length > 0
    ? Math.round(withDur.reduce((a, w) => a + w.duration_min, 0) / withDur.length)
    : 0
  const thisWeek = trained.filter(w => new Date(w.date) >= subDays(new Date(), 7)).length

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'Racha',         value: streak > 0 ? `${streak}🔥` : '0', sub: 'días seguidos' },
        { label: 'Esta semana',   value: thisWeek,                           sub: 'entrenos' },
        { label: 'Total',         value: trained.length,                     sub: 'sesiones' },
        { label: 'Duración media',value: avgDur > 0 ? `${avgDur}′` : '—',   sub: 'por sesión' },
      ].map(({ label, value, sub }) => (
        <div key={label} className="card-sm text-center">
          <p className="text-xl font-semibold text-white">{value}</p>
          <p className="text-zinc-500 text-xs mt-0.5">{sub}</p>
          <p className="text-zinc-700 text-[10px]">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Weekly Planner ────────────────────────────────────────────
function WeeklyPlanner({ workouts, customBlocks, onRefresh }) {
  const [weekStart, setWeekStart]   = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [editing, setEditing]       = useState(false)
  const [draggingBlock, setDragging] = useState(null)
  const [expandedDay, setExpanded]  = useState(null)
  const [showLog, setShowLog]       = useState(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function getWorkout(day) {
    return workouts.find(w => w.date === format(day, 'yyyy-MM-dd'))
  }

  function getBlockForWorkout(w) {
    if (!w) return null
    if (w.custom_block_id) return customBlocks.find(b => b.id === w.custom_block_id)
    return null
  }

  async function assignBlock(day, blockId) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const existing = workouts.find(w => w.date === dateStr)
    const payload = blockId === 'rest'
      ? { date: dateStr, split_id: 'rest', custom_block_id: null, performance_rating: 3 }
      : { date: dateStr, split_id: null, custom_block_id: blockId, performance_rating: 3 }

    if (existing) {
      await supabase.from('workouts').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('workouts').insert([payload])
    }
    onRefresh()
  }

  async function clearDay(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const w = workouts.find(w => w.date === dateStr)
    if (w) { await supabase.from('workouts').delete().eq('id', w.id); onRefresh() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(w => subWeeks(w, 1))} className="btn-ghost px-2"><ChevronLeft size={16} /></button>
        <p className="text-sm font-medium text-white">
          {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
        </p>
        <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="btn-ghost px-2"><ChevronRight size={16} /></button>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setEditing(v => !v)}
          className={`btn text-xs py-1 gap-1 ${editing ? 'btn-primary' : 'btn-ghost'}`}>
          <Edit2 size={12} /> {editing ? 'Listo' : 'Editar semana'}
        </button>
      </div>

      {/* Drag palette — custom blocks + rest */}
      {editing && (
        <div className="card-sm space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Arrastra un bloque al día:</p>
          <div className="flex flex-wrap gap-1.5">
            <div draggable onDragStart={() => setDragging('rest')}
              className="badge cursor-grab active:cursor-grabbing text-xs font-medium px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
              Rest
            </div>
            {customBlocks.map(b => (
              <div key={b.id} draggable onDragStart={() => setDragging(b.id)}
                className="badge cursor-grab active:cursor-grabbing text-xs font-medium px-3 py-1"
                style={{ background: (b.color || '#7c6af7') + '25', color: b.color || '#7c6af7', border: `1px solid ${b.color || '#7c6af7'}60` }}>
                {b.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day grid */}
      <div className="overflow-x-auto pb-1">
        <div className="grid grid-cols-7 gap-1.5" style={{ minWidth: '480px' }}>
          {days.map(day => {
            const w = getWorkout(day)
            const cb = getBlockForWorkout(w)
            const isToday = isSameDay(day, new Date())
            const isExpanded = expandedDay === day.toISOString()
            const isRest = w?.split_id === 'rest'
            const color = cb?.color || (isRest ? 'rgba(255,255,255,0.4)' : null)

            return (
              <div key={day.toISOString()}
                onDragOver={editing ? e => e.preventDefault() : undefined}
                onDrop={editing ? e => { e.preventDefault(); if (draggingBlock) assignBlock(day, draggingBlock) } : undefined}
                className="space-y-1">

                {/* Day header */}
                <div className={`week-day-header ${isToday ? 'today' : ''}`}>
                  <div className="text-zinc-400 uppercase tracking-wider" style={{ fontSize: '10px' }}>
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className="font-bold text-white text-sm">{format(day, 'd')}</div>
                </div>

                {/* Block cell */}
                <div onClick={() => !editing && setExpanded(isExpanded ? null : day.toISOString())}
                  style={w ? {
                    background: color ? color + '20' : 'rgba(124,106,247,0.12)',
                    border: `1px solid ${color ? color + '50' : 'rgba(124,106,247,0.35)'}`,
                  } : {
                    background: 'rgba(255,255,255,0.02)',
                    border: editing ? '1px dashed rgba(124,106,247,0.3)' : '1px dashed rgba(255,255,255,0.08)',
                  }}
                  className={`rounded-xl p-2 min-h-[60px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-xs ${isExpanded ? 'ring-1 ring-accent/60' : 'hover:opacity-90'}`}>
                  {w ? (
                    <>
                      <span className="font-bold text-xs text-white text-center truncate w-full text-center"
                        style={{ color: color || 'var(--accent-bright)' }}>
                        {cb?.name || (isRest ? 'Rest' : 'Entreno')}
                      </span>
                      {w.performance_rating && (
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} size={8} className={n <= w.performance_rating ? 'fill-amber text-amber' : 'text-zinc-700'} />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-zinc-700 text-[10px]">{editing ? 'Suelta aquí' : '—'}</span>
                  )}
                </div>

                {editing && w && (
                  <button onClick={() => clearDay(day)}
                    className="btn-danger text-[10px] py-0.5 w-full justify-center">
                    <Trash2 size={10} /> Quitar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Session detail panel below grid */}
      {expandedDay && (() => {
        const selDay = days.find(d => d.toISOString() === expandedDay)
        if (!selDay) return null
        const w = getWorkout(selDay)
        if (!w || w.split_id === 'rest') return null
        const cb = getBlockForWorkout(w)
        const color = cb?.color || 'var(--accent)'
        const sets = w?.workout_sets || []

        return (
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: (cb?.color || '#7c6af7') + '12', border: `1px solid ${cb?.color || '#7c6af7'}40` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm" style={{ color }}>{cb?.name || 'Entreno'}</span>
                <span className="text-zinc-500 text-xs">{format(selDay, "d 'de' MMMM", { locale: es })}</span>
                {w?.duration_min && <span className="text-zinc-600 text-xs">{w.duration_min}min</span>}
              </div>
              <div className="flex items-center gap-2">
                {w?.performance_rating && (
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={12} className={n <= w.performance_rating ? 'fill-amber text-amber' : 'text-zinc-700'} />
                    ))}
                  </div>
                )}
                <button onClick={() => setExpanded(null)} className="text-zinc-600 hover:text-white"><X size={14} /></button>
              </div>
            </div>

            {sets.length > 0 ? (
              <div className="space-y-1.5">
                {sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-white font-medium flex-1 truncate">{s.exercise_id}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {s.sets || 3}×{s.reps || '—'}{s.weight ? ` · ${s.weight}kg` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">Sin ejercicios registrados aún</p>
            )}
            {w?.notes && <p className="text-xs text-zinc-500 italic">"{w.notes}"</p>}
            <button onClick={() => { setShowLog(format(selDay, 'yyyy-MM-dd')); setExpanded(null) }}
              className="btn-ghost text-xs py-1.5 w-full justify-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <Plus size={12} /> {sets.length > 0 ? 'Editar sesión' : 'Registrar sesión'}
            </button>
          </div>
        )
      })()}

      {showLog && (
        <LogSession date={showLog} workouts={workouts} customBlocks={customBlocks}
          onClose={() => setShowLog(null)} onRefresh={onRefresh} />
      )}
    </div>
  )
}

// ── Log Session ───────────────────────────────────────────────
function LogSession({ date, workouts, customBlocks, onClose, onRefresh }) {
  const existing = workouts.find(w => w.date === date)
  const cb = existing?.custom_block_id ? customBlocks.find(b => b.id === existing.custom_block_id) : null

  // Build exercise list from custom block or allow free input
  const blockExercises = cb?.exercises || []

  const [rows, setRows]   = useState(existing?.workout_sets?.map(s => ({ ...s, id: s.id || Date.now() })) || [])
  const [perf, setPerf]   = useState(existing?.performance_rating || 3)
  const [dur, setDur]     = useState(existing?.duration_min || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [exRow, setExRow] = useState({ name: '', sets: '3', reps: '', weight: '' })

  async function save() {
    if (!existing) return
    await supabase.from('workouts').update({
      performance_rating: perf,
      duration_min: parseFloat(dur) || null,
      notes,
    }).eq('id', existing.id)
    await supabase.from('workout_sets').delete().eq('workout_id', existing.id)
    if (rows.length > 0) {
      await supabase.from('workout_sets').insert(
        rows.map(r => ({
          workout_id: existing.id,
          exercise_id: r.exercise_id || r.name || 'ejercicio',
          sets: parseInt(r.sets) || 3,
          reps: parseInt(r.reps) || null,
          weight: parseFloat(r.weight) || null,
        }))
      )
    }
    onRefresh(); onClose()
  }

  function addFromBlock(ex) {
    setRows(prev => [...prev, {
      id: Date.now(), exercise_id: ex.name, name: ex.name,
      sets: String(ex.default_sets || 3), reps: String(ex.default_reps || 8), weight: String(ex.default_kg || '')
    }])
  }

  function addFree() {
    if (!exRow.name.trim()) return
    setRows(prev => [...prev, { id: Date.now(), exercise_id: exRow.name, name: exRow.name, ...exRow }])
    setExRow({ name: '', sets: '3', reps: '', weight: '' })
  }

  const color = cb?.color || 'var(--accent)'

  return (
    <div className="card space-y-4" style={{ borderColor: (cb?.color || '#7c6af7') + '50' }}>
      <div className="flex items-center justify-between">
        <p className="font-medium text-white">
          {cb ? <span style={{ color }}>{cb.name}</span> : 'Sesión'} —
          <span className="text-zinc-400 ml-1 text-sm">{format(new Date(date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}</span>
        </p>
        <button onClick={onClose}><X size={15} className="text-zinc-500" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Rendimiento</label>
          <div className="flex gap-1 mt-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setPerf(n)}>
                <Star size={20} className={n <= perf ? 'fill-amber text-amber' : 'text-zinc-700'} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Duración (min)</label>
          <input className="input" type="number" placeholder="60" value={dur} onChange={e => setDur(e.target.value)} />
        </div>
      </div>

      {/* Quick add from block exercises */}
      {blockExercises.length > 0 && (
        <div>
          <label className="label">Ejercicios del bloque (clic para añadir)</label>
          <div className="flex flex-wrap gap-1.5">
            {blockExercises.map((ex, i) => (
              <button key={i} onClick={() => addFromBlock(ex)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ background: (cb?.color || '#7c6af7') + '20', color: cb?.color || 'var(--accent-bright)', border: `1px solid ${cb?.color || '#7c6af7'}40` }}>
                {ex.name} <span className="opacity-60">{ex.default_sets}×{ex.default_reps}{ex.default_kg ? ` ${ex.default_kg}kg` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Registered rows */}
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="flex-1 text-white truncate">{r.name || r.exercise_id}</span>
            <input className="input w-10 text-center px-1 py-1 text-xs" type="number" value={r.sets}
              onChange={e => setRows(prev => prev.map((x,idx) => idx===i ? {...x,sets:e.target.value} : x))} />
            <span className="text-zinc-600 text-xs">×</span>
            <input className="input w-10 text-center px-1 py-1 text-xs" type="number" value={r.reps}
              onChange={e => setRows(prev => prev.map((x,idx) => idx===i ? {...x,reps:e.target.value} : x))} />
            <input className="input w-14 text-center px-1 py-1 text-xs" type="number" placeholder="kg" value={r.weight}
              onChange={e => setRows(prev => prev.map((x,idx) => idx===i ? {...x,weight:e.target.value} : x))} />
            <button onClick={() => setRows(prev => prev.filter((_,idx) => idx !== i))}
              className="text-zinc-600 hover:text-rose"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>

      {/* Free-form add */}
      <div className="grid grid-cols-12 gap-2">
        <input className="input col-span-5" placeholder="Ejercicio libre" value={exRow.name}
          onChange={e => setExRow(r => ({ ...r, name: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addFree()} />
        <input className="input col-span-2 text-center px-1" type="number" placeholder="S" value={exRow.sets}
          onChange={e => setExRow(r => ({ ...r, sets: e.target.value }))} />
        <input className="input col-span-2 text-center px-1" type="number" placeholder="R" value={exRow.reps}
          onChange={e => setExRow(r => ({ ...r, reps: e.target.value }))} />
        <input className="input col-span-2 text-center px-1" type="number" placeholder="kg" value={exRow.weight}
          onChange={e => setExRow(r => ({ ...r, weight: e.target.value }))} />
        <button onClick={addFree} className="col-span-1 btn-ghost px-2 justify-center"><Plus size={14} /></button>
      </div>

      <div>
        <label className="label">Notas</label>
        <textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="btn-primary"><Check size={15} /> Guardar sesión</button>
        <button onClick={onClose} className="btn-ghost">Cancelar</button>
      </div>
    </div>
  )
}



// ── Custom Blocks ─────────────────────────────────────────────
const MUSCLE_GROUPS_LIST = ['Pecho','Tríceps','Hombro','Espalda','Bíceps','Antebrazo','Cuádriceps','Femoral','Glúteo','Pantorrilla','Core','Cuello','Cardio','Otro']

function CustomBlocks() {
  const [blocks, setBlocks]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [form, setForm]         = useState({ name: '', color: '#7c6af7', push_pull: 'Push', exercises: [] })
  const [exForm, setExForm]     = useState({ name: '', muscle_group: 'Pecho', default_sets: 3, default_reps: 8, default_kg: '' })

  useEffect(() => { loadBlocks() }, [])

  async function loadBlocks() {
    setLoading(true)
    const { data } = await supabase.from('custom_blocks').select('*').order('created_at')
    setBlocks(data || [])
    setLoading(false)
  }

  function addEx() {
    if (!exForm.name.trim()) return
    setForm(f => ({ ...f, exercises: [...f.exercises, { ...exForm, id: Date.now() }] }))
    setExForm({ name: '', muscle_group: form.muscle_group, default_sets: 3, default_reps: 8, default_kg: '' })
  }

  async function saveBlock() {
    if (!form.name.trim() || form.exercises.length === 0) return
    const payload = { name: form.name.trim(), color: form.color, push_pull: form.push_pull, exercises: form.exercises }
    if (editId) {
      const { data } = await supabase.from('custom_blocks').update(payload).eq('id', editId).select().single()
      if (data) setBlocks(prev => prev.map(b => b.id === editId ? data : b))
      setEditId(null)
    } else {
      const { data } = await supabase.from('custom_blocks').insert([payload]).select().single()
      if (data) setBlocks(prev => [...prev, data])
    }
    setForm({ name: '', color: '#7c6af7', push_pull: 'Push', exercises: [] })
    setShowForm(false)
  }

  async function deleteBlock(id) {
    await supabase.from('custom_blocks').delete().eq('id', id)
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  function startEdit(b) {
    setEditId(b.id)
    setForm({ name: b.name, color: b.color || '#7c6af7', push_pull: b.push_pull || 'Push', exercises: b.exercises || [] })
    setShowForm(true)
  }


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="muted text-xs">Define tus bloques de entrenamiento reutilizables</p>
        <button onClick={() => { setEditId(null); setForm({ name: '', color: '#7c6af7', push_pull: 'Push', muscle_group: 'Pecho', exercises: [] }); setShowForm(v => !v) }}
          className="btn-primary text-sm py-1.5">
          <Plus size={14} /> Nuevo bloque
        </button>
      </div>

      {showForm && (
        <div className="card space-y-4" style={{ borderColor: (form.color || '#7c6af7') + '50' }}>
          <h3 className="font-semibold text-white">{editId ? 'Editar bloque' : 'Nuevo bloque'}</h3>

          {/* Row 1: name + color */}
          <div className="grid grid-cols-4 gap-2 items-center">
            <input className="input col-span-3" placeholder="Nombre del bloque (ej: Pecho & Tríceps)" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input type="color" value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="w-full h-10 rounded-lg cursor-pointer border-0"
              style={{ padding: '2px', background: 'rgba(255,255,255,0.05)' }} />
          </div>

          {/* Row 2: Push/Pull type */}
          <div>
            <label className="label">Tipo</label>
            <select className="select" value={form.push_pull}
              onChange={e => setForm(f => ({ ...f, push_pull: e.target.value }))}>
              {PUSH_PULL.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* Exercises */}
          <div className="space-y-2">
            <label className="label">Ejercicios</label>
            {form.exercises.map((ex, i) => (
              <div key={ex.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: form.color }} />
                <span className="flex-1 text-white">{ex.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ex.muscle_group}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {ex.default_sets}×{ex.default_reps}{ex.default_kg ? ` · ${ex.default_kg}kg` : ''}
                </span>
                <button onClick={() => setForm(f => ({ ...f, exercises: f.exercises.filter((_, idx) => idx !== i) }))}
                  className="text-zinc-600 hover:text-rose"><Trash2 size={12} /></button>
              </div>
            ))}

            {/* Add exercise row */}
            <div className="grid grid-cols-12 gap-1.5">
              <input className="input col-span-4 text-sm" placeholder="Nombre ejercicio" value={exForm.name}
                onChange={e => setExForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addEx()} />
              <select className="select col-span-3 text-sm" value={exForm.muscle_group}
                onChange={e => setExForm(f => ({ ...f, muscle_group: e.target.value }))}>
                {MUSCLE_GROUPS_LIST.map(g => <option key={g}>{g}</option>)}
              </select>
              <input className="input col-span-1 text-center px-1 text-sm" type="number" placeholder="S"
                value={exForm.default_sets} onChange={e => setExForm(f => ({ ...f, default_sets: parseInt(e.target.value) || 3 }))} />
              <input className="input col-span-1 text-center px-1 text-sm" type="number" placeholder="R"
                value={exForm.default_reps} onChange={e => setExForm(f => ({ ...f, default_reps: parseInt(e.target.value) || 8 }))} />
              <input className="input col-span-2 text-center px-1 text-sm" type="number" placeholder="kg"
                value={exForm.default_kg} onChange={e => setExForm(f => ({ ...f, default_kg: e.target.value }))} />
              <button onClick={addEx} className="col-span-1 btn-ghost px-2 justify-center"><Plus size={14} /></button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>S = series · R = reps · kg = peso por defecto</p>
          </div>

          <div className="flex gap-2">
            <button onClick={saveBlock} className="btn-primary"><Check size={15} /> {editId ? 'Guardar cambios' : 'Crear bloque'}</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <p className="muted text-center py-8">Cargando...</p> :
       blocks.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">🏋️</p>
          <p className="muted">Aún no tienes bloques personalizados.</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Crea bloques para organizar tu semana en Planificación</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map(b => (
            <div key={b.id} className="card group">
              <div className="flex items-center gap-3">
                <div className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0 self-stretch" style={{ background: b.color || 'var(--accent)', minWidth: '4px', maxWidth: '4px' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">{b.name}</p>
                    {b.push_pull && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: (b.color||'#7c6af7')+'20', color: b.color||'var(--accent)' }}>{b.push_pull}</span>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {(b.exercises || []).length} ejercicios
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => startEdit(b)} className="btn-ghost py-1 px-2 text-xs"><Edit2 size={13} /></button>
                  <button onClick={() => deleteBlock(b.id)} className="btn-danger py-1 px-2 text-xs"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="mt-3 space-y-1 pl-4">
                {(b.exercises || []).map((ex, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: b.color || 'var(--accent)' }} />
                    <span className="flex-1 text-white">{ex.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ex.muscle_group}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {ex.default_sets}×{ex.default_reps}{ex.default_kg ? ` · ${ex.default_kg}kg` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Training() {
  const [tab, setTab]               = useState('plan')
  const [workouts, setWorkouts]     = useState([])
  const [customBlocks, setCustomBlocks] = useState([])

  useEffect(() => { loadWorkouts(); loadCustomBlocks() }, [])

  async function loadWorkouts() {
    const { data } = await supabase.from('workouts').select('*, workout_sets(*)').order('date', { ascending: false })
    setWorkouts(data || [])
  }

  async function loadCustomBlocks() {
    const { data } = await supabase.from('custom_blocks').select('*').order('created_at')
    setCustomBlocks(data || [])
  }

  return (
    <div className="space-y-5">
      <h1 className="section-title">Entrenamiento</h1>

      <div className="flex gap-1.5 flex-wrap">
        {[
          { v: 'plan',    l: 'Planificación' },
          { v: 'stats',   l: 'Estadísticas'  },
          { v: 'blocks',  l: 'Mis bloques'   },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setTab(v)}
            className={`btn text-sm py-1.5 ${tab === v ? 'bg-surface-400 text-white' : 'btn-ghost'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <WeeklyPlanner workouts={workouts} customBlocks={customBlocks} onRefresh={() => { loadWorkouts(); loadCustomBlocks() }} />
      )}

      {tab === 'stats' && (
        <div className="space-y-5">
          <StatsBar workouts={workouts} />
          {/* Monthly view with legend */}
          <div className="card space-y-4">
            <h3 className="text-sm font-medium text-zinc-300">Vista mensual</h3>
            <MonthlyCalendar workouts={workouts} customBlocks={customBlocks} />
            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-1">
              {customBlocks.map(b => (
                <span key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 1, background: b.color || '#7c6af7', display: 'inline-block' }} />
                  {b.name}
                </span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 1, background: 'rgba(255,255,255,0.15)', display: 'inline-block' }} />
                Rest
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'blocks'  && <CustomBlocks />}
    </div>
  )
}
