import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

function Sparkline({ data, color, height = 60 }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => d.weight)
  const max = Math.max(...vals), min = Math.min(...vals)
  const range = max - min || 0.5
  const w = 100 / (vals.length - 1)
  const pts = vals.map((v, i) => `${i * w},${height - ((v - min) / range) * (height - 8) - 4}`).join(' ')
  return (
    <svg width="100%" height={height} preserveAspectRatio="none" viewBox={`0 0 100 ${height}`}>
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={i * w} cy={height - ((d.weight - min) / range) * (height - 8) - 4}
          r="2" fill={color}>
          <title>{d.weight} kg — {d.date}</title>
        </circle>
      ))}
    </svg>
  )
}

export default function WeightTracker() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight]   = useState('')
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [period, setPeriod]   = useState(30) // days to show

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('weight_logs').select('*').order('date', { ascending: true })
    setLogs(data || [])
    setLoading(false)
  }

  async function addLog() {
    if (!weight || !date) return
    const payload = { weight_kg: parseFloat(weight), date, notes: notes.trim() || null }
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
  const cutoff = format(subDays(new Date(), period), 'yyyy-MM-dd')
  const visible = sorted.filter(l => l.date >= cutoff)

  const latest  = sorted[sorted.length - 1]
  const prev    = sorted[sorted.length - 2]
  const diff    = latest && prev ? (latest.weight_kg - prev.weight_kg) : null
  const first   = visible[0]
  const periodDiff = latest && first && latest.date !== first.date ? (latest.weight_kg - first.weight_kg) : null

  const trendColor = diff === null ? 'var(--text-muted)' : diff < 0 ? 'var(--jade)' : diff > 0 ? 'var(--rose)' : 'var(--sky)'

  // Mini heatmap: last 90 days — logged or not
  const last90 = eachDayOfInterval({ start: subDays(new Date(), 89), end: new Date() })
    .map(d => ({ date: format(d, 'yyyy-MM-dd'), log: logs.find(l => l.date === format(d, 'yyyy-MM-dd')) }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Seguimiento de peso</h1>
          <p className="muted text-xs mt-0.5">{logs.length} registros en total</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary">
          <Plus size={15} /> Registrar
        </button>
      </div>

      {/* Quick form */}
      {showForm && (
        <div className="card space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--sky) 25%, transparent)' }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Peso (kg)</label>
              <input className="input" type="number" step="0.1" placeholder="75.5" value={weight}
                onChange={e => setWeight(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && addLog()} />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
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
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{latest.date}</p>
          </div>
          <div className="card-sm text-center space-y-1">
            {diff !== null ? (
              <>
                <p className="text-xl font-bold" style={{ color: trendColor }}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>vs registro anterior</p>
              </>
            ) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin comparación</p>}
          </div>
          <div className="card-sm text-center space-y-1">
            {periodDiff !== null ? (
              <>
                <p className="text-xl font-bold" style={{ color: periodDiff < 0 ? 'var(--jade)' : periodDiff > 0 ? 'var(--rose)' : 'var(--sky)' }}>
                  {periodDiff > 0 ? '+' : ''}{periodDiff.toFixed(1)} kg
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>en {period} días</p>
              </>
            ) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Más datos pronto</p>}
          </div>
        </div>
      )}

      {/* Period selector + chart */}
      {visible.length >= 2 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Evolución del peso</p>
            <div className="flex gap-1">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setPeriod(d)}
                  className={`text-xs px-2 py-0.5 rounded-lg transition-all ${period === d ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                  style={{ background: period === d ? 'rgba(90,175,238,0.2)' : 'transparent' }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <Sparkline data={visible.map(l => ({ weight: l.weight_kg, date: l.date }))} color="var(--sky)" height={80} />
          <div className="flex justify-between text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span>{visible[0]?.date}</span>
            <span>{visible[visible.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Activity heatmap — logged days */}
      <div className="card space-y-2">
        <p className="text-xs font-medium text-white">Registros últimos 90 días</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '2px' }}>
          {Array.from({ length: 13 }, (_, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {last90.slice(wi * 7, wi * 7 + 7).map((d, di) => (
                <div key={di} title={d.log ? `${d.date}: ${d.log.weight_kg} kg` : d.date}
                  style={{ width: '100%', aspectRatio: '1', borderRadius: '2px', background: d.log ? 'var(--sky)' : 'rgba(255,255,255,0.05)' }} />
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <span>hace 90 días</span><span>hoy</span>
        </div>
      </div>

      {/* Log list */}
      {loading ? <p className="muted text-center py-6">Cargando...</p> :
       logs.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">⚖️</p>
          <p className="muted">Sin registros todavía. ¡Añade tu primer peso!</p>
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
                <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{l.date}</p>
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
