import { CheckSquare, Dumbbell, UtensilsCrossed, BookOpen, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/tasks',
    icon: CheckSquare,
    label: 'Tareas',
    color: '#a99cf9',
    bg: 'rgba(169,156,249,0.12)',
    border: 'rgba(169,156,249,0.2)',
    desc: 'Gestiona tu lista de pendientes',
  },
  {
    to: '/training',
    icon: Dumbbell,
    label: 'Entrenamiento',
    color: '#3ecf8e',
    bg: 'rgba(62,207,142,0.12)',
    border: 'rgba(62,207,142,0.2)',
    desc: 'Registra tus sesiones y progreso',
  },
  {
    to: '/nutrition',
    icon: UtensilsCrossed,
    label: 'Nutrición',
    color: '#f4a94e',
    bg: 'rgba(244,169,78,0.12)',
    border: 'rgba(244,169,78,0.2)',
    desc: 'Trackea comidas y calorías',
  },
  {
    to: '/habits',
    icon: BookOpen,
    label: 'Hábitos',
    color: '#f16b6b',
    bg: 'rgba(241,107,107,0.12)',
    border: 'rgba(241,107,107,0.2)',
    desc: 'Objetivos y seguimiento diario',
  },
  {
    to: '/planner',
    icon: CalendarDays,
    label: 'Planificador',
    color: '#5aafee',
    bg: 'rgba(90,175,238,0.12)',
    border: 'rgba(90,175,238,0.2)',
    desc: 'Organiza tu tiempo en bloques',
  },
]

export default function Dashboard() {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="space-y-8">
      <div>
        <p className="text-zinc-500 text-sm capitalize">{today}</p>
        <h1 className="text-3xl font-semibold text-white mt-1">Bienvenido de vuelta 👋</h1>
        <p className="text-zinc-500 mt-1">¿Qué quieres hacer hoy?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(({ to, icon: Icon, label, color, bg, border, desc }) => (
          <Link key={to} to={to}
            className="rounded-2xl p-5 group transition-all hover:scale-[1.02]"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${bg}`, border: `1px solid ${border}` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <h3 className="font-semibold text-white text-sm group-hover:opacity-90 transition-opacity">
              {label}
            </h3>
            <p className="text-zinc-500 text-xs mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <p className="muted text-center py-4">
          Las estadísticas del resumen aparecerán aquí una vez empieces a registrar datos.
        </p>
      </div>
    </div>
  )
}
