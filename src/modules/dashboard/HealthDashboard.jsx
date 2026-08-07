import { useEffect, useState } from 'react'
import { Dumbbell, UtensilsCrossed, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'

const SECTIONS = [
  { to: '/training',  icon: Dumbbell,        label: 'Entrenamiento', color: '#3ecf8e', bg: 'rgba(62,207,142,0.12)',  border: 'rgba(62,207,142,0.2)',  desc: 'Bloques, planificación y estadísticas' },
  { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrición',     color: '#f4a94e', bg: 'rgba(244,169,78,0.12)',  border: 'rgba(244,169,78,0.2)',  desc: 'Comidas, macros y menú semanal' },
  { to: '/weight',    icon: Scale,           label: 'Peso corporal', color: '#5aafee', bg: 'rgba(90,175,238,0.12)',  border: 'rgba(90,175,238,0.2)',  desc: 'Registra y visualiza tu evolución' },
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

export default function HealthDashboard() {
  const [stats, setStats] = useState(null)
  const today     = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd   = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const todayFmt  = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => { load() }, [])

  async function load() {
    const [
      { data: workouts },
      { data: nutToday },
      { data: weightLogs },
    ] = await Promise.all([
      supabase.from('workouts').select('id,date,split_id').gte('date', format(subDays(new Date(), 90), 'yyyy-MM-dd')),
      supabase.from('nutrition_logs').select('calories,protein_g').eq('date', today),
      supabase.from('weight_logs').select('weight_kg,date').order('date', { ascending: false }).limit(2),
    ])

    let streak = 0
    for (let i = 0; i < 90; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const w = (workouts || []).find(x => x.date === day)
      if (!w) { if (i > 0) break } else if (w.split_id !== 'rest') streak++
    }
    const trainedThisWeek = (workouts || []).filter(w => w.date >= weekStart && w.date <= weekEnd && w.split_id !== 'rest').length
    const nut = (nutToday || []).reduce((a, r) => ({ cal: a.cal + (r.calories || 0), protein: a.protein + (r.protein_g || 0) }), { cal: 0, protein: 0 })

    const latestWeight = weightLogs?.[0]
    const prevWeight    = weightLogs?.[1]
    const weightDiff    = latestWeight && prevWeight ? (latestWeight.weight_kg - prevWeight.weight_kg) : null

    setStats({ streak, thisWeek: trainedThisWeek, cal: Math.round(nut.cal), protein: Math.round(nut.protein), weight: latestWeight?.weight_kg, weightDiff })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>{todayFmt}</p>
        <h1 className="text-2xl font-semibold text-white mt-1">Salud 💪</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Entrenamiento, nutrición y peso</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {stats.streak > 0 && <StatPill label="Racha entreno" value={`${stats.streak}🔥`} color="#3ecf8e" />}
          <StatPill label="Entrenos sem." value={stats.thisWeek} color="#3ecf8e" />
          {stats.cal > 0 && <StatPill label="Kcal hoy" value={stats.cal} color="#f4a94e" />}
          {stats.weight && <StatPill label="Peso" value={`${stats.weight} kg`} color="#5aafee" />}
        </div>
      )}

      <div>
        <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Secciones</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map(({ to, icon: Icon, label, color, bg, border, desc }) => (
            <Link key={to} to={to} className="rounded-2xl p-4 group transition-all hover:scale-[1.02]"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <h3 className="font-semibold text-white">{label}</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
