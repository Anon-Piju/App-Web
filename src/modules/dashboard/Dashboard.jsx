import { useEffect, useState } from 'react'
import { CheckSquare, Dumbbell, UtensilsCrossed, BookOpen, CalendarDays, Flame, TrendingUp, Rocket, TrendingDown, Heart, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth } from 'date-fns'

// Category cards — grouped
const CATEGORY_CARDS = [
  {
    to: '/tasks',
    icon: CheckSquare,
    label: 'Tareas',
    color: '#a99cf9',
    bg: 'rgba(169,156,249,0.12)',
    border: 'rgba(169,156,249,0.2)',
    desc: 'Gestiona tus pendientes',
  },
  {
    // Health group → goes to health mini-dashboard
    to: '/health',
    icon: Heart,
    label: 'Salud',
    color: '#f16b6b',
    bg: 'rgba(241,107,107,0.12)',
    border: 'rgba(241,107,107,0.2)',
    desc: 'Entreno · Nutrición · Hábitos',
    group: true,
  },
  {
    to: '/planner',
    icon: CalendarDays,
    label: 'Planificador',
    color: '#5aafee',
    bg: 'rgba(90,175,238,0.12)',
    border: 'rgba(90,175,238,0.2)',
    desc: 'Organiza tu tiempo',
  },
  {
    to: '/initiatives',
    icon: Rocket,
    label: 'Iniciativas',
    color: '#a99cf9',
    bg: 'rgba(169,156,249,0.12)',
    border: 'rgba(169,156,249,0.2)',
    desc: 'Proyectos e ideas',
  },
  {
    to: '/finance',
    icon: TrendingUp,
    label: 'Finanzas',
    color: '#3ecf8e',
    bg: 'rgba(62,207,142,0.12)',
    border: 'rgba(62,207,142,0.2)',
    desc: 'Gastos e ingresos',
  },
]

