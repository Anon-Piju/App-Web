import { useEffect, useState } from 'react'
import { CheckSquare, Dumbbell, UtensilsCrossed, BookOpen, CalendarDays, Flame, TrendingUp, Rocket, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

const CARDS = [
  { to:'/tasks',       icon:CheckSquare,     label:'Tareas',        color:'#a99cf9', bg:'rgba(169,156,249,0.12)', border:'rgba(169,156,249,0.2)', desc:'Gestiona tus pendientes' },
  { to:'/training',    icon:Dumbbell,        label:'Entrenamiento', color:'#3ecf8e', bg:'rgba(62,207,142,0.12)',  border:'rgba(62,207,142,0.2)',  desc:'Registra tus sesiones' },
  { to:'/nutrition',   icon:UtensilsCrossed, label:'Nutrición',     color:'#f4a94e', bg:'rgba(244,169,78,0.12)',  border:'rgba(244,169,78,0.2)',  desc:'Trackea comidas y macros' },
  { to:'/habits',      icon:BookOpen,        label:'Hábitos',       color:'#f16b6b', bg:'rgba(241,107,107,0.12)', border:'rgba(241,107,107,0.2)', desc:'Objetivos y seguimiento' },
  { to:'/planner',     icon:CalendarDays,    label:'Planificador',  color:'#5aafee', bg:'rgba(90,175,238,0.12)',  border:'rgba(90,175,238,0.2)',  desc:'Organiza tu tiempo' },
  { to:'/initiatives', icon:Rocket,          label:'Iniciativas',   color:'#a99cf9', bg:'rgba(169,156,249,0.12)', border:'rgba(169,156,249,0.2)', desc:'Proyectos e ideas' },
  { to:'/finance',     icon:TrendingUp,      label:'Finanzas',      color:'#3ecf8e', bg:'rgba(62,207,142,0.12)',  border:'rgba(62,207,142,0.2)',  desc:'Gastos e ingresos' },
]

function fmt(n) { return (n??0).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:0}) }

function StatCard({ label, value, sub, color, icon: Icon, to }) {
  const inner = (
    <div className="card-sm flex items-center gap-3 transition-all hover:opacity-90">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background:`${color}18` }}>
        <Icon size={18} style={{ color }}/>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-white leading-none">{value}</p>
        <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5 truncate" style={{ color:'rgba(255,255,255,0.25)' }}>{sub}</p>}
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

