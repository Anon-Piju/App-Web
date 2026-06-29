import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, Target, Edit2, X, Check, TrendingUp } from 'lucide-react'
import { format, eachDayOfInterval, subDays, startOfWeek, endOfWeek, isSameWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

const HABIT_ICONS = ['📚','🏃','💧','🧘','✍️','🎯','🌙','🍎','💪','🎵','🧠','🌅','🛌','🚴','🏋️','🥗','🧹','💊']

const FREQ_OPTIONS = [
  { value: 'daily',   label: 'Todos los días',        sub: 'Se completa cada día' },
  { value: 'weekly',  label: 'Una vez por semana',     sub: 'Se completa una vez a la semana' },
  { value: 'xweek',   label: 'X veces por semana',     sub: 'Elige cuántas veces a la semana' },
]

// ── Helpers ───────────────────────────────────────────────────
function getWeekDays(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end: endOfWeek(date, { weekStartsOn: 1 }) })
    .map(d => format(d, 'yyyy-MM-dd'))
}

function freqLabel(habit) {
  if (habit.frequency === 'daily')  return 'Diario'
  if (habit.frequency === 'weekly') return 'Semanal'
  if (habit.frequency === 'xweek')  return `${habit.freq_days_per_week}×/semana`
  return 'Diario'
}

function freqColor(habit) {
  if (habit.frequency === 'daily')  return 'var(--jade)'
  if (habit.frequency === 'weekly') return 'var(--sky)'
  if (habit.frequency === 'xweek')  return 'var(--amber)'
  return 'var(--jade)'
}

// ── Progress ring ─────────────────────────────────────────────
function ProgressRing({ pct, size = 44, color = 'var(--jade)', done }) {
  const r   = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - Math.min(pct, 1) * circ
  return (
    <svg width={size} height={size} className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      {done && (
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: size * 0.35, transform: `rotate(90deg) translate(0, -${size}px)`,
            transformOrigin: `${size/2}px ${size/2}px`, fill: color }}>
          ✓
        </text>
      )}
    </svg>
  )
}

