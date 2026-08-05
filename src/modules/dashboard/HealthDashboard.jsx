import { useEffect, useState } from 'react'
import { Dumbbell, UtensilsCrossed, BookOpen, TrendingUp, Flame, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

const SECTIONS = [
  { to: '/training',  icon: Dumbbell,        label: 'Entrenamiento', color: '#3ecf8e', bg: 'rgba(62,207,142,0.12)',  border: 'rgba(62,207,142,0.2)',  desc: 'Bloques, planificación y estadísticas' },
  { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrición',     color: '#f4a94e', bg: 'rgba(244,169,78,0.12)',  border: 'rgba(244,169,78,0.2)',  desc: 'Comidas, macros y menú semanal' },
  { to: '/habits',    icon: BookOpen,        label: 'Hábitos',       color: '#f16b6b', bg: 'rgba(241,107,107,0.12)', border: 'rgba(241,107,107,0.2)', desc: 'Objetivos diarios y seguimiento' },
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
      { data: habits },
      { data: habitLogs },
      { data: customBlocks },
    ] = await Promise.all([
      supabase.from('workouts').select('id,date,split_id,custom_block_id').gte('date', format(subDays(new Date(), 90), 'yyyy-MM-dd')),
      supabase.from('nutrition_logs').select('calories,protein_g,carbs_g,fat_g').eq('date', today),
      supabase.from('habits').select('id,frequency,freq_days_per_week'),
      supabase.from('habit_logs').select('habit_id,date').gte('date', weekStart).lte('date', weekEnd),
      supabase.from('custom_blocks').select('id,name'),
    ])

    // Streak
    let streak = 0
    for (let i = 0; i < 90; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const w = (workouts || []).find(x => x.date === day)
      if (!w) { if (i > 0) break } else if (w.split_id !== 'rest') streak++
    }
    const trainedThisWeek = (workouts || []).filter(w => w.date >= weekStart && w.date <= weekEnd && w.split_id !== 'rest').length
    const lastW = (workouts || []).filter(w => w.split_id !== 'rest' || w.custom_block_id).sort((a, b) => b.date.localeCompare(a.date))[0]
    const lastBlock = lastW?.custom_block_id ? (customBlocks || []).find(b => b.id === lastW.custom_block_id)?.name : lastW?.split_id || null

    // Nutrition
    const nut = (nutToday || []).reduce((a, r) => ({ cal: a.cal + (r.calories || 0), protein: a.protein + (r.protein_g || 0) }), { cal: 0, protein: 0 })

    // Habits
    const done = (habits || []).filter(h => {
      const logs = (habitLogs || []).filter(l => l.habit_id === h.id)
      if (h.frequency === 'weekly') return logs.length > 0
      if (h.frequency === 'xweek') return logs.length >= (h.freq_days_per_week || 3)
      return logs.some(l => l.date === today)
    }).length

    setStats({ streak, thisWeek: trainedThisWeek, lastBlock, cal: Math.round(nut.cal), protein: Math.round(nut.protein), habitsDone: done, habitsTotal: (habits || []).length })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>{todayFmt}</p>
        <h1 className="text-2xl font-semibold text-white mt-1">Salud 💪</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Entrenamiento, nutrición y hábitos</p>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {stats.streak > 0 && <StatPill label="Racha entreno" value={`${stats.streak}🔥`} color="#3ecf8e" />}
          <StatPill label="Entrenos sem." value={stats.thisWeek} color="#3ecf8e" />
          {stats.cal > 0 && <StatPill label="Kcal hoy" value={stats.cal} color="#f4a94e" />}
          {stats.cal > 0 && <StatPill label="Proteína hoy" value={`${stats.protein}g`} color="#f16b6b" />}
          <StatPill label="Hábitos" value={`${stats.habitsDone}/${stats.habitsTotal}`} color="#a99cf9" />
        </div>
      )}

      {/* Section cards */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Secciones</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