function fmt(n) { return (n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }

function StatCard({ label, value, sub, color, icon: Icon, to }) {
  const inner = (
    <div className="card-sm flex items-center gap-3 transition-all hover:opacity-90">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-white leading-none">{value}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>{sub}</p>}
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const today      = format(new Date(), 'yyyy-MM-dd')
  const weekStart  = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd    = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const todayFmt   = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [
      { data: tasks },
      { data: workouts },
      { data: nutToday },
      { data: habits },
      { data: habitLogs },
      { data: customBlocks },
      { data: transactions },
      { data: initiatives },
    ] = await Promise.all([
      supabase.from('tasks').select('id,status'),
      supabase.from('workouts').select('id,date,split_id,custom_block_id').gte('date', format(subDays(new Date(), 90), 'yyyy-MM-dd')),
      supabase.from('nutrition_logs').select('calories,protein_g,carbs_g,fat_g').eq('date', today),
      supabase.from('habits').select('id,frequency,freq_days_per_week'),
      supabase.from('habit_logs').select('habit_id,date').gte('date', weekStart).lte('date', weekEnd),
      supabase.from('custom_blocks').select('id,name'),
      supabase.from('transactions').select('type,amount,date').gte('date', monthStart),
      supabase.from('initiatives').select('id,status,priority'),
    ])

    const pending    = (tasks || []).filter(t => t.status === 'pending').length
    const inProgress = (tasks || []).filter(t => t.status === 'progress').length

    let streak = 0
    for (let i = 0; i < 90; i++) {
      const day = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const w = (workouts || []).find(x => x.date === day)
      if (!w) { if (i > 0) break } else if (w.split_id !== 'rest') streak++
    }
    const trainedThisWeek = (workouts || []).filter(w => w.date >= weekStart && w.date <= weekEnd && w.split_id !== 'rest').length

    const nut = (nutToday || []).reduce((a, r) => ({ cal: a.cal + (r.calories || 0), protein: a.protein + (r.protein_g || 0) }), { cal: 0, protein: 0 })

    const habitsCompleted = (habits || []).filter(h => {
      const logs = (habitLogs || []).filter(l => l.habit_id === h.id)
      if (h.frequency === 'weekly') return logs.length > 0
      if (h.frequency === 'xweek') return logs.length >= (h.freq_days_per_week || 3)
      return logs.some(l => l.date === today)
    }).length

    const income  = (transactions || []).filter(t => t.type === 'income').reduce((a, t) => a + (t.amount || 0), 0)
    const expense = (transactions || []).filter(t => t.type === 'expense').reduce((a, t) => a + (t.amount || 0), 0)
    const balance = income - expense

    const activeInits    = (initiatives || []).filter(i => ['idea','researching','validating','active'].includes(i.status)).length
    const highPriInits   = (initiatives || []).filter(i => i.priority === 3 && ['idea','researching','validating','active'].includes(i.status)).length

    setStats({ tasks: { pending, inProgress, total: (tasks||[]).length }, training: { streak, thisWeek: trainedThisWeek }, nutrition: nut, habits: { done: habitsCompleted, total: (habits||[]).length }, finance: { income, expense, balance }, initiatives: { active: activeInits, highPri: highPriInits } })
  }

  function getStatCards() {
    if (!stats) return []
    const cards = []
    if (stats.tasks.pending > 0 || stats.tasks.inProgress > 0)
      cards.push({ icon: CheckSquare, color: '#a99cf9', label: 'Tareas pendientes', value: stats.tasks.pending, sub: stats.tasks.inProgress > 0 ? `${stats.tasks.inProgress} en proceso` : `de ${stats.tasks.total} totales`, to: '/tasks' })
    if (stats.training.streak > 0 || stats.training.thisWeek > 0)
      cards.push({ icon: Dumbbell, color: '#3ecf8e', label: stats.training.streak > 0 ? 'Racha entreno' : 'Entrenos esta semana', value: stats.training.streak > 0 ? `${stats.training.streak}🔥` : stats.training.thisWeek, sub: `${stats.training.thisWeek} días esta semana`, to: '/health' })
    if (stats.nutrition.cal > 0)
      cards.push({ icon: Flame, color: '#f4a94e', label: 'Calorías hoy', value: `${fmt(stats.nutrition.cal)} kcal`, sub: `Proteína: ${Math.round(stats.nutrition.protein)}g`, to: '/nutrition' })
    if (stats.finance.income > 0 || stats.finance.expense > 0)
      cards.push({ icon: stats.finance.balance >= 0 ? TrendingUp : TrendingDown, color: stats.finance.balance >= 0 ? '#3ecf8e' : '#f16b6b', label: 'Balance del mes', value: `${stats.finance.balance >= 0 ? '+' : ''}${fmt(stats.finance.balance)}€`, sub: `↑${fmt(stats.finance.income)}€  ↓${fmt(stats.finance.expense)}€`, to: '/finance' })
    if (stats.habits.total > 0)
      cards.push({ icon: BookOpen, color: '#f16b6b', label: 'Hábitos esta semana', value: `${stats.habits.done}/${stats.habits.total}`, sub: stats.habits.done === stats.habits.total ? '¡Todo completado! 🎯' : 'en camino', to: '/health' })
    if (stats.initiatives.active > 0)
      cards.push({ icon: Rocket, color: '#a99cf9', label: 'Iniciativas activas', value: stats.initiatives.active, sub: stats.initiatives.highPri > 0 ? `${stats.initiatives.highPri} alta prioridad` : 'en progreso', to: '/initiatives' })
    return cards
  }

  const statCards = getStatCards()
  const hasData = statCards.length > 0

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>{todayFmt}</p>
        <h1 className="text-3xl font-semibold text-white mt-1">Bienvenido de vuelta 👋</h1>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CATEGORY_CARDS.map(({ to, icon: Icon, label, color, bg, border, desc, group }) => (
          <Link key={to} to={to} className="rounded-2xl p-4 group transition-all hover:scale-[1.02]"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, border: `1px solid ${border}` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <h3 className="font-semibold text-white text-sm">{label}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            {group && <p className="text-[10px] mt-1.5" style={{ color: `${color}80` }}>Grupo de secciones →</p>}
          </Link>
        ))}
      </div>

      {/* Live stats */}
      {!stats ? (
        <div className="card"><p className="muted text-center py-3 text-sm">Cargando resumen...</p></div>
      ) : !hasData ? (
        <div className="card"><p className="muted text-center py-3 text-sm">Empieza a registrar datos para ver tu resumen aquí.</p></div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Resumen de hoy</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statCards.map((c, i) => <StatCard key={i} {...c} />)}
          </div>
        </div>
      )}
    </div>
  )
}