// Mini bar: percentage fill
function MiniBar({ pct, color }) {
  return (
    <div className="h-1 rounded-full overflow-hidden mt-1" style={{ background:'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(pct,100)}%`, background:color }}/>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const today     = format(new Date(),'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(),{weekStartsOn:1}),'yyyy-MM-dd')
  const weekEnd   = format(endOfWeek(new Date(),{weekStartsOn:1}),'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()),'yyyy-MM-dd')
  const todayFmt  = new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [
      { data: tasks },
      { data: workouts },
      { data: nutToday },
      { data: nutWeek },
      { data: habits },
      { data: habitLogs },
      { data: customBlocks },
      { data: transactions },
      { data: initiatives },
    ] = await Promise.all([
      supabase.from('tasks').select('id,status'),
      supabase.from('workouts').select('id,date,split_id,custom_block_id,performance_rating').gte('date',format(subDays(new Date(),90),'yyyy-MM-dd')),
      supabase.from('nutrition_logs').select('calories,protein_g,carbs_g,fat_g').eq('date',today),
      supabase.from('nutrition_logs').select('calories,protein_g').gte('date',weekStart).lte('date',weekEnd),
      supabase.from('habits').select('id,name,frequency,freq_days_per_week'),
      supabase.from('habit_logs').select('habit_id,date').gte('date',weekStart).lte('date',weekEnd),
      supabase.from('custom_blocks').select('id,name,color'),
      supabase.from('transactions').select('type,amount,date').gte('date',monthStart),
      supabase.from('initiatives').select('id,status,priority'),
    ])

    // Tasks
    const pending    = (tasks||[]).filter(t=>t.status==='pending').length
    const inProgress = (tasks||[]).filter(t=>t.status==='progress').length

    // Training streak
    let streak = 0
    for (let i=0; i<90; i++) {
      const day = format(subDays(new Date(),i),'yyyy-MM-dd')
      const w = (workouts||[]).find(x=>x.date===day)
      if (!w) { if (i>0) break } else if (w.split_id!=='rest') streak++
    }
    const trainedThisWeek = (workouts||[]).filter(w=>w.date>=weekStart&&w.date<=weekEnd&&w.split_id!=='rest').length
    const lastWorkout = (workouts||[]).filter(w=>w.split_id!=='rest'||w.custom_block_id).sort((a,b)=>b.date.localeCompare(a.date))[0]
    const lastBlock = lastWorkout?.custom_block_id ? (customBlocks||[]).find(b=>b.id===lastWorkout.custom_block_id)?.name : lastWorkout?.split_id||null

    // Nutrition today
    const nut = (nutToday||[]).reduce((a,r)=>({cal:a.cal+(r.calories||0),protein:a.protein+(r.protein_g||0),carbs:a.carbs+(r.carbs_g||0),fat:a.fat+(r.fat_g||0)}),{cal:0,protein:0,carbs:0,fat:0})
    // Nutrition weekly avg calories
    const weekCal = (nutWeek||[]).reduce((a,r)=>a+(r.calories||0),0)

    // Habits
    const habitsCompleted = (habits||[]).filter(h=>{
      const logs = (habitLogs||[]).filter(l=>l.habit_id===h.id)
      if (h.frequency==='weekly') return logs.length>0
      if (h.frequency==='xweek') return logs.length>=(h.freq_days_per_week||3)
      return logs.some(l=>l.date===today)
    }).length

    // Finance this month
    const income  = (transactions||[]).filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||0),0)
    const expense = (transactions||[]).filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||0),0)
    const balance = income - expense
    const savRate = income>0 ? Math.round((balance/income)*100) : null

    // Initiatives
    const activeInits = (initiatives||[]).filter(i=>['idea','researching','validating','active'].includes(i.status)).length
    const highPriInits = (initiatives||[]).filter(i=>i.priority===3&&['idea','researching','validating','active'].includes(i.status)).length

    setStats({
      tasks:     { pending, inProgress, total:(tasks||[]).length },
      training:  { streak, thisWeek:trainedThisWeek, lastBlock },
      nutrition: { ...nut, weekCal: Math.round(weekCal), weekAvg: Math.round(weekCal/7) },
      habits:    { done:habitsCompleted, total:(habits||[]).length },
      finance:   { income, expense, balance, savRate },
      initiatives: { active:activeInits, highPri:highPriInits },
    })
  }

  const hasData = stats && (stats.tasks.total>0||stats.training.streak>0||stats.nutrition.cal>0||stats.habits.total>0||stats.finance.income>0||stats.initiatives.active>0)

  // Decide which stat cards to show (only if have data)
  function getStatCards() {
    if (!stats) return []
    const cards = []

    // Tasks — show if any pending
    if (stats.tasks.pending>0||stats.tasks.inProgress>0)
      cards.push({ icon:CheckSquare, color:'#a99cf9', label:'Tareas pendientes', value:stats.tasks.pending, sub:stats.tasks.inProgress>0?`${stats.tasks.inProgress} en proceso`:`de ${stats.tasks.total} totales`, to:'/tasks' })

    // Training — show streak or this week
    if (stats.training.streak>0||stats.training.thisWeek>0)
      cards.push({ icon:Dumbbell, color:'#3ecf8e', label:stats.training.streak>0?'Racha de entreno':'Entrenos esta semana', value:stats.training.streak>0?`${stats.training.streak}🔥`:stats.training.thisWeek, sub:stats.training.lastBlock?`Último: ${stats.training.lastBlock}`:`${stats.training.thisWeek}/sem`, to:'/training' })

    // Nutrition — calories today if logged
    if (stats.nutrition.cal>0)
      cards.push({ icon:Flame, color:'#f4a94e', label:'Calorías hoy', value:`${fmt(stats.nutrition.cal)} kcal`, sub:`Prot ${Math.round(stats.nutrition.protein)}g · Media sem: ${fmt(stats.nutrition.weekAvg)} kcal`, to:'/nutrition' })

    // Finance — balance this month if any transactions
    if (stats.finance.income>0||stats.finance.expense>0)
      cards.push({ icon:stats.finance.balance>=0?TrendingUp:TrendingDown, color:stats.finance.balance>=0?'#3ecf8e':'#f16b6b', label:'Balance del mes', value:`${stats.finance.balance>=0?'+':''}${fmt(stats.finance.balance)}€`, sub:`↑${fmt(stats.finance.income)}€ ↓${fmt(stats.finance.expense)}€${stats.finance.savRate!==null?' · Ahorro '+stats.finance.savRate+'%':''}`, to:'/finance' })

    // Habits — show if any exist
    if (stats.habits.total>0)
      cards.push({ icon:BookOpen, color:'#f16b6b', label:'Hábitos esta semana', value:`${stats.habits.done}/${stats.habits.total}`, sub:stats.habits.done===stats.habits.total?'¡Todo completado! 🎯':'en camino', to:'/habits' })

    // Initiatives — show if any active high-priority
    if (stats.initiatives.active>0)
      cards.push({ icon:Rocket, color:'#a99cf9', label:'Iniciativas activas', value:stats.initiatives.active, sub:stats.initiatives.highPri>0?`${stats.initiatives.highPri} de alta prioridad`:'en progreso', to:'/initiatives' })

    return cards
  }

  const statCards = getStatCards()

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm capitalize" style={{ color:'var(--text-muted)' }}>{todayFmt}</p>
        <h1 className="text-3xl font-semibold text-white mt-1">Bienvenido de vuelta 👋</h1>
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CARDS.map(({ to, icon:Icon, label, color, bg, border, desc }) => (
          <Link key={to} to={to} className="rounded-2xl p-4 group transition-all hover:scale-[1.02]"
            style={{ background:bg, border:`1px solid ${border}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5" style={{ background:bg, border:`1px solid ${border}` }}>
              <Icon size={16} style={{ color }}/>
            </div>
            <h3 className="font-semibold text-white text-sm">{label}</h3>
            <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{desc}</p>
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
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>Resumen de hoy</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statCards.map((c,i) => <StatCard key={i} {...c}/>)}
          </div>
        </div>
      )}
    </div>
  )
}
