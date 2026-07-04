import { useState, useEffect, useRef } from 'react'
import { Plus, X, Search, ChevronDown, Edit2, Trash2, Check, GripVertical, LayoutGrid, List, Archive, Star } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

// ── Constants ─────────────────────────────────────────────────
const STATUSES = [
  { value: 'idea',        label: 'Idea',         color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  { value: 'researching', label: 'Investigando', color: '#5aafee', bg: 'rgba(90,175,238,0.12)'  },
  { value: 'validating',  label: 'Validando',    color: '#a99cf9', bg: 'rgba(169,156,249,0.12)' },
  { value: 'active',      label: 'En marcha',    color: '#3ecf8e', bg: 'rgba(62,207,142,0.12)'  },
  { value: 'paused',      label: 'Pausado',      color: '#f4a94e', bg: 'rgba(244,169,78,0.12)'  },
  { value: 'discarded',   label: 'Descartado',   color: '#f16b6b', bg: 'rgba(241,107,107,0.10)' },
  { value: 'completed',   label: 'Completado',   color: '#00c896', bg: 'rgba(0,200,150,0.12)'   },
]

const PRIORITIES = [
  { value: 3, label: 'Alta',  color: '#f16b6b' },
  { value: 2, label: 'Media', color: '#f4a94e' },
  { value: 1, label: 'Baja',  color: '#9ca3af' },
]

const RISKS    = ['Bajo', 'Medio', 'Alto']
const IMPACTS  = ['Bajo', 'Medio', 'Alto']

function st(v)  { return STATUSES.find(s => s.value === v) || STATUSES[0] }
function pri(v) { return PRIORITIES.find(p => p.value === v) || PRIORITIES[1] }

// ── Score chip ────────────────────────────────────────────────
// Impact × Priority / Risk → visual decision helper
function ScoreChip({ impact, priority, risk }) {
  const impactN  = { Bajo: 1, Medio: 2, Alto: 3 }[impact]  || 2
  const riskN    = { Bajo: 1, Medio: 2, Alto: 3 }[risk]    || 2
  const score = Math.round(((impactN * (priority || 2)) / riskN) * 10) / 10

  const color = score >= 4 ? '#3ecf8e' : score >= 2 ? '#f4a94e' : '#f16b6b'
  return (
    <div title={`Puntuación: Impacto(${impactN}) × Prioridad(${priority||2}) / Riesgo(${riskN}) = ${score}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        background: `${color}18`, border: `1px solid ${color}40`,
        borderRadius: '8px', padding: '2px 7px', fontSize: '11px',
      }}>
      <Star size={9} style={{ color, fill: color }} />
      <span style={{ color, fontWeight: 700 }}>{score}</span>
    </div>
  )
}

// ── Status badge (clickable dropdown) ─────────────────────────
function StatusBadge({ value, onChange, small }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const s = st(value)

  useEffect(() => {
    function h(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
        style={{ background: s.bg, color: s.color }}>
        {s.label} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-30 rounded-xl p-1 w-40 shadow-xl space-y-0.5"
          style={{ background: 'var(--surface1)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {STATUSES.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
              style={{ color: opt.value === value ? opt.color : 'rgba(255,255,255,0.6)' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Initiative form (create / edit) ───────────────────────────
const EMPTY = {
  title: '', description: '', status: 'idea', priority: 2,
  estimated_cost: '', estimated_time: '', risk: 'Medio', impact: 'Medio',
  success_criteria: '', pause_reason: '', notes: '',
}

function InitiativeForm({ initial, onSave, onCancel }) {
  const [form, setForm]     = useState(initial || EMPTY)
  const [advanced, setAdv]  = useState(!!(initial?.estimated_cost || initial?.risk || initial?.impact || initial?.success_criteria))
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  async function submit() {
    if (!form.title.trim()) return
    await onSave({ ...form, title: form.title.trim() })
  }

  const s = st(form.status)

  return (
    <div className="card space-y-4" style={{ borderColor: `${s.color}35` }}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{initial ? 'Editar iniciativa' : 'Nueva iniciativa'}</h3>
        <button onClick={onCancel}><X size={16} className="text-zinc-500" /></button>
      </div>

      {/* Core fields */}
      <input className="input text-base font-medium" placeholder="Título de la iniciativa..."
        value={form.title} onChange={e => f('title', e.target.value)} />

      <textarea className="input resize-none" rows={3} placeholder="Descripción — ¿qué es y por qué vale la pena?"
        value={form.description} onChange={e => f('description', e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Estado</label>
          <select className="select" value={form.status} onChange={e => f('status', e.target.value)}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Prioridad</label>
          <select className="select" value={form.priority} onChange={e => f('priority', parseInt(e.target.value))}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Advanced toggle */}
      <button onClick={() => setAdv(v => !v)}
        className="text-xs flex items-center gap-1.5 transition-colors"
        style={{ color: advanced ? 'var(--accent-bright)' : 'var(--text-muted)' }}>
        <ChevronDown size={13} style={{ transform: advanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        {advanced ? 'Ocultar campos opcionales' : 'Añadir detalles (coste, riesgo, impacto...)'}
      </button>

      {advanced && (
        <div className="space-y-3 pt-1 border-t border-white/5">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Riesgo</label>
              <select className="select" value={form.risk} onChange={e => f('risk', e.target.value)}>
                {RISKS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Impacto</label>
              <select className="select" value={form.impact} onChange={e => f('impact', e.target.value)}>
                {IMPACTS.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select className="select" value={form.priority} onChange={e => f('priority', parseInt(e.target.value))}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Coste estimado</label>
              <input className="input" placeholder="ej: 200€ / mes" value={form.estimated_cost}
                onChange={e => f('estimated_cost', e.target.value)} />
            </div>
            <div>
              <label className="label">Tiempo estimado</label>
              <input className="input" placeholder="ej: 3 meses" value={form.estimated_time}
                onChange={e => f('estimated_time', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Criterios de éxito</label>
            <textarea className="input resize-none" rows={2}
              placeholder="¿Cómo sabré que esta iniciativa ha funcionado?"
              value={form.success_criteria} onChange={e => f('success_criteria', e.target.value)} />
          </div>

          {(form.status === 'paused' || form.status === 'discarded') && (
            <div>
              <label className="label">Motivo de {form.status === 'paused' ? 'pausa' : 'descarte'}</label>
              <textarea className="input resize-none" rows={2}
                placeholder="¿Por qué pausas o descartas esta iniciativa?"
                value={form.pause_reason} onChange={e => f('pause_reason', e.target.value)} />
            </div>
          )}

          <div>
            <label className="label">Notas</label>
            <textarea className="input resize-none" rows={2} placeholder="Ideas, enlaces, referencias..."
              value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={submit} className="btn-primary"><Check size={15} /> {initial ? 'Guardar cambios' : 'Crear iniciativa'}</button>
        <button onClick={onCancel} className="btn-ghost">Cancelar</button>
      </div>
    </div>
  )
}

// ── Initiative card (list view) ───────────────────────────────
function InitiativeCard({ initiative, index, onEdit, onDelete, onStatusChange, onDragStart, onDragEnter, onDragEnd }) {
  const [expanded, setExpanded] = useState(false)
  const s   = st(initiative.status)
  const p   = pri(initiative.priority)
  const hasExtra = initiative.estimated_cost || initiative.estimated_time || initiative.risk || initiative.impact

  return (
    <div draggable
      onDragStart={e => onDragStart(e, index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      className="card group transition-all cursor-default"
      style={{ borderColor: expanded ? `${s.color}35` : 'rgba(255,255,255,0.07)' }}>

      <div className="flex items-start gap-3">
        {/* Drag grip */}
        <GripVertical size={15} className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing"
          style={{ color: 'rgba(255,255,255,0.15)' }} />

        {/* Priority dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: p.color }} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <button onClick={() => setExpanded(v => !v)}
              className="font-semibold text-white text-sm text-left hover:opacity-80 transition-opacity flex-1 min-w-0">
              {initiative.title}
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasExtra && <ScoreChip impact={initiative.impact} priority={initiative.priority} risk={initiative.risk} />}
              <StatusBadge value={initiative.status} onChange={v => onStatusChange(initiative.id, v)} />
            </div>
          </div>

          {initiative.description && !expanded && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
              {initiative.description}
            </p>
          )}

          {expanded && (
            <div className="mt-3 space-y-3">
              {initiative.description && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {initiative.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {initiative.estimated_cost && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Coste: </span><span className="text-white">{initiative.estimated_cost}</span></div>
                )}
                {initiative.estimated_time && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Tiempo: </span><span className="text-white">{initiative.estimated_time}</span></div>
                )}
                {initiative.risk && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Riesgo: </span><span className="text-white">{initiative.risk}</span></div>
                )}
                {initiative.impact && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Impacto: </span><span className="text-white">{initiative.impact}</span></div>
                )}
              </div>
              {initiative.success_criteria && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Criterios de éxito</p>
                  <p className="text-xs text-white">{initiative.success_criteria}</p>
                </div>
              )}
              {initiative.pause_reason && (
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(241,107,107,0.08)', border: '1px solid rgba(241,107,107,0.2)' }}>
                  <p className="text-xs" style={{ color: 'var(--rose)' }}>
                    <span className="font-medium">Motivo: </span>{initiative.pause_reason}
                  </p>
                </div>
              )}
              {initiative.notes && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notas</p>
                  <p className="text-xs text-white whitespace-pre-wrap">{initiative.notes}</p>
                </div>
              )}
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Creado {format(new Date(initiative.created_at), "d MMM yyyy", { locale: es })}
                {initiative.updated_at && initiative.updated_at !== initiative.created_at &&
                  ` · Actualizado ${format(new Date(initiative.updated_at), "d MMM", { locale: es })}`}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
          <button onClick={() => onEdit(initiative)} className="btn-ghost p-1.5"><Edit2 size={13} /></button>
          <button onClick={() => onDelete(initiative.id)} className="btn-ghost p-1.5 hover:text-rose"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

// ── Kanban view ───────────────────────────────────────────────
function KanbanView({ initiatives, onStatusChange, onEdit, onDelete }) {
  const cols = STATUSES.filter(s => s.value !== 'discarded' && s.value !== 'completed')
  const archived = STATUSES.filter(s => s.value === 'discarded' || s.value === 'completed')

  function onDrop(e, targetStatus) {
    e.preventDefault()
    const id = e.dataTransfer.getData('initId')
    if (id) onStatusChange(id, targetStatus)
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: `${cols.length * 220}px` }}>
          {cols.map(col => {
            const items = initiatives.filter(i => i.status === col.value)
            return (
              <div key={col.value}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, col.value)}
                className="flex flex-col gap-2 rounded-2xl p-3 flex-shrink-0"
                style={{ width: '220px', background: `${col.color}08`, border: `1px solid ${col.color}20` }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: col.color }}>{col.label}</p>
                  <span className="text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                    style={{ background: `${col.color}20`, color: col.color }}>{items.length}</span>
                </div>
                {items.map(init => {
                  const p = pri(init.priority)
                  return (
                    <div key={init.id} draggable
                      onDragStart={e => e.dataTransfer.setData('initId', init.id)}
                      className="rounded-xl p-3 cursor-grab active:cursor-grabbing group"
                      style={{ background: 'var(--surface1)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium text-white leading-snug flex-1">{init.title}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => onEdit(init)} className="text-zinc-500 hover:text-white p-0.5"><Edit2 size={11} /></button>
                          <button onClick={() => onDelete(init.id)} className="text-zinc-500 hover:text-rose p-0.5"><Trash2 size={11} /></button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                          <span className="text-[10px]" style={{ color: p.color }}>{p.label}</span>
                        </div>
                        {(init.impact || init.risk) && <ScoreChip impact={init.impact} priority={init.priority} risk={init.risk} />}
                      </div>
                      {init.description && (
                        <p className="text-[11px] mt-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {init.description}
                        </p>
                      )}
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed p-4 text-center"
                    style={{ borderColor: `${col.color}20` }}>
                    <p className="text-[11px]" style={{ color: `${col.color}60` }}>Arrastra aquí</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Archived row */}
      {initiatives.some(i => i.status === 'discarded' || i.status === 'completed') && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Archivadas</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {archived.map(col => {
              const items = initiatives.filter(i => i.status === col.value)
              if (items.length === 0) return null
              return (
                <div key={col.value} className="flex gap-2">
                  {items.map(init => (
                    <div key={init.id} className="rounded-xl px-3 py-2 flex items-center gap-2 flex-shrink-0"
                      style={{ background: `${col.color}08`, border: `1px solid ${col.color}20` }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                      <p className="text-xs text-white">{init.title}</p>
                      <div className="flex gap-1 ml-1">
                        <button onClick={() => onEdit(init)} className="text-zinc-600 hover:text-white"><Edit2 size={10} /></button>
                        <button onClick={() => onDelete(init.id)} className="text-zinc-600 hover:text-rose"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Initiatives() {
  const [initiatives, setInitiatives] = useState([])
  const [loading, setLoading]         = useState(true)
  const [view, setView]               = useState('list')   // 'list' | 'kanban'
  const [filter, setFilter]           = useState('active') // 'active' | status | 'all'
  const [sort, setSort]               = useState('priority') // 'priority' | 'date' | 'score'
  const [search, setSearch]           = useState('')
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState(null)
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('initiatives').select('*').order('sort_order').order('created_at', { ascending: false })
    setInitiatives(data || [])
    setLoading(false)
  }

  async function save(data) {
    const now = new Date().toISOString()
    if (editing) {
      const { data: updated } = await supabase.from('initiatives')
        .update({ ...data, updated_at: now }).eq('id', editing.id).select().single()
      if (updated) setInitiatives(prev => prev.map(i => i.id === editing.id ? updated : i))
      setEditing(null)
    } else {
      const maxOrder = initiatives.length > 0 ? Math.max(...initiatives.map(i => i.sort_order || 0)) : 0
      const { data: created } = await supabase.from('initiatives')
        .insert([{ ...data, sort_order: maxOrder + 1, created_at: now, updated_at: now }]).select().single()
      if (created) setInitiatives(prev => [created, ...prev])
    }
    setShowForm(false)
  }

  async function updateStatus(id, status) {
    const now = new Date().toISOString()
    await supabase.from('initiatives').update({ status, updated_at: now }).eq('id', id)
    setInitiatives(prev => prev.map(i => i.id === id ? { ...i, status, updated_at: now } : i))
  }

  async function del(id) {
    await supabase.from('initiatives').delete().eq('id', id)
    setInitiatives(prev => prev.filter(i => i.id !== id))
  }

  // Drag reorder
  function onDragStart(e, idx) { dragItem.current = idx; e.dataTransfer.effectAllowed = 'move' }
  function onDragEnter(idx)    { dragOver.current = idx }
  async function onDragEnd() {
    const from = dragItem.current, to = dragOver.current
    if (from === null || to === null || from === to) { dragItem.current = null; dragOver.current = null; return }
    const reordered = [...displayed]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const updated = reordered.map((item, i) => ({ ...item, sort_order: i + 1 }))
    setInitiatives(prev => {
      const ids = new Set(displayed.map(i => i.id))
      return [...updated, ...prev.filter(i => !ids.has(i.id))]
    })
    dragItem.current = null; dragOver.current = null
    await Promise.all(updated.map(i => supabase.from('initiatives').update({ sort_order: i.sort_order }).eq('id', i.id)))
  }

  // Score for sorting
  function score(i) {
    const impact   = { Bajo: 1, Medio: 2, Alto: 3 }[i.impact]   || 2
    const risk     = { Bajo: 1, Medio: 2, Alto: 3 }[i.risk]     || 2
    return (impact * (i.priority || 2)) / risk
  }

  // Filter & sort
  const active   = ['idea','researching','validating','active','paused']
  const archived = ['discarded','completed']

  let displayed = initiatives.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) &&
        !i.description?.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'active')   return active.includes(i.status)
    if (filter === 'archived') return archived.includes(i.status)
    if (filter === 'all')      return true
    return i.status === filter
  })

  if (sort === 'score')    displayed = [...displayed].sort((a,b) => score(b) - score(a))
  else if (sort === 'date') displayed = [...displayed].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  // 'priority' keeps manual sort_order

  const counts = Object.fromEntries(STATUSES.map(s => [s.value, initiatives.filter(i => i.status === s.value).length]))
  const activeCount   = active.reduce((a, s) => a + (counts[s] || 0), 0)
  const archivedCount = archived.reduce((a, s) => a + (counts[s] || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="section-title">Iniciativas</h1>
          <p className="muted mt-0.5 text-xs">{activeCount} activas · {archivedCount} archivadas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-surface-200 p-0.5 rounded-xl">
            {[{ v: 'list', Icon: List }, { v: 'kanban', Icon: LayoutGrid }].map(({ v, Icon }) => (
              <button key={v} onClick={() => setView(v)}
                className="p-2 rounded-lg transition-all"
                style={{ background: view === v ? 'rgba(255,255,255,0.1)' : 'transparent', color: view === v ? 'white' : 'var(--text-muted)' }}>
                <Icon size={15} />
              </button>
            ))}
          </div>
          <button onClick={() => { setEditing(null); setShowForm(v => !v) }} className="btn-primary">
            {showForm ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> Nueva</>}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && !editing && (
        <InitiativeForm onSave={save} onCancel={() => setShowForm(false)} />
      )}
      {editing && (
        <InitiativeForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />
      )}

      {view === 'list' && (
        <>
          {/* Search + filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input className="input pl-8" placeholder="Buscar iniciativas..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select w-auto" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="priority">Orden manual</option>
              <option value="score">Por puntuación</option>
              <option value="date">Por fecha</option>
            </select>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { v: 'active',   l: `Activas (${activeCount})` },
              { v: 'archived', l: `Archivadas (${archivedCount})` },
              { v: 'all',      l: 'Todas' },
              ...STATUSES.map(s => ({ v: s.value, l: `${s.label} (${counts[s.value]||0})`, color: s.color })),
            ].map(({ v, l, color }) => (
              <button key={v} onClick={() => setFilter(v)}
                className="btn text-xs py-1"
                style={{
                  background: filter === v ? (color ? `${color}20` : 'rgba(255,255,255,0.1)') : 'transparent',
                  color: filter === v ? (color || 'white') : 'var(--text-muted)',
                  border: filter === v ? `1px solid ${color ? color+'40' : 'rgba(255,255,255,0.2)'}` : '1px solid transparent',
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <p className="muted text-center py-10">Cargando...</p>
          ) : displayed.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-3xl">💡</p>
              <p className="muted">
                {search ? 'Sin resultados para esa búsqueda.' : 'No hay iniciativas en esta categoría.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((init, index) => (
                <InitiativeCard key={init.id} initiative={init} index={index}
                  onEdit={i => { setEditing(i); setShowForm(false) }}
                  onDelete={del}
                  onStatusChange={updateStatus}
                  onDragStart={onDragStart}
                  onDragEnter={onDragEnter}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'kanban' && (
        <KanbanView
          initiatives={displayed.length < initiatives.length ? displayed : initiatives}
          onStatusChange={updateStatus}
          onEdit={i => { setEditing(i); setShowForm(false) }}
          onDelete={del}
        />
      )}
    </div>
  )
}
