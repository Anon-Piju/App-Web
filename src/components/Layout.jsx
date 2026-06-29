import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { LayoutDashboard, CheckSquare, Dumbbell, UtensilsCrossed, BookOpen, CalendarDays, X, Menu, Layers, ChevronLeft, ChevronRight } from 'lucide-react'
import SettingsModal from './SettingsModal'
import { THEMES, applyTheme, loadTheme, saveTheme } from '../lib/theme'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',     colorKey: 'accent' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tareas',        colorKey: 'accent' },
  { to: '/training',  icon: Dumbbell,        label: 'Entrenamiento', colorKey: 'jade' },
  { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrición',     colorKey: 'amber' },
  { to: '/habits',    icon: BookOpen,        label: 'Hábitos',       colorKey: 'rose' },
  { to: '/planner',   icon: CalendarDays,    label: 'Planificador',  colorKey: 'sky' },
]

const MOBILE_NAV = [
  { to: '/tasks',     icon: CheckSquare,     label: 'Tareas',    colorKey: 'accent' },
  { to: '/training',  icon: Dumbbell,        label: 'Entreno',   colorKey: 'jade' },
  { to: '/',          icon: LayoutDashboard, label: 'Inicio',    colorKey: 'accent', center: true },
  { to: '/nutrition', icon: UtensilsCrossed, label: 'Nutrición', colorKey: 'amber' },
  { to: '/planner',   icon: CalendarDays,    label: 'Plan',      colorKey: 'sky' },
]

