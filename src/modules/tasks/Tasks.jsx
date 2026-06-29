import { useState, useEffect, useRef } from 'react'
import { Plus, X, ChevronDown, GripVertical, Trash2, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Only 3 statuses in the dropdown — Discarded is handled separately via X
const ACTIVE_STATUSES = [
  { value: 'pending',  label: 'Pendiente',  cls: 'status-pending'  },
  { value: 'progress', label: 'En proceso', cls: 'status-progress' },
  { value: 'done',     label: 'Hecho',      cls: 'status-done'     },
]

const ALL_STATUSES = [
  ...ACTIVE_STATUSES,
  { value: 'discarded', label: 'Desechado', cls: 'status-discarded' },
]

function StatusBadge({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const current = ALL_STATUSES.find(s => s.value === value) || ACTIVE_STATUSES[0]

  useEffect(() => {
    function h(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Don't render a clickable badge for discarded — handled in trash view
  if (value === 'discarded') {
    return <span className="status-discarded">Desechado</span>
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={`${current.cls} cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}>
        {current.label} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-7 right-0 z-20 rounded-xl p-1 w-36 space-y-0.5 shadow-xl"
          style={{ background: 'var(--surface1)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {ACTIVE_STATUSES.map(s => (
            <button key={s.value} onClick={() => { onChange(s.value); setOpen(false) }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 transition-colors"
              style={{ background: s.value === value ? 'rgba(255,255,255,0.06)' : '' }}>
              <span className={s.cls}>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Trash / Discarded view ────────────────────────────────────
function TrashView({ tasks, onRestore, onDeletePermanently, onDeleteAll }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-3xl">🗑️</p>
        <p className="muted">La papelera está vacía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Bulk action */}
      <div className="flex items-center justify-between">
        <p className="muted text-xs">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en la papelera</p>
        <button onClick={onDeleteAll}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--rose)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)' }}>
          <Trash2 size={12} /> Vaciar papelera
        </button>
      </div>

      {tasks.map(task => (
        <div key={task.id} className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'var(--surface1)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.7 }}>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-medium text-zinc-500 line-through">{task.title}</p>
            {task.description && (
              <p className="text-xs text-zinc-700 mt-0.5 truncate">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Restore */}
            <button onClick={() => onRestore(task)}
              title="Restaurar tarea"
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all"
              style={{ color: 'var(--jade)', background: 'color-mix(in srgb, var(--jade) 10%, transparent)' }}>
              <RotateCcw size={12} /> Restaurar
            </button>
            {/* Delete permanently */}
            <button onClick={() => onDeletePermanently(task.id)}
              title="Eliminar permanentemente"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--rose)', background: 'color-mix(in srgb, var(--rose) 8%, transparent)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Tasks ────────────────────────────────────────────────
export default function Tasks() {
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc]   = useState('')
  const titleRef = useRef()
  const dragItem = useRef(null)
  const dragOver = useRef(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { loadTasks() }, [])
  useEffect(() => { if (showForm) titleRef.current?.focus() }, [showForm])

  async function loadTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks').select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  async function addTask() {
    if (!newTitle.trim()) return
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order || 0)) : 0
    const { data } = await supabase
      .from('tasks')
      .insert([{ title: newTitle.trim(), description: newDesc.trim(), status: 'pending', sort_order: maxOrder + 1 }])
      .select().single()
    if (data) { setTasks(prev => [data, ...prev]); setNewTitle(''); setNewDesc(''); setShowForm(false) }
  }

  async function updateStatus(id, status) {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t))
  }

  // X button → discard (not delete)
  async function discardTask(id) {
    await supabase.from('tasks').update({ status: 'discarded', updated_at: new Date().toISOString() }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'discarded' } : t))
  }

  // Restore from trash → back to pending
  async function restoreTask(task) {
    const restoredStatus = 'pending'
    await supabase.from('tasks').update({ status: restoredStatus, updated_at: new Date().toISOString() }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: restoredStatus } : t))
    setFilter('all') // jump back to active view so they see it
  }

  // Permanent delete
  async function deletePermanently(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // Empty trash
  async function deleteAll() {
    const trashIds = tasks.filter(t => t.status === 'discarded').map(t => t.id)
    if (trashIds.length === 0) return
    await supabase.from('tasks').delete().in('id', trashIds)
    setTasks(prev => prev.filter(t => t.status !== 'discarded'))
  }

  // ── Drag to reorder ──
  function onDragStart(e, index) { dragItem.current = index; e.dataTransfer.effectAllowed = 'move' }
  function onDragEnter(index) { dragOver.current = index }

  async function onDragEnd() {
    const from = dragItem.current
    const to   = dragOver.current
    if (from === null || to === null || from === to) { dragItem.current = null; dragOver.current = null; return }

    const reordered = [...activeFiltered]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const updated = reordered.map((t, i) => ({ ...t, sort_order: i + 1 }))

    setTasks(prev => {
      const activeIds = new Set(activeFiltered.map(t => t.id))
      return [...updated, ...prev.filter(t => !activeIds.has(t.id))]
    })
    dragItem.current = null
    dragOver.current = null
    await Promise.all(updated.map(t => supabase.from('tasks').update({ sort_order: t.sort_order }).eq('id', t.id)))
  }

  // ── Sorting: done/discarded sink to bottom ──
  function sortActive(list) {
    const active = list.filter(t => t.status !== 'done')
    const done   = list.filter(t => t.status === 'done')
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    return [...active, ...done]
  }

  const activeTasks   = tasks.filter(t => t.status !== 'discarded')
  const discardedTasks = tasks.filter(t => t.status === 'discarded')

  const activeFiltered = sortActive(
    filter === 'all' ? activeTasks : activeTasks.filter(t => t.status === filter)
  )

  const counts = ACTIVE_STATUSES.reduce((acc, s) => {
    acc[s.value] = activeTasks.filter(t => t.status === s.value).length
    return acc
  }, {})

  const isTrashView = filter === 'discarded'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Tareas</h1>
          <p className="muted mt-0.5">{activeTasks.length} tareas activas</p>
        </div>
        {!isTrashView && (
          <button onClick={() => setShowForm(v => !v)}
            className={`btn-primary ${showForm ? '!bg-white/10 !shadow-none !text-zinc-300' : ''}`}>
            {showForm ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> Nueva tarea</>}
          </button>
        )}
      </div>

      {/* Collapsible form */}
      <div className={`overflow-hidden transition-all duration-300 ${showForm && !isTrashView ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="card space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 25%, transparent)' }}>
          <input ref={titleRef} className="input" placeholder="Título de la tarea..."
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()} />
          <input className="input" placeholder="Descripción (opcional)..."
            value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={addTask} className="btn-primary"><Plus size={15} /> Añadir</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`btn text-sm py-1 ${filter === 'all' ? 'bg-white/10 text-white' : 'btn-ghost'}`}>
          Todas <span className="ml-1 text-xs opacity-50">{activeTasks.length}</span>
        </button>
        {ACTIVE_STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={`btn text-sm py-1 ${filter === s.value ? 'bg-white/10 text-white' : 'btn-ghost'}`}>
            {s.label} <span className="ml-1 text-xs opacity-50">{counts[s.value]}</span>
          </button>
        ))}
        {/* Trash tab */}
        <button onClick={() => setFilter('discarded')}
          className={`btn text-sm py-1 ml-auto ${filter === 'discarded' ? 'text-rose bg-rose/10' : 'btn-ghost'}`}
          style={{ color: filter === 'discarded' ? 'var(--rose)' : '' }}>
          🗑️ Papelera
          {discardedTasks.length > 0 && (
            <span className="ml-1 text-xs rounded-full px-1.5 py-0.5"
              style={{ background: 'color-mix(in srgb, var(--rose) 20%, transparent)', color: 'var(--rose)' }}>
              {discardedTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="muted text-center py-12">Cargando...</p>
      ) : isTrashView ? (
        <TrashView
          tasks={discardedTasks}
          onRestore={restoreTask}
          onDeletePermanently={deletePermanently}
          onDeleteAll={deleteAll}
        />
      ) : activeFiltered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">✓</p>
          <p className="muted">No hay tareas en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeFiltered.map((task, index) => (
            <div key={task.id}
              draggable
              onDragStart={e => onDragStart(e, index)}
              onDragEnter={() => onDragEnter(index)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              onDoubleClick={() => setExpanded(prev => prev === task.id ? null : task.id)}
              className="group flex items-start gap-3 px-4 py-3 rounded-2xl transition-all duration-200 cursor-default"
              style={{
                background: expanded === task.id ? 'color-mix(in srgb, var(--surface2) 80%, var(--accent) 5%)' : 'var(--surface1)',
                border: `1px solid ${
                  expanded === task.id       ? 'color-mix(in srgb, var(--accent) 25%, transparent)'  :
                  task.status === 'done'     ? 'color-mix(in srgb, var(--jade) 15%, transparent)' :
                  task.status === 'progress' ? 'color-mix(in srgb, var(--sky) 15%, transparent)'  :
                  'rgba(255,255,255,0.07)'
                }`,
              }}>

              {/* Grip */}
              <GripVertical size={15}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing transition-colors mt-1"
                style={{ color: 'rgba(255,255,255,0.15)' }} />

              {/* Status dot */}
              <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{
                  background:
                    task.status === 'done'     ? 'var(--jade)'  :
                    task.status === 'progress' ? 'var(--sky)'   :
                    'rgba(255,255,255,0.2)',
                }} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug"
                  style={{ color: task.status === 'done' ? 'rgba(255,255,255,0.3)' : 'var(--text)',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                  {task.title}
                </p>
                {task.description && (
                  expanded === task.id ? (
                    <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap"
                      style={{ color: 'var(--text-muted)' }}>
                      {task.description}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                      {task.description}
                    </p>
                  )
                )}

              </div>

              {/* Status badge (no discard option) */}
              <StatusBadge value={task.status} onChange={val => updateStatus(task.id, val)} />

              {/* X → discard */}
              <button
                onClick={() => discardTask(task.id)}
                title="Mover a papelera"
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--rose)'}
                onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
