import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { LayoutDashboard, CheckSquare, Dumbbell, UtensilsCrossed, BookOpen, CalendarDays, X, Menu, Rocket, TrendingUp, Heart, ChevronDown } from 'lucide-react'
import SettingsModal from './SettingsModal'
import { applyTheme, loadTheme, saveTheme } from '../lib/theme'

// ── Nav structure ─────────────────────────────────────────────
const NAV_GROUPS = [
  {
    single: true,
    to: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    colorKey: 'accent',
  },
  {
    single: true,
    to: '/tasks',
    icon: CheckSquare,
    label: 'Tareas',
    colorKey: 'accent',
  },
  {
    group: true,
    label: 'Salud',
    icon: Heart,
    colorKey: 'rose',
    basePath: '/health',
    items: [
      { to: '/training',  icon: Dumbbell,        label: 'Entrenamiento', colorKey: 'jade' },
      { to: '/nutrition', icon: UtensilsCrossed,  label: 'Nutrición',     colorKey: 'amber' },
      { to: '/habits',    icon: BookOpen,         label: 'Hábitos',       colorKey: 'rose' },
    ],
  },
  {
    single: true,
    to: '/planner',
    icon: CalendarDays,
    label: 'Planificador',
    colorKey: 'sky',
  },
  {
    single: true,
    to: '/initiatives',
    icon: Rocket,
    label: 'Iniciativas',
    colorKey: 'accent',
  },
  {
    single: true,
    to: '/finance',
    icon: TrendingUp,
    label: 'Finanzas',
    colorKey: 'jade',
  },
]

// All group paths for "is inside a group" check
const GROUP_PATHS = NAV_GROUPS
  .filter(g => g.group)
  .flatMap(g => g.items.map(i => i.to))

