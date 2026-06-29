import { useState, useEffect, useRef } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Copy, Lock, Unlock, Layers, Sun, GripVertical, Palette, Check, Edit3 } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

// ── Constants ──────────────────────────────────────────────────
const HOUR_HEIGHT_EDIT    = 64   // px per hour in edit mode
const HOUR_HEIGHT_COMPACT = 28   // px per hour in overview mode
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const DEFAULT_CATEGORIES = [
  { id: 'sleep',   label: 'Sueño',    color: '#5a6af7' },
  { id: 'work',    label: 'Trabajo',  color: '#f4a94e' },
  { id: 'sport',   label: 'Deporte',  color: '#3ecf8e' },
  { id: 'study',   label: 'Estudio',  color: '#a99cf9' },
  { id: 'leisure', label: 'Ocio',     color: '#f16b6b' },
  { id: 'food',    label: 'Comida',   color: '#5aafee' },
  { id: 'other',   label: 'Otro',     color: '#9ca3af' },
]

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

function snap(h)    { return Math.round(h * 4) / 4 }
function pxToH(px, hh) { return px / hh }
function hToPx(h, hh)  { return h * hh }
function fmtH(h) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
}

// ── Categories panel ───────────────────────────────────────────
function CategoriesPanel({ categories, onChange }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ label: '', color: '#7c6af7' })

  function updateColor(id, color) {
    onChange(categories.map(c => c.id === id ? { ...c, color } : c))
  }
  function deleteCategory(id) {
    onChange(categories.filter(c => c.id !== id))
  }
  function addCategory() {
    if (!form.label.trim()) return
    const id = form.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now()
    onChange([...categories, { id, label: form.label.trim(), color: form.color }])
    setForm({ label: '', color: '#7c6af7' })
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Palette size={14} className="text-accent-bright" /> Categorías
        </h3>
        <button onClick={() => setEditing(v => !v)}
          className={`btn-ghost text-xs py-0.5 px-2 ${editing ? 'text-accent-bright' : ''}`}>
          <Edit3 size={11} />
        </button>
      </div>

      <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
        {categories.map(c => (
          <div key={c.id} className="flex items-center gap-2 group">
            {editing ? (
              <>
                <input type="color" value={c.color}
                  onChange={e => updateColor(c.id, e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                  style={{ padding: 0 }} />
                <span className="flex-1 text-xs text-zinc-300">{c.label}</span>
                <button onClick={() => deleteCategory(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose transition-all">
                  <X size={11} />
                </button>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span className="text-xs text-zinc-400">{c.label}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="pt-2 border-t border-surface-300 space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Nueva categoría</p>
          <div className="flex gap-2">
            <input type="color" value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="w-8 h-8 rounded-lg cursor-pointer border-0 flex-shrink-0"
              style={{ padding: '2px', background: 'rgba(255,255,255,0.05)' }} />
            <input className="input text-xs flex-1" placeholder="Nombre"
              value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <button onClick={addCategory} className="btn-primary px-2.5 py-1">
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Preset library panel ───────────────────────────────────────
function PresetLibrary({ presets, categories, onAdd, onDelete, onDragStart }) {
  const [form, setForm] = useState({ label: '', category: 'work', duration: 1 })
  const [show, setShow] = useState(false)

  async function save() {
    if (!form.label.trim()) return
    await onAdd(form)
    setForm({ label: '', category: 'work', duration: 1 })
    setShow(false)
  }

  function getCat(id) { return categories.find(c => c.id === id) || categories[categories.length - 1] }

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers size={14} className="text-accent-bright" /> Bloques
        </h3>
        <button onClick={() => setShow(v => !v)} className="btn-ghost text-xs py-0.5 px-2">
          <Plus size={12} />
        </button>
      </div>

      {show && (
        <div className="space-y-2 pt-1 border-t border-surface-300">
          <input className="input text-xs" placeholder="Nombre del bloque" value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <select className="select text-xs" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input className="input text-xs" type="number" step="0.5" min="0.5" max="12"
              placeholder="Horas" value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: parseFloat(e.target.value) || 1 }))} />
          </div>
          <button onClick={save} className="btn-primary text-xs py-1.5 w-full justify-center">
            Guardar bloque
          </button>
        </div>
      )}

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {presets.length === 0 && <p className="text-zinc-600 text-xs text-center py-2">Sin bloques</p>}
        {presets.map(p => {
          const c = getCat(p.category)
          return (
            <div key={p.id} draggable
              onDragStart={e => { e.dataTransfer.setData('presetId', p.id); onDragStart(p) }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-grab active:cursor-grabbing group"
              style={{ background: hexToRgba(c.color, 0.15), border: `1px solid ${hexToRgba(c.color, 0.4)}` }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span className="flex-1 text-xs font-medium text-white truncate">{p.label}</span>
              <span className="text-[10px] text-zinc-400">{p.duration}h</span>
              <button onClick={() => onDelete(p.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose transition-all">
                <X size={11} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Template manager panel ─────────────────────────────────────
function TemplateManager({ blocks, weekStart, onApply }) {
  const [templates, setTemplates] = useState([])
  const [name, setName] = useState('')

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    const { data } = await supabase.from('schedule_templates').select('*').order('created_at')
    setTemplates(data || [])
  }

  async function saveTemplate() {
    if (!name.trim() || blocks.length === 0) return
    const weekBlocks = blocks.map(b => {
      const dayOffset = Math.round((new Date(b.date + 'T12:00:00') - weekStart) / 86400000)
      return { ...b, day_offset: dayOffset, date: undefined, id: undefined }
    })
    const { data } = await supabase.from('schedule_templates')
      .insert([{ name: name.trim(), blocks: weekBlocks }]).select().single()
    if (data) { setTemplates(prev => [...prev, data]); setName('') }
  }

  async function applyTemplate(t) {
    const toInsert = (t.blocks || []).map(b => ({
      label: b.label, category: b.category,
      start_hour: b.start_hour, duration: b.duration,
      date: format(addDays(weekStart, b.day_offset || 0), 'yyyy-MM-dd'),
      locked_days: null,
    }))
    const { data } = await supabase.from('schedule_blocks').insert(toInsert).select()
    if (data) onApply(data)
  }

  async function deleteTemplate(id) {
    await supabase.from('schedule_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="card space-y-2">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Copy size={14} className="text-accent-bright" /> Plantillas
      </h3>
      <div className="flex gap-2">
        <input className="input text-xs flex-1" placeholder="Guardar semana como..."
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveTemplate()} />
        <button onClick={saveTemplate} className="btn-primary px-2.5 py-1"><Plus size={12} /></button>
      </div>
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {templates.length === 0 && <p className="text-zinc-600 text-xs text-center py-2">Sin plantillas</p>}
        {templates.map(t => (
          <div key={t.id} className="flex items-center gap-1.5 group">
            <button onClick={() => applyTemplate(t)}
              className="flex-1 text-left text-xs text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-surface-300 transition-colors truncate">
              {t.name}
              <span className="text-zinc-600 ml-1">({t.blocks?.length || 0})</span>
            </button>
            <button onClick={() => deleteTemplate(t.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose transition-all flex-shrink-0">
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Reorderable sidebar ────────────────────────────────────────
const PANEL_DEFS = ['categories', 'presets', 'templates']

function ReorderableSidebar({ children, panels, onReorder }) {
  const dragIdx = useRef(null)
  const overIdx = useRef(null)

  function onDragStart(e, i) {
    dragIdx.current = i
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('panelDrag', '1')
  }
  function onDragEnter(i) { overIdx.current = i }
  function onDragEnd() {
    if (dragIdx.current === null || overIdx.current === null || dragIdx.current === overIdx.current) return
    const reordered = [...panels]
    const [moved] = reordered.splice(dragIdx.current, 1)
    reordered.splice(overIdx.current, 0, moved)
    onReorder(reordered)
    dragIdx.current = null
    overIdx.current = null
  }

  return (
    <div className="space-y-3">
      {panels.map((panelId, i) => (
        <div key={panelId}
          draggable
          onDragStart={e => onDragStart(e, i)}
          onDragEnter={() => onDragEnter(i)}
          onDragEnd={onDragEnd}
          onDragOver={e => { if (e.dataTransfer.types.includes('paneldrag')) e.preventDefault() }}
          className="group/panel relative">
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/panel:opacity-100 transition-opacity cursor-grab">
            <GripVertical size={12} className="text-zinc-600" />
          </div>
          {children[panelId]}
        </div>
      ))}
    </div>
  )
}

// ── Lock modal ─────────────────────────────────────────────────
function LockModal({ block, onSave, onClose }) {
  const [mode, setMode] = useState(
    Array.isArray(block.locked_days) ? 'custom'
    : block.locked_days || null
  )
  const [custom, setCustom] = useState(
    Array.isArray(block.locked_days) ? block.locked_days : [0,1,2,3,4,5,6]
  )
  const DAYS = ['L','M','X','J','V','S','D']

  function save() {
    const val = mode === 'daily' ? 'daily'
      : mode === 'weekly' ? 'weekly'
      : mode === 'custom' ? custom
      : null
    onSave(val)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="card w-80 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Repetición — {block.label}</h3>
          <button onClick={onClose}><X size={16} className="text-zinc-500" /></button>
        </div>
        <div className="space-y-2">
          {[
            { v: null,     l: 'Sin repetición',           sub: 'Solo este día' },
            { v: 'daily',  l: 'Todos los días',           sub: 'Cada día de la semana' },
            { v: 'weekly', l: 'Mismo día cada semana',    sub: 'Se replica semanalmente' },
            { v: 'custom', l: 'Días personalizados',      sub: 'Elige qué días de la semana' },
          ].map(opt => (
            <button key={String(opt.v)} onClick={() => setMode(opt.v)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all
                ${mode === opt.v ? 'border-accent/60 bg-accent/10' : 'border-surface-300 hover:border-surface-400'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                  ${mode === opt.v ? 'border-accent bg-accent' : 'border-zinc-600'}`}>
                  {mode === opt.v && <Check size={8} className="text-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{opt.l}</p>
                  <p className="text-xs text-zinc-500">{opt.sub}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {mode === 'custom' && (
          <div className="flex gap-1.5 justify-center">
            {DAYS.map((d, i) => (
              <button key={i}
                onClick={() => setCustom(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                  ${custom.includes(i) ? 'bg-accent text-white' : 'bg-surface-300 text-zinc-500'}`}>
                {d}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={save} className="btn-primary flex-1 justify-center">Guardar</button>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Single time block ──────────────────────────────────────────
function TimeBlock({ block, categories, hourHeight, onUpdate, onDelete, onLock }) {
  const c = categories.find(x => x.id === block.category) || categories[categories.length - 1]
  const top    = hToPx(block.start_hour, hourHeight)
  const height = Math.max(hToPx(block.duration, hourHeight), 20)
  const isLocked = block.locked_days !== null && block.locked_days !== undefined
  const resizeRef = useRef()

  function onMouseDownMove(e) {
    if (e.target === resizeRef.current || e.target.closest('button')) return
    e.preventDefault()
    const startY = e.clientY, startHour = block.start_hour
    function onMove(ev) {
      const newStart = snap(Math.max(0, Math.min(23, startHour + pxToH(ev.clientY - startY, hourHeight))))
      onUpdate({ ...block, start_hour: newStart })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      supabase.from('schedule_blocks').update({ start_hour: block.start_hour }).eq('id', String(block.id).split('_')[0])
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function onMouseDownResize(e) {
    e.preventDefault(); e.stopPropagation()
    const startY = e.clientY, startDur = block.duration
    function onMove(ev) {
      const newDur = snap(Math.max(0.25, startDur + pxToH(ev.clientY - startY, hourHeight)))
      onUpdate({ ...block, duration: newDur })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      supabase.from('schedule_blocks').update({ duration: block.duration }).eq('id', String(block.id).split('_')[0])
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div onMouseDown={onMouseDownMove}
      className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-0.5 cursor-grab active:cursor-grabbing select-none group/b overflow-hidden"
      style={{
        top: `${top}px`, height: `${height}px`, zIndex: 10,
        background: hexToRgba(c.color, 0.18),
        border: `1px solid ${hexToRgba(c.color, 0.5)}`,
      }}>

      {/* Label */}
      <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: c.color }}>
        {block.label}
      </p>
      {height > 38 && (
        <p className="text-[9px] leading-tight" style={{ color: c.color, opacity: 0.65 }}>
          {fmtH(block.start_hour)} – {fmtH(block.start_hour + block.duration)}
        </p>
      )}

      {/* Action buttons — visible on hover */}
      <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover/b:opacity-100 transition-opacity">
        {/* Lock button */}
        {!block._virtual && (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => onLock(block)}
            className="w-5 h-5 rounded flex items-center justify-center transition-all"
            style={{
              background: isLocked ? hexToRgba(c.color, 0.4) : 'rgba(0,0,0,0.3)',
              color: isLocked ? c.color : 'rgba(255,255,255,0.5)',
            }}
            title={isLocked ? 'Configurar repetición' : 'Bloquear repetición'}>
            {isLocked ? <Lock size={9} /> : <Unlock size={9} />}
          </button>
        )}
        {/* Delete */}
        {!block._virtual && (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => onDelete(block.id)}
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.5)' }}>
            <X size={9} />
          </button>
        )}
      </div>

      {/* Resize handle */}
      <div ref={resizeRef} onMouseDown={onMouseDownResize}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize flex items-center justify-center">
        <div className="w-5 h-0.5 rounded-full" style={{ background: c.color, opacity: 0.4 }} />
      </div>
    </div>
  )
}

// ── Day column ─────────────────────────────────────────────────
function DayColumn({ date, blocks, categories, hourHeight, presetDragging, onDrop, onUpdate, onDelete, onLock, isToday }) {
  const colRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    if (!e.dataTransfer.getData('presetId') || !presetDragging) return
    const rect = colRef.current.getBoundingClientRect()
    const y    = e.clientY - rect.top + colRef.current.scrollTop
    const hour = snap(Math.max(0, Math.min(23, pxToH(y, hourHeight))))
    onDrop(date, hour, presetDragging)
  }

  return (
    <div ref={colRef} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
      className="relative flex-1 min-w-0"
      style={{ height: `${hourHeight * 24}px` }}>
      {HOURS.map(h => (
        <div key={h} className="absolute left-0 right-0"
          style={{ top: `${hToPx(h, hourHeight)}px`, height: `${hourHeight}px`,
            borderTop: h === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }} />
      ))}
      {isToday && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(124,106,247,0.03)' }} />
      )}
      {blocks.map(b => (
        <TimeBlock key={b.id} block={b} categories={categories} hourHeight={hourHeight}
          onUpdate={onUpdate} onDelete={onDelete} onLock={onLock} />
      ))}
    </div>
  )
}

// ── Overview mode (compact, no scroll) ────────────────────────
function OverviewGrid({ days, blocks, categories }) {
  const TOTAL_H = 24  // show all 24 hours

  function blocksForDate(date) {
    return blocks.filter(b => b.date === format(date, 'yyyy-MM-dd'))
  }

  // Show hour labels every 3h to avoid clutter
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21]

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="flex pl-8 mb-1 flex-shrink-0 gap-0.5">
        {days.map(day => {
          const isToday = isSameDay(day, new Date())
          return (
            <div key={day.toISOString()} className={`flex-1 week-day-header ${isToday ? 'today' : ''}`}>
              <div style={{ fontSize: '10px' }} className="text-zinc-400 uppercase tracking-wider">
                {format(day, 'EEE', { locale: es })}
              </div>
              <div className="font-bold text-white text-sm">{format(day, 'd')}</div>
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Hour labels */}
        <div className="w-8 flex-shrink-0 relative">
          {hourLabels.map(h => (
            <div key={h} className="absolute w-full flex items-center justify-end pr-1"
              style={{ top: `${(h / TOTAL_H) * 100}%`, transform: 'translateY(-50%)' }}>
              <span className="text-[9px] text-zinc-700 font-mono">{String(h).padStart(2,'0')}</span>
            </div>
          ))}
        </div>

        {/* Columns */}
        <div className="flex flex-1 gap-0.5 min-w-0">
          {days.map(day => {
            const dayBlocks = blocksForDate(day)
            const isToday = isSameDay(day, new Date())
            return (
              <div key={day.toISOString()} className="flex-1 relative rounded-lg overflow-hidden"
                style={{
                  background: isToday ? 'rgba(124,106,247,0.04)' : 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                {/* Hour lines every 3h */}
                {hourLabels.map(h => (
                  <div key={h} className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: `${(h / TOTAL_H) * 100}%`,
                      borderTop: h === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }} />
                ))}
                {/* Blocks — positioned as % of 24h */}
                {dayBlocks.map(b => {
                  const c = categories.find(x => x.id === b.category) || categories[categories.length - 1]
                  const startH   = Math.max(0, Math.min(24, b.start_hour))
                  const endH     = Math.max(0, Math.min(24, b.start_hour + b.duration))
                  const topPct   = (startH / TOTAL_H) * 100
                  const heightPct = Math.max(0.5, ((endH - startH) / TOTAL_H) * 100)
                  return (
                    <div key={b.id}
                      className="absolute left-0.5 right-0.5 rounded overflow-hidden px-1 py-0.5"
                      title={`${b.label}  ${fmtH(b.start_hour)} – ${fmtH(b.start_hour + b.duration)}`}
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                        background: hexToRgba(c.color, 0.28),
                        border: `1px solid ${hexToRgba(c.color, 0.55)}`,
                        minHeight: '4px',
                      }}>
                      <p className="text-[8px] font-semibold truncate leading-none" style={{ color: c.color }}>
                        {b.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Planner ───────────────────────────────────────────────
export default function Planner() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [gridMode, setGridMode]   = useState('overview')  // 'overview' | 'edit'
  const [blocks, setBlocks]       = useState([])
  const [presets, setPresets]     = useState([])
  const [presetDragging, setPresetDragging] = useState(null)
  const [lockTarget, setLockTarget] = useState(null)
  const [panelOrder, setPanelOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_panel_order')) || ['categories', 'presets', 'templates'] }
    catch { return ['categories', 'presets', 'templates'] }
  })
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_categories')) || DEFAULT_CATEGORIES }
    catch { return DEFAULT_CATEGORIES }
  })
  const scrollRef = useRef()

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const HOUR_H = gridMode === 'edit' ? HOUR_HEIGHT_EDIT : HOUR_HEIGHT_COMPACT

  useEffect(() => { loadBlocks(); loadPresets() }, [weekStart])
  useEffect(() => { if (scrollRef.current && gridMode === 'edit') scrollRef.current.scrollTop = HOUR_HEIGHT_EDIT * 6 }, [gridMode])
  useEffect(() => {
    localStorage.setItem('orbit_categories', JSON.stringify(categories))
  }, [categories])

  useEffect(() => {
    localStorage.setItem('orbit_panel_order', JSON.stringify(panelOrder))
  }, [panelOrder])

  async function loadBlocks() {
    const from = format(weekStart, 'yyyy-MM-dd')
    const to   = format(addDays(weekStart, 6), 'yyyy-MM-dd')
    const { data: owned } = await supabase.from('schedule_blocks').select('*').gte('date', from).lte('date', to)
    const { data: recurring } = await supabase.from('schedule_blocks').select('*').not('locked_days', 'is', null)

    const extra = []
    const ownedKeys = new Set((owned || []).map(b => b.date + '_' + b.label))

    ;(recurring || []).forEach(b => {
      days.forEach((day, idx) => {
        const ds = format(day, 'yyyy-MM-dd')
        if (ownedKeys.has(ds + '_' + b.label)) return
        const push = (d) => extra.push({ ...b, id: b.id + '_' + ds, date: ds, _virtual: true })
        if (b.locked_days === 'daily') push()
        else if (b.locked_days === 'weekly') {
          if (new Date(b.date + 'T12:00:00').getDay() === day.getDay()) push()
        } else if (Array.isArray(b.locked_days)) {
          if (b.locked_days.includes(idx)) push()
        }
      })
    })

    setBlocks([...(owned || []), ...extra])
  }

  async function loadPresets() {
    const { data } = await supabase.from('schedule_presets').select('*').order('created_at')
    setPresets(data || [])
  }

  async function handleDrop(date, hour, preset) {
    if (!preset) return
    const { data } = await supabase.from('schedule_blocks').insert([{
      date, label: preset.label, category: preset.category,
      start_hour: hour, duration: preset.duration, locked_days: null,
    }]).select().single()
    if (data) setBlocks(prev => [...prev, data])
    setPresetDragging(null)
  }

  function updateBlock(updated) {
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  async function deleteBlock(id) {
    const realId = String(id).split('_')[0]
    await supabase.from('schedule_blocks').delete().eq('id', realId)
    setBlocks(prev => prev.filter(b => String(b.id).split('_')[0] !== realId))
  }

  async function addPreset(form) {
    const { data } = await supabase.from('schedule_presets').insert([form]).select().single()
    if (data) setPresets(prev => [...prev, data])
  }

  async function deletePreset(id) {
    await supabase.from('schedule_presets').delete().eq('id', id)
    setPresets(prev => prev.filter(p => p.id !== id))
  }

  async function saveLock(block, lockedDays) {
    const realId = String(block.id).split('_')[0]
    await supabase.from('schedule_blocks').update({ locked_days: lockedDays }).eq('id', realId)
    setBlocks(prev => prev.map(b => String(b.id).split('_')[0] === realId ? { ...b, locked_days: lockedDays } : b))
    setLockTarget(null)
    loadBlocks()
  }

  function blocksForDate(date) {
    return blocks.filter(b => b.date === format(date, 'yyyy-MM-dd'))
  }

  function totalFreeHours() {
    const used = days.reduce((a, day) => a + blocksForDate(day).reduce((s, b) => s + (b.duration || 0), 0), 0)
    const total = days.length * 24
    return (total - used).toFixed(1)
  }

  const panelComponents = {
    categories: (
      <CategoriesPanel categories={categories} onChange={setCategories} />
    ),
    presets: (
      <PresetLibrary presets={presets} categories={categories}
        onAdd={addPreset} onDelete={deletePreset}
        onDragStart={p => setPresetDragging(p)} />
    ),
    templates: (
      <TemplateManager blocks={blocks.filter(b => !b._virtual)} weekStart={weekStart}
        onApply={nb => setBlocks(prev => [...prev, ...nb])} />
    ),
  }

  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  return (
    <div className="flex flex-col md:flex-row gap-0 md:gap-3 h-full overflow-hidden">

      {/* ── Mobile top toolbar ── */}
      <div className="flex md:hidden items-center justify-between px-2 py-2 flex-shrink-0 gap-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex gap-1 bg-surface-200 p-0.5 rounded-lg">
          {[{ v: 'overview', l: '📅 Vista' }, { v: 'edit', l: '✏️ Editar' }].map(({ v, l }) => (
            <button key={v} onClick={() => setGridMode(v)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all
                ${gridMode === v ? 'bg-surface-400 text-white' : 'text-zinc-500'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekStart(w => subWeeks(w,1))} className="btn-ghost px-1.5 py-1"><ChevronLeft size={14} /></button>
          <p className="text-[11px] text-white font-medium whitespace-nowrap">
            {format(weekStart,"d MMM",{locale:es})}–{format(addDays(weekStart,6),"d MMM",{locale:es})}
          </p>
          <button onClick={() => setWeekStart(w => addWeeks(w,1))} className="btn-ghost px-1.5 py-1"><ChevronRight size={14} /></button>
        </div>
        <button onClick={() => setMobilePanelOpen(v => !v)}
          className={`btn-ghost text-xs px-2 py-1.5 flex-shrink-0 ${mobilePanelOpen ? 'text-accent-bright' : ''}`}>
          <Layers size={14} />
        </button>
      </div>

      {/* Mobile collapsible panel */}
      {mobilePanelOpen && (
        <div className="flex md:hidden flex-col gap-2 px-2 pb-2 overflow-y-auto max-h-48 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded-lg"
                style={{ background: hexToRgba(c.color, 0.15), border: `1px solid ${hexToRgba(c.color, 0.3)}` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                <span className="text-[10px] text-white whitespace-nowrap">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {presets.map(p => {
              const c = categories.find(x => x.id === p.category) || categories[categories.length - 1]
              return (
                <div key={p.id} draggable
                  onDragStart={e => { e.dataTransfer.setData('presetId', p.id); setPresetDragging(p) }}
                  className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded-lg cursor-grab"
                  style={{ background: hexToRgba(c.color, 0.15), border: `1px solid ${hexToRgba(c.color, 0.35)}` }}>
                  <span className="text-[10px] text-white whitespace-nowrap">{p.label} {p.duration}h</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <div className="hidden md:flex w-48 flex-shrink-0 flex-col gap-0 overflow-y-auto pb-4 space-y-3">
        {/* Nav */}
        <div>
          <h1 className="section-title text-base">Planificador</h1>
          <p className="muted text-xs mt-0.5">Organiza tu tiempo</p>
        </div>

        {/* Editar / Vista toggle — desktop sidebar only */}
        <div className="hidden md:flex gap-1 bg-surface-200 p-1 rounded-xl">
          {[{ v: 'overview', l: 'Vista' }, { v: 'edit', l: 'Editar' }].map(({ v, l }) => (
            <button key={v} onClick={() => setGridMode(v)}
              className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all
                ${gridMode === v ? 'bg-surface-400 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Nav arrows — desktop only */}
        <div className="hidden md:flex items-center justify-between">
          <button onClick={() => setWeekStart(w => subWeeks(w,1))}
            className="btn-ghost px-2 py-1"><ChevronLeft size={14} /></button>
          <p className="text-[11px] font-medium text-white text-center leading-tight">
            {format(weekStart,"d MMM",{locale:es})} – {format(addDays(weekStart,6),"d MMM",{locale:es})}
          </p>
          <button onClick={() => setWeekStart(w => addWeeks(w,1))}
            className="btn-ghost px-2 py-1"><ChevronRight size={14} /></button>
        </div>

        {/* Free hours */}
        <div className="card-sm flex items-center gap-2">
          <Sun size={13} className="text-amber flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">{totalFreeHours()}h</p>
            <p className="text-[10px] text-zinc-500">horas libres</p>
          </div>
        </div>

        {/* Reorderable panels */}
        <ReorderableSidebar panels={panelOrder} onReorder={setPanelOrder}>
          {panelComponents}
        </ReorderableSidebar>
      </div>

      {/* ── Main grid area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">


        {/* ── Edit mode: scrollable full grid ── */}
        {gridMode === 'edit' && (
          <>
          {/* Day headers for edit mode */}
          <div className="flex pl-8 mb-1 flex-shrink-0 gap-0.5">
            {days.map(day => {
              const isToday = isSameDay(day, new Date())
              return (
                <div key={day.toISOString()} className="flex-1 text-center px-0.5">
                  <div className={`week-day-header ${isToday ? 'today' : ''}`}>
                    <div className="text-zinc-400 uppercase tracking-wider" style={{ fontSize: '10px' }}>
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className="font-bold text-white text-sm">{format(day, 'd')}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex">
              <div className="w-8 flex-shrink-0">
                {HOURS.map(h => (
                  <div key={h} style={{ height: `${HOUR_HEIGHT_EDIT}px` }}
                    className="flex items-start justify-end pr-1.5 pt-0.5">
                    <span className="text-[10px] text-zinc-700 font-mono">{String(h).padStart(2,'0')}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-1 gap-0.5">
                {days.map(day => (
                  <DayColumn key={day.toISOString()}
                    date={format(day, 'yyyy-MM-dd')}
                    blocks={blocksForDate(day)}
                    categories={categories}
                    hourHeight={HOUR_HEIGHT_EDIT}
                    presetDragging={presetDragging}
                    onDrop={handleDrop}
                    onUpdate={updateBlock}
                    onDelete={deleteBlock}
                    onLock={setLockTarget}
                    isToday={isSameDay(day, new Date())} />
                ))}
              </div>
            </div>
          </div>
          </>
        )}

        {/* ── Overview mode: compressed, no scroll ── */}
        {gridMode === 'overview' && (
          <div className="flex-1 overflow-hidden">
            <OverviewGrid days={days} blocks={blocks} categories={categories} />
          </div>
        )}
      </div>

      {lockTarget && (
        <LockModal block={lockTarget}
          onSave={ld => saveLock(lockTarget, ld)}
          onClose={() => setLockTarget(null)} />
      )}
    </div>
  )
}