// ── Habit form ────────────────────────────────────────────────
function HabitForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', icon: '📚', frequency: 'daily',
    freq_days_per_week: 3,
    target_value: '', target_unit: '', goal_notes: '',
  })

  function f(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function submit() {
    if (!form.name.trim()) return
    await onSave({
      name:               form.name.trim(),
      icon:               form.icon,
      frequency:          form.frequency,
      freq_days_per_week: form.frequency === 'xweek' ? parseInt(form.freq_days_per_week) || 3 : null,
      target_value:       parseFloat(form.target_value) || null,
      target_unit:        form.target_unit.trim() || null,
      goal_notes:         form.goal_notes.trim() || null,
    })
  }

  return (
    <div className="card space-y-4" style={{ borderColor: 'rgba(var(--accent), 0.2)' }}>
      <h2 className="font-semibold text-white">{initial ? 'Editar hábito' : 'Nuevo hábito'}</h2>

      {/* Icon picker */}
      <div className="flex flex-wrap gap-1.5">
        {HABIT_ICONS.map(ico => (
          <button key={ico} onClick={() => f('icon', ico)}
            className="w-9 h-9 rounded-xl text-lg transition-all"
            style={{
              background: form.icon === ico ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'rgba(255,255,255,0.04)',
              border: form.icon === ico ? '1px solid color-mix(in srgb, var(--accent) 50%, transparent)' : '1px solid rgba(255,255,255,0.06)',
            }}>
            {ico}
          </button>
        ))}
      </div>

      <input className="input" placeholder="Nombre del hábito" value={form.name}
        onChange={e => f('name', e.target.value)} />

      {/* Frequency selector */}
      <div>
        <label className="label">Frecuencia objetivo</label>
        <div className="space-y-2">
          {FREQ_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => f('frequency', opt.value)}
              className="w-full text-left px-3 py-2.5 rounded-xl border transition-all"
              style={{
                background: form.frequency === opt.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'rgba(255,255,255,0.02)',
                borderColor: form.frequency === opt.value ? 'color-mix(in srgb, var(--accent) 50%, transparent)' : 'rgba(255,255,255,0.08)',
              }}>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: form.frequency === opt.value ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                    background:  form.frequency === opt.value ? 'var(--accent)' : 'transparent',
                  }}>
                  {form.frequency === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{opt.sub}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* X times per week picker */}
      {form.frequency === 'xweek' && (
        <div>
          <label className="label">¿Cuántas veces por semana?</label>
          <div className="flex gap-2">
            {[1,2,3,4,5,6,7].map(n => (
              <button key={n} onClick={() => f('freq_days_per_week', n)}
                className="w-9 h-9 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
                style={{
                  background: form.freq_days_per_week === n ? 'var(--amber)' : 'rgba(255,255,255,0.05)',
                  color: form.freq_days_per_week === n ? '#000' : 'rgba(255,255,255,0.5)',
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional target */}
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Objetivo (ej: 30)" type="number" value={form.target_value}
          onChange={e => f('target_value', e.target.value)} />
        <input className="input" placeholder="Unidad (ej: min, páginas)" value={form.target_unit}
          onChange={e => f('target_unit', e.target.value)} />
      </div>

      <input className="input" placeholder="Notas / motivación (opcional)" value={form.goal_notes}
        onChange={e => f('goal_notes', e.target.value)} />

      <div className="flex gap-2">
        <button onClick={submit} className="btn-primary"><Check size={15} /> Guardar</button>
        <button onClick={onCancel} className="btn-ghost">Cancelar</button>
      </div>
    </div>
  )
}

// ── Single habit card ─────────────────────────────────────────
function HabitCard({ habit, logs, today, onToggle, onDelete, onEdit }) {
  const last14 = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() })
    .map(d => format(d, 'yyyy-MM-dd'))

  const thisWeekDays = getWeekDays(new Date())

  function isDone(date) {
    return logs.some(l => l.habit_id === habit.id && l.date === date)
  }

  // ── Progress calculation per frequency type ──
  let progress = 0
  let progressLabel = ''
  let isDoneToday = isDone(today)

  if (habit.frequency === 'daily') {
    progress = isDoneToday ? 1 : 0
    progressLabel = isDoneToday ? '¡Hecho!' : 'Pendiente hoy'
  } else if (habit.frequency === 'weekly') {
    const doneThisWeek = thisWeekDays.filter(d => isDone(d)).length
    progress = doneThisWeek > 0 ? 1 : 0
    progressLabel = doneThisWeek > 0 ? '¡Semana completada!' : 'Sin hacer esta semana'
  } else if (habit.frequency === 'xweek') {
    const target = habit.freq_days_per_week || 3
    const doneThisWeek = thisWeekDays.filter(d => isDone(d)).length
    progress = Math.min(doneThisWeek / target, 1)
    progressLabel = `${doneThisWeek}/${target} días esta semana`
    isDoneToday = doneThisWeek >= target
  }

  // Streak (consecutive days meeting their goal)
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const day = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (isDone(day)) streak++
    else if (i > 0) break
  }

  const color = freqColor(habit)
  const isCompleted = progress >= 1

  return (
    <div className="card group transition-all"
      style={{ borderColor: isCompleted ? 'color-mix(in srgb, var(--jade) 25%, transparent)' : 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3">
        {/* Progress ring with check button */}
        <button onClick={() => onToggle(habit.id)} className="flex-shrink-0 relative">
          <ProgressRing pct={progress} color={color} done={isCompleted} />
          {!isCompleted && (
            <span className="absolute inset-0 flex items-center justify-center text-base">
              {habit.icon}
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${isCompleted ? 'text-jade' : 'text-white'}`}>
              {habit.name}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
              {freqLabel(habit)}
            </span>
          </div>

          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {progressLabel}
            {habit.target_value && ` · Meta: ${habit.target_value}${habit.target_unit ? ' '+habit.target_unit : ''}`}
          </p>
        </div>

        {/* Streak */}
        {streak > 1 && (
          <div className="text-center flex-shrink-0">
            <p className="text-sm font-bold" style={{ color: 'var(--amber)' }}>{streak}🔥</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>racha</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
          <button onClick={() => onEdit(habit)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(habit.id)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Mini heatmap — last 14 days */}
      <div className="flex gap-0.5 mt-3">
        {last14.map(day => (
          <div key={day} title={day}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{
              background: isDone(day)
                ? color
                : day === today ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            }} />
        ))}
      </div>
      <div className="flex justify-between mt-0.5">
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>hace 14 días</p>
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>hoy</p>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Habits() {
  const [habits, setHabits]   = useState([])
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_logs').select('*').gte('date', format(subDays(new Date(), 60), 'yyyy-MM-dd')),
    ])
    setHabits(h || [])
    setLogs(l || [])
    setLoading(false)
  }

  async function saveHabit(data) {
    if (editingHabit) {
      const { data: updated } = await supabase.from('habits').update(data).eq('id', editingHabit.id).select().single()
      if (updated) setHabits(prev => prev.map(h => h.id === editingHabit.id ? updated : h))
      setEditingHabit(null)
    } else {
      const { data: created } = await supabase.from('habits').insert([data]).select().single()
      if (created) setHabits(prev => [...prev, created])
    }
    setShowForm(false)
  }

  async function toggleLog(habitId) {
    const existing = logs.find(l => l.habit_id === habitId && l.date === today)
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
      setLogs(prev => prev.filter(l => l.id !== existing.id))
    } else {
      const { data } = await supabase.from('habit_logs')
        .insert([{ habit_id: habitId, date: today, value: 1 }]).select().single()
      if (data) setLogs(prev => [...prev, data])
    }
  }

  async function deleteHabit(id) {
    await supabase.from('habit_logs').delete().eq('habit_id', id)
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
    setLogs(prev => prev.filter(l => l.habit_id !== id))
  }

  function startEdit(habit) {
    setEditingHabit(habit)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingHabit(null)
  }

  // Summary stats
  const thisWeekDays = getWeekDays(new Date())

  function isHabitDoneToday(habit) {
    if (habit.frequency === 'daily') {
      return logs.some(l => l.habit_id === habit.id && l.date === today)
    }
    if (habit.frequency === 'weekly') {
      return thisWeekDays.some(d => logs.some(l => l.habit_id === habit.id && l.date === d))
    }
    if (habit.frequency === 'xweek') {
      const done = thisWeekDays.filter(d => logs.some(l => l.habit_id === habit.id && l.date === d)).length
      return done >= (habit.freq_days_per_week || 3)
    }
    return false
  }

  const completedCount = habits.filter(h => isHabitDoneToday(h)).length
  const allDone = habits.length > 0 && completedCount === habits.length

  // Group by frequency
  const dailyHabits  = habits.filter(h => h.frequency === 'daily' || !h.frequency)
  const weeklyHabits = habits.filter(h => h.frequency === 'weekly')
  const xweekHabits  = habits.filter(h => h.frequency === 'xweek')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="section-title">Hábitos</h1>
        <button onClick={() => { setEditingHabit(null); setShowForm(v => !v) }} className="btn-primary">
          {showForm && !editingHabit ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> Nuevo hábito</>}
        </button>
      </div>

      {/* Summary card */}
      <div className="card flex items-center gap-4"
        style={{ borderColor: allDone ? 'color-mix(in srgb, var(--jade) 30%, transparent)' : 'rgba(255,255,255,0.07)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
          🎯
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">
            {completedCount} / {habits.length} objetivos en camino
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {allDone ? '¡Todo completado! 🔥 Día perfecto.' : 'Cada paso cuenta, sigue adelante.'}
          </p>
        </div>
        {/* Frequency legend */}
        <div className="flex flex-col gap-1 text-right flex-shrink-0">
          {dailyHabits.length > 0  && <span className="text-[10px]" style={{ color: 'var(--jade)'  }}>● {dailyHabits.length} diarios</span>}
          {weeklyHabits.length > 0 && <span className="text-[10px]" style={{ color: 'var(--sky)'   }}>● {weeklyHabits.length} semanales</span>}
          {xweekHabits.length > 0  && <span className="text-[10px]" style={{ color: 'var(--amber)' }}>● {xweekHabits.length} x/semana</span>}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <HabitForm
          initial={editingHabit ? {
            name: editingHabit.name, icon: editingHabit.icon,
            frequency: editingHabit.frequency || 'daily',
            freq_days_per_week: editingHabit.freq_days_per_week || 3,
            target_value: editingHabit.target_value || '',
            target_unit:  editingHabit.target_unit || '',
            goal_notes:   editingHabit.goal_notes || '',
          } : null}
          onSave={saveHabit}
          onCancel={cancelForm}
        />
      )}

      {/* Habit list */}
      {loading ? (
        <p className="muted text-center py-8">Cargando...</p>
      ) : habits.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">🌱</p>
          <p className="muted">No hay hábitos configurados. ¡Crea el primero!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map(habit => (
            <HabitCard key={habit.id} habit={habit} logs={logs} today={today}
              onToggle={toggleLog} onDelete={deleteHabit} onEdit={startEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