function isInGroup(pathname) {
  return GROUP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function getGroupForPath(pathname) {
  return NAV_GROUPS.find(g => g.group && g.items.some(i => pathname === i.to || pathname.startsWith(i.to + '/')))
}

// ── Sheikah Eye ───────────────────────────────────────────────
function SheikahEye({ size = 28, accent = '#00c8ff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M14 2 L26 14 L14 26 L2 14 Z" stroke={accent} strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d="M4 14 Q14 5 24 14 Q14 23 4 14 Z" stroke={accent} strokeWidth="1.4" fill="none" />
      <circle cx="14" cy="14" r="3.5" fill={accent} opacity="0.9" />
      <circle cx="14" cy="14" r="1.5" fill="white" opacity="0.6" />
      <path d="M14 17.5 L14 22" stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <path d="M14 2 L14 5" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M14 23 L14 26" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M2 14 L5 14" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M23 14 L26 14" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

// ── Logo / back button ────────────────────────────────────────
function LogoButton({ isHome, accent, appName, onHomeClick }) {
  return (
    <button onClick={onHomeClick}
      className="flex items-center gap-3 hover:opacity-85 transition-opacity text-left flex-1 min-w-0">
      <div className="flex-shrink-0 rounded-xl flex items-center justify-center"
        style={{ width: 36, height: 36, background: `radial-gradient(circle at 40% 40%, ${accent}30, transparent)`, border: `1px solid ${accent}40`, boxShadow: `0 0 16px ${accent}30` }}>
        <SheikahEye size={26} accent={accent} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-white text-sm leading-none tracking-wide truncate">{appName}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {isHome ? 'Ajustes' : '← Volver al inicio'}
        </p>
      </div>
    </button>
  )
}

// ── Sidebar nav item ──────────────────────────────────────────
function NavItem({ to, icon: Icon, label, colorKey, onClick }) {
  const location = useLocation()
  const isActive = to === '/' ? location.pathname === '/' : location.pathname === to
  const color = `var(--${colorKey})`
  return (
    <NavLink to={to} onClick={onClick}
      className={`nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={16} style={isActive ? { color } : {}} />
      <span className="flex-1 text-sm">{label}</span>
    </NavLink>
  )
}

// ── Group nav item (collapsible) ──────────────────────────────
function GroupNavItem({ group, onItemClick, accent }) {
  const location = useLocation()
  const isGroupActive = group.items.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'))
  const [open, setOpen] = useState(isGroupActive)
  const color = `var(--${group.colorKey})`

  useEffect(() => { if (isGroupActive) setOpen(true) }, [isGroupActive])

  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className={`nav-item w-full ${isGroupActive ? 'active' : ''}`}
        style={isGroupActive ? { color: `var(--${group.colorKey})` } : {}}>
        <group.icon size={16} style={isGroupActive ? { color } : {}} />
        <span className="flex-1 text-sm text-left">{group.label}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {group.items.map(item => (
            <NavItem key={item.to} {...item} onClick={onItemClick} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sidebar content ───────────────────────────────────────────
function SidebarContent({ appName, onLogoClick, onClose, isMobile, accent }) {
  return (
    <>
      <div className="px-4 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <LogoButton appName={appName} accent={accent} onHomeClick={onLogoClick} />
        {isMobile && <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 ml-2 flex-shrink-0"><X size={18}/></button>}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_GROUPS.map((item, i) =>
          item.single ? (
            <NavItem key={item.to} {...item} onClick={onClose} />
          ) : (
            <GroupNavItem key={i} group={item} onItemClick={onClose} accent={accent} />
          )
        )}
      </nav>
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>v1.8.0 · local</p>
      </div>
    </>
  )
}

// ── Mobile bottom bar ─────────────────────────────────────────
const MOBILE_NAV = [
  { to: '/tasks',     icon: CheckSquare,     label: 'Tareas',    colorKey: 'accent' },
  { to: '/training',  icon: Dumbbell,        label: 'Salud',     colorKey: 'jade'   },
  { to: '/',          icon: LayoutDashboard, label: 'Inicio',    colorKey: 'accent', center: true },
  { to: '/finance',   icon: TrendingUp,      label: 'Finanzas',  colorKey: 'jade'   },
  { to: '/planner',   icon: CalendarDays,    label: 'Plan',      colorKey: 'sky'    },
]

function BottomBar() {
  const location = useLocation()
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {MOBILE_NAV.map(({ to, icon: Icon, label, colorKey, center }) => {
        const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
        const color = `var(--${colorKey})`
        return (
          <NavLink key={to} to={to} className="flex-1 flex flex-col items-center justify-center transition-all"
            style={{ color: isActive ? color : 'rgba(255,255,255,0.32)', paddingTop: center ? 0 : 10, paddingBottom: center ? 0 : 8 }}>
            {center ? (
              <div className="mb-3 w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: isActive ? 'linear-gradient(135deg, var(--accent), var(--accent-dim))' : 'linear-gradient(135deg, #2e2e3a, #222228)', boxShadow: isActive ? '0 0 20px color-mix(in srgb, var(--accent) 50%, transparent)' : '0 4px 12px rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.1)' }}>
                <Icon size={22} color={isActive ? '#fff' : 'rgba(255,255,255,0.5)'} />
              </div>
            ) : (
              <><Icon size={20} /><span style={{ fontSize: '9px', fontWeight: isActive ? 600 : 400, marginTop: 2 }}>{label}</span></>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}

// ── Main Layout ───────────────────────────────────────────────
export default function Layout() {
  const location   = useLocation()
  const navigate   = useNavigate()
  const [isMobile, setIsMobile]         = useState(false)
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appName, setAppName]           = useState(() => localStorage.getItem('orbit_app_name') || 'Sheikah Slate')
  const [theme, setTheme]               = useState(loadTheme)
  const closeTimer = useRef(null)
  const touchStartX = useRef(null)

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => { if (isMobile) setSidebarOpen(false) }, [location.pathname])

  function handleThemeChange(t) { setTheme(t); saveTheme(t); applyTheme(t) }
  function handleNameChange(n)  { setAppName(n); localStorage.setItem('orbit_app_name', n); document.title = `${n} — Dashboard` }
  function onEnter() { clearTimeout(closeTimer.current); setSidebarOpen(true) }
  function onLeave() { closeTimer.current = setTimeout(() => setSidebarOpen(false), 180) }
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (!touchStartX.current) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx > 70 && touchStartX.current < 30) setSidebarOpen(true)
    touchStartX.current = null
  }

  const isHome = location.pathname === '/'
  const isPlanner = location.pathname === '/planner'
  const accent = theme.accent

  // Logo click: home → settings, elsewhere → go home
  function handleLogoClick() {
    if (isHome) setSettingsOpen(true)
    else navigate('/')
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}>

      {settingsOpen && (
        <SettingsModal currentTheme={theme} appName={appName}
          onThemeChange={handleThemeChange} onNameChange={handleNameChange}
          onClose={() => setSettingsOpen(false)} />
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <>
          <div onMouseEnter={onEnter} className="fixed left-0 top-0 bottom-0 z-50" style={{ width: '6px' }} />
          <div onMouseEnter={onEnter} onMouseLeave={onLeave} className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
            style={{ width: '230px', background: 'var(--surface1)', borderRight: '1px solid rgba(255,255,255,0.07)', transform: sidebarOpen ? 'translateX(0)' : 'translateX(-230px)', transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)', boxShadow: sidebarOpen ? '6px 0 40px rgba(0,0,0,0.6)' : 'none' }}>
            <SidebarContent appName={appName} onLogoClick={handleLogoClick} onClose={() => {}} isMobile={false} accent={accent} />
          </div>
          <div className="fixed left-0 top-0 bottom-0 z-40 pointer-events-none"
            style={{ width: '3px', background: `linear-gradient(to bottom, transparent, ${accent}60, transparent)`, opacity: sidebarOpen ? 0 : 1, transition: 'opacity 0.2s ease' }} />
        </>
      )}

      {/* Mobile sidebar */}
      {isMobile && sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
      {isMobile && (
        <div className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
          style={{ width: '260px', background: 'var(--surface1)', borderRight: '1px solid rgba(255,255,255,0.07)', transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)', transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)', boxShadow: sidebarOpen ? '6px 0 40px rgba(0,0,0,0.6)' : 'none' }}>
          <SidebarContent appName={appName} onLogoClick={() => { setSidebarOpen(false); handleLogoClick() }} onClose={() => setSidebarOpen(false)} isMobile={true} accent={accent} />
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col ${isPlanner ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ paddingBottom: isMobile && !isPlanner ? '70px' : 0 }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setSidebarOpen(true)} className="btn-ghost px-2 py-1.5"><Menu size={20} /></button>
            <button onClick={handleLogoClick} className="flex items-center gap-2">
              <SheikahEye size={22} accent={accent} />
              <span className="text-white text-sm font-semibold">{appName}</span>
            </button>
            <div className="w-8" />
          </div>
        )}

        <div className={`fade-up flex-1 min-h-0 ${isPlanner ? 'flex flex-col overflow-hidden px-4 py-4' : isMobile ? 'px-4 py-4' : 'px-10 py-8 max-w-4xl mx-auto w-full'}`}>
          <Outlet />
        </div>
        {isMobile && !isPlanner && <div style={{ height: '70px', flexShrink: 0 }} />}
      </div>

      {isMobile && <BottomBar />}
    </div>
  )
}
