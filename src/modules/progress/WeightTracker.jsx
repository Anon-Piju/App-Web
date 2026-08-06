import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, addWeeks, subWeeks, eachWeekOfInterval, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

function weekLabel(mondayStr) {
  const monday = new Date(mondayStr + 'T12:00:00')
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  return `${format(monday, 'd MMM', { locale: es })} – ${format(sunday, 'd MMM', { locale: es })}`
}

function Sparkline({ data, color, height = 60 }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => d.weight)
  const max = Math.max(...vals), min = Math.min(...vals)
  const range = max - min || 0.5
  const w = 100 / (vals.length - 1)
  const pts = vals.map((v, i) => `${i * w},${height - ((v - min) / range) * (height - 8) - 4}`).join(' ')
  return (
    <svg width="100%" height={height} preserveAspectRatio="none" viewBox={`0 0 100 ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={i * w} cy={height - ((d.weight - min) / range) * (height - 8) - 4} r="2" fill={color}>
          <title>{d.weight} kg — semana del {d.date}</title>
        </circle>
      ))}
    </svg>
  )
}

export default function WeightTracker() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [weight, setWeight]     = useState('')
  const [notes, setNotes]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formWeek, setFormWeek] = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [periodWeeks, setPeriodWeeks] = useState(12)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('weight_logs').select('*').order('date', { ascending: true })
    setLogs(data || [])
    setLoading(false)
  }

  async function addLog() {
    if (!weight) return
    const payload = { weight_kg: parseFloat(weight), date: formWeek, notes: notes.trim() || null }
    const { data } = await supabase.from('weight_logs').upsert([payload], { onConflict: 'date' }).select().single()
    if (data) {
      setLogs(prev => {
        const filtered = prev.filter(l => l.date !== data.date)
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date))
      })
    }
    setWeight(''); setNotes(''); setShowForm(false)
  }

  async function del(id) {
    await supabase.from('weight_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  const cutoff = format(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), periodWeeks - 1), 'yyyy-MM-dd')
  const visible = sorted.filter(l => l.date >= cutoff)

  const latest = sorted[sorted.length - 1]
  const prev   = sorted[sorted.length - 2]
  const diff   = latest && prev ? (latest.weight_kg - prev.weight_kg) : null
  const first  = visible[0]
  const periodDiff = latest && first && latest.date !== first.date ? (latest.weight_kg - first.weight_kg) : null

  const trendColor = diff === null ? 'var(--text-muted)' : diff < 0 ? 'var(--jade)' : diff > 0 ? 'var(--rose)' : 'var(--sky)'

  // Last 26 weeks — weekly heatmap
  const today = new Date()
  const weeks26 = eachWeekOfInterval(
    { start: subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 25), end: today },
    { weekStartsOn: 1 }
  ).map(w => {
    const ds = format(w, 'yyyy-MM-dd')
    return { date: ds, log: logs.find(l => l.date === ds) }
  })

  const currentWeekLabel = weekLabel(formWeek)
  const isCurrentWeek = formWeek === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Seguimiento de peso</h1>
          <p className="muted text-xs mt-0.5">{logs.length} registros semanales</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary">
          <Plus size={15} /> Registrar
        </button>
      </div>

      {/* Weekly form */}
      {showForm && (
        <div className="card space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--sky) 25%, transparent)' }}>
          <div>
            <label className="label">Semana</label>
            <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setFormWeek(f => format(subWeeks(new Date(f + 'T12:00:00'), 1), 'yyyy-MM-dd'))} className="text-zinc-400 hover:text-white">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm text-white font-medium">{currentWeekLabel}</p>
                {isCurrentWeek && <p className="text-[10px]" style={{ color: 'var(--sky)' }}>Semana actual</p>}
              </div>
              <button onClick={() => setFormWeek(f => format(addWeeks(new Date(f + 'T12:00:00'), 1), 'yyyy-MM-dd'))} className="text-zinc-400 hover:text-white">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="label">Peso (kg)</label>
            <input className="input" type="number" step="0.1" placeholder="75.5" value={weight}
              onChange={e => setWeight(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && addLog()} />
          </div>
          <input className="input" placeholder="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={addLog} className="btn-primary">Guardar</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card-sm text-center space-y-1">
            <p className="text-2xl font-bold text-white">{latest.weight_kg}<span className="text-sm font-normal text-zinc-500 ml-1">kg</span></p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Peso actual</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>sem. {weekLabel(latest.date)}</p>
          </div>
          <div className="card-sm text-center space-y-1">
            {diff !== null ? (
              <>
                <p className="text-xl font-bold" style={{ color: trendColor }}>{diff > 0 ? '+' : ''}{diff.toFixed(1)} kg</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>vs semana anterior</p>
              </>
            ) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin comparación</p>}
          </div>
          <div className="card-sm text-center space-y-1">
            {periodDiff !== null ? (
              <>
                <p className="text-xl font-bold" style={{ color: periodDiff < 0 ? 'var(--jade)' : periodDiff > 0 ? 'var(--rose)' : 'var(--sky)' }}>
                  {periodDiff > 0 ? '+' : ''}{periodDiff.toFixed(1)} kg
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>en {periodWeeks} semanas</p>
              </>
            ) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Más datos pronto</p>}
          </div>
        </div>
      )}

      {/* Chart */}
      {visible.length >= 2 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Evolución del peso</p>
            <div className="flex gap-1">
              {[4, 12, 26].map(w => (
                <button key={w} onClick={() => setPeriodWeeks(w)}
                  className={`text-xs px-2 py-0.5 rounded-lg transition-all ${periodWeeks === w ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                  style={{ background: periodWeeks === w ? 'rgba(90,175,238,0.2)' : 'transparent' }}>
                  {w}sem
                </button>
              ))}
            </div>
          </div>
          <Sparkline data={visible.map(l => ({ weight: l.weight_kg, date: l.date }))} color="var(--sky)" height={80} />
          <div className="flex justify-between text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span>sem. {weekLabel(visible[0]?.date)}</span>
            <span>sem. {weekLabel(visible[visible.length - 1]?.date)}</span>
          </div>
        </div>
      )}

      {/* Weekly heatmap — last 26 weeks */}
      <div className="card space-y-2">
        <p className="text-xs font-medium text-white">Registros últimas 26 semanas</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '3px' }}>
          {weeks26.map((w, i) => (
            <div key={i} title={w.log ? `${weekLabel(w.date)}: ${w.log.weight_kg} kg` : `Semana del ${weekLabel(w.date)}`}
              style={{ aspectRatio: '1', borderRadius: '3px', background: w.log ? 'var(--sky)' : 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
        <div className="flex justify-between text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <span>hace 26 semanas</span><span>esta semana</span>
        </div>
      </div>

      {/* Log list */}
      {loading ? <p className="muted text-center py-6">Cargando...</p> :
       logs.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">⚖️</p>
          <p className="muted">Sin registros todavía. ¡Añade el peso de esta semana!</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {[...sorted].reverse().slice(0, 20).map((l, i, arr) => {
            const prevLog = arr[i + 1]
            const d = prevLog ? l.weight_kg - prevLog.weight_kg : null
            return (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl group"
                style={{ background: 'var(--surface1)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-semibold">{l.weight_kg} kg</span>
                    {d !== null && (
                      <span className="text-xs" style={{ color: d < 0 ? 'var(--jade)' : d > 0 ? 'var(--rose)' : 'var(--sky)' }}>
                        {d > 0 ? '+' : ''}{d.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {l.notes && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{l.notes}</p>}
                </div>
                <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>sem. {weekLabel(l.date)}</p>
                <button onClick={() => del(l.id)} className="opacity-0 group-hover:opacity-100 transition-all text-zinc-600 hover:text-rose p-0.5">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