// Sheikah Eye SVG logo
function SheikahEye({ size = 28, accent = '#00c8ff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer diamond */}
      <path d="M14 2 L26 14 L14 26 L2 14 Z" stroke={accent} strokeWidth="1.2" fill="none" opacity="0.5" />
      {/* Eye outline */}
      <path d="M4 14 Q14 5 24 14 Q14 23 4 14 Z" stroke={accent} strokeWidth="1.4" fill="none" />
      {/* Pupil */}
      <circle cx="14" cy="14" r="3.5" fill={accent} opacity="0.9" />
      <circle cx="14" cy="14" r="1.5" fill="white" opacity="0.6" />
      {/* Tear drop */}
      <path d="M14 17.5 L14 22" stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      {/* Corner marks */}
      <path d="M14 2 L14 5" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M14 23 L14 26" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M2 14 L5 14" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M23 14 L26 14" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

function LogoButton({ appName, onClick, compact = false }) {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00c8ff'
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 group hover:opacity-85 transition-opacity text-left w-full">
      <div className="flex-shrink-0 rounded-xl flex items-center justify-center"
        style={{
          width: compact ? 28 : 36, height: compact ? 28 : 36,
          background: `radial-gradient(circle at 40% 40%, ${accent}30, transparent)`,
          border: `1px solid ${accent}40`,
          boxShadow: `0 0 16px ${accent}30`,
        }}>
        <SheikahEye size={compact ? 20 : 26} accent={accent} />
      </div>
      {!compact && (
        <div>
          <p className="font-semibold text-white text-sm leading-none tracking-wide">{appName}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Toca para personalizar</p>
        </div>
      )}
    </button>
  )
}

function SidebarContent({ appName, onLogoClick, onClose, isMobile }) {
  const location = useLocation()
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00c8ff'

  return (
    <>
      <div className="px-4 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <LogoButton appName={appName} onClick={onLogoClick} />
        {isMobile && (
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 transition-colors ml-2 flex-shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, colorKey }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          const color = `var(--${colorKey})`
          return (
            <NavLink key={to} to={to} onClick={onClose}
              className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} style={isActive ? { color } : {}} />
              <span className="flex-1 text-sm">{label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: accent, boxShadow: `0 0 6px ${accent}cc` }} />
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>v1.5.0 · local</p>
      </div>
    </>
  )
}

function BottomBar({ onLogoClick }) {
  const location = useLocation()
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      {MOBILE_NAV.map(({ to, icon: Icon, label, colorKey, center }) => {
        const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
        const color = `var(--${colorKey})`
        return (
          <NavLink key={to} to={to}
            className="flex-1 flex flex-col items-center justify-center transition-all"
            style={{ color: isActive ? color : 'rgba(255,255,255,0.32)', paddingTop: center ? 0 : 10, paddingBottom: center ? 0 : 8 }}>
            {center ? (
              <div className="mb-3 w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, var(--accent), var(--accent-dim))`
                    : 'linear-gradient(135deg, #2e2e3a, #222228)',
                  boxShadow: isActive ? `0 0 20px color-mix(in srgb, var(--accent) 50%, transparent)` : '0 4px 12px rgba(0,0,0,0.4)',
                  border: '2px solid rgba(255,255,255,0.1)',
                }}>
                <Icon size={22} color={isActive ? '#fff' : 'rgba(255,255,255,0.5)'} />
              </div>
            ) : (
              <>
                <Icon size={20} />
                <span style={{ fontSize: '9px', fontWeight: isActive ? 600 : 400, marginTop: 2 }}>{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const [isMobile, setIsMobile]           = useState(false)
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [settingsOpen, setSettingsOpen]   = useState(false)
  const [appName, setAppName]             = useState(() => localStorage.getItem('orbit_app_name') || 'Sheikah Slate')
  const [theme, setTheme]                 = useState(loadTheme)
  const closeTimer = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  // Apply theme on mount and change
  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { if (isMobile) setSidebarOpen(false) }, [location.pathname])

  function handleThemeChange(newTheme) {
    setTheme(newTheme)
    saveTheme(newTheme)
    applyTheme(newTheme)
  }

  function handleNameChange(name) {
    setAppName(name)
    localStorage.setItem('orbit_app_name', name)
    document.title = `${name} — Dashboard`
  }

  // Desktop hover
  function onEnter() { clearTimeout(closeTimer.current); setSidebarOpen(true) }
  function onLeave() { closeTimer.current = setTimeout(() => setSidebarOpen(false), 180) }

  // Mobile swipe
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (!touchStartX.current) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (dx > 70 && dy < 80 && touchStartX.current < 30) setSidebarOpen(true)
    touchStartX.current = null
  }

  const isPlanner = location.pathname === '/planner'
  const accent = theme.accent

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}>

      {/* Settings modal */}
      {settingsOpen && (
        <SettingsModal
          currentTheme={theme}
          appName={appName}
          onThemeChange={handleThemeChange}
          onNameChange={handleNameChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <>
          <div onMouseEnter={onEnter}
            className="fixed left-0 top-0 bottom-0 z-50"
            style={{ width: '6px', cursor: 'default' }} />
          <div onMouseEnter={onEnter} onMouseLeave={onLeave}
            className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: '230px',
              background: 'var(--surface1)',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-230px)',
              transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: sidebarOpen ? '6px 0 40px rgba(0,0,0,0.6)' : 'none',
            }}>
            <SidebarContent appName={appName} onLogoClick={() => setSettingsOpen(true)} onClose={() => {}} isMobile={false} />
          </div>
          <div className="fixed left-0 top-0 bottom-0 z-40 pointer-events-none"
            style={{
              width: '3px',
              background: `linear-gradient(to bottom, transparent, ${accent}60, transparent)`,
              opacity: sidebarOpen ? 0 : 1,
              transition: 'opacity 0.2s ease',
            }} />
        </>
      )}

      {/* Mobile drawer */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}
      {isMobile && (
        <div className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
          style={{
            width: '260px',
            background: 'var(--surface1)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
            transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: sidebarOpen ? '6px 0 40px rgba(0,0,0,0.6)' : 'none',
          }}>
          <SidebarContent appName={appName} onLogoClick={() => { setSidebarOpen(false); setSettingsOpen(true) }}
            onClose={() => setSidebarOpen(false)} isMobile={true} />
        </div>
      )}

      {/* Main */}
      <div className={`flex-1 flex flex-col ${isPlanner ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ paddingBottom: isMobile && !isPlanner ? '70px' : 0 }}>

        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setSidebarOpen(true)} className="btn-ghost px-2 py-1.5"><Menu size={20} /></button>
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2">
              <SheikahEye size={22} accent={accent} />
              <span className="text-white text-sm font-semibold">{appName}</span>
            </button>
            <div className="w-8" />
          </div>
        )}

        <div className={`fade-up flex-1 min-h-0 ${
          isPlanner ? 'flex flex-col overflow-hidden px-4 py-4'
          : isMobile ? 'px-4 py-4'
          : 'px-10 py-8 max-w-4xl mx-auto w-full'
        }`}>
          <Outlet />
        </div>

        {isMobile && !isPlanner && <div style={{ height: '70px', flexShrink: 0 }} />}
      </div>

      {isMobile && <BottomBar onLogoClick={() => setSettingsOpen(true)} />}
    </div>
  )
}
