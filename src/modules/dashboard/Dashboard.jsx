import { useEffect, useState } from 'react'
import { CheckSquare, Dumbbell, Flame, TrendingUp, Rocket, TrendingDown, Heart, CalendarDays, Scale, BookOpen, Clock, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth } from 'date-fns'

const CATEGORY_CARDS = [
  { to: '/tasks',       icon: CheckSquare, label: 'Tareas',       color: '#a99cf9', bg: 'rgba(169,156,249,0.12)', border: 'rgba(169,156,249,0.2)', desc: 'Gestiona tus pendientes' },
  { to: '/health',      icon: Heart,       label: 'Salud',        color: '#f16b6b', bg: 'rgba(241,107,107,0.12)', border: 'rgba(241,107,107,0.2)', desc: 'Entreno · Nutrición · Peso', group: true },
  { to: '/habits',      icon: BookOpen,    label: 'Hábitos',      color: '#facc15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.2)',  desc: 'Objetivos diarios y seguimiento' },
  { to: '/planner',     icon: CalendarDays,label: 'Planificador', color: '#f4a94e', bg: 'rgba(244,169,78,0.12)',  border: 'rgba(244,169,78,0.2)',  desc: 'Organiza tu tiempo' },
  { to: '/initiatives', icon: Rocket,      label: 'Iniciativas',  color: '#e879f9', bg: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.2)', desc: 'Proyectos e ideas' },
  { to: '/finance',     icon: TrendingUp,  label: 'Finanzas',     color: '#00c896', bg: 'rgba(0,200,150,0.12)',   border: 'rgba(0,200,150,0.2)',   desc: 'Gastos e ingresos' },
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

// Tasks widget: pending vs in-progress side by side, visually distinct with icons (no emojis)
function TasksWidget({ pending, inProgress, total, className }) {
  return (
    <Link to="/tasks" className={`card-sm ${className || ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tareas</p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{total} en total</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: 'rgba(169,156,249,0.10)' }}>
          <Clock size={16} style={{ color: '#a99cf9' }} className="flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-white leading-none">{pending}</p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>Pendientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: 'rgba(90,175,238,0.10)' }}>
          <RefreshCw size={16} style={{ color: '#5aafee' }} className="flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-white leading-none">{inProgress}</p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>En proceso</p>
          </div>
        </div>
      </div>
    </Link>
  )
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
      { data: transactions },
      { data: initiatives },
      { data: weightLogs },
      { data: habits },
      { data: habitLogs },
    ] = await Promise.all([
      supabase.from('tasks').select('id,status'),
      supabase.from('workouts').select('id,date,split_id,custom_block_id').gte('date', format(subDays(new Date(), 90), 'yyyy-MM-dd')),
      supabase.from('nutrition_logs').select('calories,protein_g').eq('date', today),
      supabase.from('transactions').select('type,amount,date').gte('date', monthStart),
      supabase.from('initiatives').select('id,status,priority'),
      supabase.from('weight_logs').select('weight_kg,date').order('date', { ascending: false }).limit(2),
      supabase.from('habits').select('id,frequency,freq_days_per_week'),
      supabase.from('habit_logs').select('habit_id,date').gte('date', weekStart).lte('date', weekEnd),
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

    const income  = (transactions || []).filter(t => t.type === 'income').reduce((a, t) => a + (t.amount || 0), 0)
    const expense = (transactions || []).filter(t => t.type === 'expense').reduce((a, t) => a + (t.amount || 0), 0)

    const activeInits = (initiatives || []).filter(i => ['researching', 'validating', 'active'].includes(i.status)).length

    const latestWeight = weightLogs?.[0]
    const prevWeight    = weightLogs?.[1]
    const weightDiff    = latestWeight && prevWeight ? (latestWeight.weight_kg - prevWeight.weight_kg) : null

    const habitsCompleted = (habits || []).filter(h => {
      const logs = (habitLogs || []).filter(l => l.habit_id === h.id)
      if (h.frequency === 'weekly') return logs.length > 0
      if (h.frequency === 'xweek') return logs.length >= (h.freq_days_per_week || 3)
      return logs.some(l => l.date === today)
    }).length

    setStats({
      tasks: { pending, inProgress, total: (tasks || []).length },
      training: { streak, thisWeek: trainedThisWeek },
      nutrition: nut,
      finance: { income, expense, balance: income - expense },
      initiatives: { active: activeInits },
      weight: latestWeight ? { kg: latestWeight.weight_kg, diff: weightDiff } : null,
      habits: { done: habitsCompleted, total: (habits || []).length },
    })
  }

  function getOtherStatCards() {
    if (!stats) return []
    const cards = []
    if (stats.training.streak > 0 || stats.training.thisWeek > 0)
      cards.push({ icon: Dumbbell, color: '#f16b6b', label: stats.training.streak > 0 ? 'Racha entreno' : 'Entrenos semana', value: stats.training.streak > 0 ? `${stats.training.streak}🔥` : stats.training.thisWeek, sub: `${stats.training.thisWeek} días esta semana`, to: '/health' })
    if (stats.nutrition.cal > 0)
      cards.push({ icon: Flame, color: '#f4a94e', label: 'Calorías hoy', value: `${fmt(stats.nutrition.cal)} kcal`, sub: `Proteína: ${Math.round(stats.nutrition.protein)}g`, to: '/nutrition' })
    if (stats.finance.income > 0 || stats.finance.expense > 0)
      cards.push({ icon: stats.finance.balance >= 0 ? TrendingUp : TrendingDown, color: '#00c896', label: 'Balance del mes', value: `${stats.finance.balance >= 0 ? '+' : ''}${fmt(stats.finance.balance)}€`, sub: `↑${fmt(stats.finance.income)}€  ↓${fmt(stats.finance.expense)}€`, to: '/finance' })
    if (stats.weight)
      cards.push({ icon: Scale, color: '#5aafee', label: 'Peso actual', value: `${stats.weight.kg} kg`, sub: stats.weight.diff !== null ? `${stats.weight.diff > 0 ? '+' : ''}${stats.weight.diff.toFixed(1)} kg vs anterior` : 'Último registro', to: '/weight' })
    if (stats.habits.total > 0)
      cards.push({ icon: BookOpen, color: '#facc15', label: 'Hábitos esta semana', value: `${stats.habits.done}/${stats.habits.total}`, sub: stats.habits.done === stats.habits.total ? '¡Completado! 🎯' : 'en camino', to: '/habits' })
    if (stats.initiatives.active > 0)
      cards.push({ icon: Rocket, color: '#e879f9', label: 'Iniciativas activas', value: stats.initiatives.active, sub: 'investigando, validando o en marcha', to: '/initiatives' })
    return cards
  }

  const otherCards = getOtherStatCards()
  const hasTasks = stats && stats.tasks.total > 0
  const hasAnyData = stats && (hasTasks || otherCards.length > 0)

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>{todayFmt}</p>
        <h1 className="text-3xl font-semibold text-white mt-1">Bienvenido de vuelta 👋</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CATEGORY_CARDS.map(({ to, icon: Icon, label, color, bg, border, desc, group }) => (
          <Link key={to} to={to} className="rounded-2xl p-4 transition-all hover:scale-[1.02]" style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, border: `1px solid ${border}` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <h3 className="font-semibold text-white text-sm">{label}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            {group && <p className="text-[10px] mt-1" style={{ color: `${color}70` }}>Grupo →</p>}
          </Link>
        ))}
      </div>

      {!stats ? (
        <div className="card"><p className="muted text-center py-3 text-sm">Cargando resumen...</p></div>
      ) : !hasAnyData ? (
        <div className="card"><p className="muted text-center py-3 text-sm">Empieza a registrar datos para ver tu resumen aquí.</p></div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Resumen de hoy</p>
          {hasTasks && (
            <TasksWidget pending={stats.tasks.pending} inProgress={stats.tasks.inProgress} total={stats.tasks.total} className="w-full" />
          )}
          {otherCards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {otherCards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
