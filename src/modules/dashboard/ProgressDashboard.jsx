import { useEffect, useState } from 'react'
import { Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format, subDays } from 'date-fns'

const SECTIONS = [
  { to: '/weight', icon: Scale, label: 'Seguimiento de peso', color: '#5aafee', bg: 'rgba(90,175,238,0.12)', border: 'rgba(90,175,238,0.2)', desc: 'Registra y visualiza tu evolución corporal' },
]

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-3 rounded-2xl"
      style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

export default function ProgressDashboard() {
  const [stats, setStats] = useState(null)
  const todayFmt = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('weight_logs').select('weight_kg,date').order('date', { ascending: true })
    if (!data || data.length === 0) { setStats({ logs: [] }); return }
    const latest = data[data.length - 1]
    const prev   = data[data.length - 2]
    const first30 = data.find(l => l.date >= format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const diff = prev ? (latest.weight_kg - prev.weight_kg) : null
    const diff30 = first30 && first30.date !== latest.date ? (latest.weight_kg - first30.weight_kg) : null
    setStats({ logs: data, latest, diff, diff30 })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>{todayFmt}</p>
        <h1 className="text-2xl font-semibold text-white mt-1">Progreso físico 📊</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Seguimiento y evolución corporal</p>
      </div>

      {/* Stats */}
      {stats?.latest && (
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Peso actual" value={`${stats.latest.weight_kg} kg`} color="#5aafee" />
          {stats.diff !== null && (
            <StatPill
              label="vs anterior"
              value={`${stats.diff > 0 ? '+' : ''}${stats.diff.toFixed(1)} kg`}
              color={stats.diff < 0 ? '#3ecf8e' : stats.diff > 0 ? '#f16b6b' : '#5aafee'}
            />
          )}
          {stats.diff30 !== null && (
            <StatPill
              label="últimos 30d"
              value={`${stats.diff30 > 0 ? '+' : ''}${stats.diff30.toFixed(1)} kg`}
              color={stats.diff30 < 0 ? '#3ecf8e' : stats.diff30 > 0 ? '#f16b6b' : '#5aafee'}
            />
          )}
          {!stats.diff && <StatPill label="Registros" value={stats.logs.length} color="#5aafee" />}
        </div>
      )}

      {/* Sections */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Secciones</p>
        <div className="grid grid-cols-1 gap-3">
          {SECTIONS.map(({ to, icon: Icon, label, color, bg, border, desc }) => (
            <Link key={to} to={to} className="rounded-2xl p-4 group transition-all hover:scale-[1.01]"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{label}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
