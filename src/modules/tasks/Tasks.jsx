import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, ChevronDown, GripVertical, Trash2, RotateCcw, MessageSquare, Send, Tag, Settings, Upload, Check, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

// ── Status config (no Discarded in dropdown) ─────────────────
const ACTIVE_STATUSES = [
  { value: 'pending',  label: 'Pendiente',  cls: 'status-pending'  },
  { value: 'progress', label: 'En proceso', cls: 'status-progress' },
  { value: 'done',     label: 'Hecho',      cls: 'status-done'     },
]
const ALL_STATUSES = [
  ...ACTIVE_STATUSES,
  { value: 'discarded', label: 'Desechado', cls: 'status-discarded' },
]

function getSt(v) { return ALL_STATUSES.find(s => s.value === v) || ACTIVE_STATUSES[0] }

// ── Type badge ────────────────────────────────────────────────
function TypeBadge({ type }) {
  if (!type) return null
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
      style={{ background: `${type.color || '#9ca3af'}18`, border: `1px solid ${type.color || '#9ca3af'}40`, color: type.color || '#9ca3af' }}>
      {type.icon_url ? (
        <img src={type.icon_url} alt={type.name} className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
      ) : (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: type.color || '#9ca3af' }} />
      )}
      {type.name}
    </div>
  )
}

// ── Status badge dropdown ─────────────────────────────────────
function StatusBadge({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const current = getSt(value)

  useEffect(() => {
    function h(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (value === 'discarded') return <span className="status-discarded">Desechado</span>

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

// ── Comment thread ────────────────────────────────────────────
function CommentThread({ taskId, onCollapse }) {
  const [comments, setComments] = useState([])
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(true)
  const inputRef = useRef()

  useEffect(() => { loadComments() }, [taskId])

  async function loadComments() {
    setLoading(true)
    const { data } = await supabase.from('task_comments').select('*')
      .eq('task_id', taskId).order('created_at')
    setComments(data || [])
    setLoading(false)
  }

  async function addComment() {
    if (!text.trim()) return
    const { data } = await supabase.from('task_comments')
      .insert([{ task_id: taskId, content: text.trim() }]).select().single()
    if (data) setComments(prev => [...prev, data])
    setText('')
    inputRef.current?.focus()
  }

  async function deleteComment(id) {
    await supabase.from('task_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <MessageSquare size={12} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Comentarios {comments.length > 0 && `(${comments.length})`}
          </span>
        </div>
        {onCollapse && (
          <button onClick={onCollapse} className="text-[10px] px-2 py-0.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}>
            Minimizar ↑
          </button>
        )}
      </div>

      {loading ? null : comments.length === 0 ? (
        <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.2)' }}>Sin comentarios aún...</p>
      ) : (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="group flex items-start gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: 'var(--accent)20', color: 'var(--accent-bright)', fontSize: '10px' }}>
                Yo
              </div>
              <div className="flex-1 min-w-0">
                <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-white whitespace-pre-wrap leading-relaxed">{c.content}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {format(new Date(c.created_at), "dd/MM/yy HH:mm")}
                  </p>
                  <button onClick={() => deleteComment(c.id)}
                    className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose"
                    style={{ color: 'var(--text-muted)' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 mt-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
          style={{ background: 'var(--accent)20', color: 'var(--accent-bright)' }}>
          Yo
        </div>
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input ref={inputRef} className="flex-1 bg-transparent text-sm text-white outline-none placeholder-zinc-600"
            placeholder="Añadir comentario..." value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addComment())} />
          <button onClick={addComment} disabled={!text.trim()}
            className="flex-shrink-0 transition-opacity disabled:opacity-30"
            style={{ color: 'var(--accent-bright)' }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Task type manager ─────────────────────────────────────────
function TypeManager({ types, onRefresh, onClose }) {
  const [form, setForm] = useState({ name: '', color: '#7c6af7' })
  const [uploading, setUploading] = useState(false)
  const [editId, setEditId] = useState(null)
  const fileRef = useRef()

  async function uploadIcon(file) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `icons/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('task-type-icons').upload(path, file, { upsert: true })
    if (error) { setUploading(false); return null }
    const { data } = supabase.storage.from('task-type-icons').getPublicUrl(path)
    setUploading(false)
    return data.publicUrl
  }

  async function save() {
    if (!form.name.trim()) return
    let icon_url = form.icon_url || null

    if (form.file) {
      icon_url = await uploadIcon(form.file)
    }

    const payload = { name: form.name.trim(), color: form.color, icon_url }

    if (editId) {
      await supabase.from('task_types').update(payload).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('task_types').insert([payload])
    }

    setForm({ name: '', color: '#7c6af7' })
    onRefresh()
  }

  async function deleteType(id) {
    await supabase.from('task_types').delete().eq('id', id)
    onRefresh()
  }

  function startEdit(t) {
    setEditId(t.id)
    setForm({ name: t.name, color: t.color || '#7c6af7', icon_url: t.icon_url })
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setForm(f => ({ ...f, file, preview }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface1)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="font-semibold text-white">Tipos de actividad</h3>
          <button onClick={onClose}><X size={18} className="text-zinc-500" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Form */}
          <div className="space-y-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {editId ? 'Editar tipo' : 'Nuevo tipo'}
            </p>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Nombre del tipo (ej: Bug, Feature, Reunión...)"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 flex-shrink-0"
                style={{ padding: '2px', background: 'rgba(255,255,255,0.05)' }} />
            </div>

            {/* Image upload */}
            <div>
              <label className="label">Imagen / icono (opcional)</label>
              <div className="flex items-center gap-3">
                {(form.preview || form.icon_url) ? (
                  <img src={form.preview || form.icon_url} alt="preview"
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${form.color}20`, border: `1px solid ${form.color}40` }}>
                    <span className="text-xl">🏷️</span>
                  </div>
                )}
                <button onClick={() => fileRef.current?.click()}
                  className="btn-ghost text-sm gap-2 flex-1 justify-center"
                  style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>
                  <Upload size={14} />
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                PNG, JPG o SVG. Se usará como icono del tipo en las tareas. Requiere bucket "task-type-icons" en Supabase Storage (público).
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={save} disabled={uploading || !form.name.trim()} className="btn-primary">
                <Check size={14} /> {editId ? 'Guardar cambios' : 'Crear tipo'}
              </button>
              {editId && <button onClick={() => { setEditId(null); setForm({ name: '', color: '#7c6af7' }) }} className="btn-ghost">Cancelar</button>}
            </div>
          </div>

          {/* Types list */}
          <div className="space-y-2">
            {types.map(t => (
              <div key={t.id} className="flex items-center gap-3 group">
                {t.icon_url ? (
                  <img src={t.icon_url} alt={t.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${t.color || '#9ca3af'}18`, border: `1px solid ${t.color || '#9ca3af'}40` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: t.color || '#9ca3af' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  {t.is_default && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Tipo predeterminado</p>}
                </div>
                {!t.is_default && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => startEdit(t)} className="btn-ghost p-1.5"><Edit2 size={12} /></button>
                    <button onClick={() => deleteType(t.id)} className="btn-ghost p-1.5 hover:text-rose"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Trash view ────────────────────────────────────────────────
function TrashView({ tasks, onRestore, onDeletePermanently, onDeleteAll }) {
  if (tasks.length === 0) return (
    <div className="text-center py-12 space-y-2">
      <p className="text-3xl">🗑️</p>
      <p className="muted">La papelera está vacía.</p>
    </div>
  )
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="muted text-xs">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en la papelera</p>
        <button onClick={onDeleteAll} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--rose)', background: 'color-mix(in srgb, var(--rose) 10%, transparent)' }}>
          <Trash2 size={12} /> Vaciar papelera
        </button>
      </div>
      {tasks.map(task => (
        <div key={task.id} className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'var(--surface1)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.7 }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-500 line-through">{task.title}</p>
            {task.description && <p className="text-xs text-zinc-700 mt-0.5 truncate">{task.description}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => onRestore(task)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--jade)', background: 'color-mix(in srgb, var(--jade) 10%, transparent)' }}>
              <RotateCcw size={12} /> Restaurar
            </button>
            <button onClick={() => onDeletePermanently(task.id)} className="p-1.5 rounded-lg"
              style={{ color: 'var(--rose)', background: 'color-mix(in srgb, var(--rose) 8%, transparent)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Task card ─────────────────────────────────────────────────
function TaskCard({ task, taskType, index, onEdit, onDiscard, onStatusChange, onDragStart, onDragEnter, onDragEnd }) {
  const [expanded, setExpanded] = useState(false)
  const [commentCount, setCommentCount] = useState(null)

  // Lazy-load comment count
  useEffect(() => {
    supabase.from('task_comments').select('id', { count: 'exact', head: true })
      .eq('task_id', task.id).then(({ count }) => setCommentCount(count || 0))
  }, [task.id])

  return (
    <div draggable
      onDragStart={e => onDragStart(e, index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      onClick={() => setExpanded(v => !v)}
      className="group rounded-2xl transition-all cursor-default"
      style={{
        background: 'var(--surface1)',
        border: `1px solid ${expanded ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'rgba(255,255,255,0.07)'}`,
        padding: expanded ? '16px' : '12px 16px',
      }}>

      {/* Main row */}
      <div className="flex items-start gap-3">
        <GripVertical size={15} className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing"
          style={{ color: 'rgba(255,255,255,0.15)' }} />

        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
          style={{ background: task.status === 'done' ? 'var(--jade)' : task.status === 'progress' ? 'var(--sky)' : 'rgba(255,255,255,0.2)' }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-medium leading-snug flex-1 min-w-0"
              style={{ color: task.status === 'done' ? 'rgba(255,255,255,0.3)' : 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
              {task.title}
            </p>
            {taskType && <TypeBadge type={taskType} />}
          </div>

          {/* Description preview or full */}
          {task.description && !expanded && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
          )}
          {expanded && task.description && (
            <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
          )}

          {/* Comment count badge */}
          {commentCount > 0 && !expanded && (
            <button onClick={e => { e.stopPropagation(); setExpanded(true); setShowComments(true) }}
              className="flex items-center gap-1 mt-1 text-[10px] hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}>
              <MessageSquare size={10} /> {commentCount} comentario{commentCount !== 1 ? 's' : ''}
            </button>
          )}

          {/* Comments shown directly when expanded, with collapse button on the right */}
          {expanded && (
            <div onClick={e => e.stopPropagation()} className="mt-3">
              <CommentThread taskId={task.id} onCollapse={() => setExpanded(false)} />
            </div>
          )}

          {/* Created date when expanded */}
          {expanded && (
            <p className="text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Creada {format(new Date(task.created_at), "dd/MM/yy HH:mm")}
            </p>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge value={task.status} onChange={v => onStatusChange(task.id, v)} />
          <button onClick={() => onDiscard(task.id)}
            title="Mover a papelera"
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--rose)'}
            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Tasks ────────────────────────────────────────────────
export default function Tasks() {
  const [tasks, setTasks]         = useState([])
  const [taskTypes, setTaskTypes] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState(() => localStorage.getItem('tasks_filter') || 'all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [newTitle, setNewTitle]   = useState('')
  const [newDesc, setNewDesc]     = useState('')
  const [newTypeId, setNewTypeId] = useState('')
  const titleRef = useRef()
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  useEffect(() => { loadTasks(); loadTypes() }, [])
  useEffect(() => { if (showForm) titleRef.current?.focus() }, [showForm])

  async function loadTasks() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*')
      .order('sort_order', { ascending: true }).order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  async function loadTypes() {
    const { data } = await supabase.from('task_types').select('*').order('sort_order').order('created_at')
    setTaskTypes(data || [])
    if (data?.length > 0 && !newTypeId) {
      const def = data.find(t => t.is_default) || data[0]
      setNewTypeId(def.id)
    }
  }

  async function addTask() {
    if (!newTitle.trim()) return
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order || 0)) : 0
    const { data } = await supabase.from('tasks').insert([{
      title: newTitle.trim(), description: newDesc.trim(),
      status: 'pending', sort_order: maxOrder + 1,
      type_id: newTypeId || null,
    }]).select().single()
    if (data) { setTasks(prev => [data, ...prev]); setNewTitle(''); setNewDesc(''); setShowForm(false) }
  }

  async function updateStatus(id, status) {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t))
  }

  async function discardTask(id) {
    await supabase.from('tasks').update({ status: 'discarded', updated_at: new Date().toISOString() }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'discarded' } : t))
  }

  async function restoreTask(task) {
    await supabase.from('tasks').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'pending' } : t))
    setFilter('all'); localStorage.setItem('tasks_filter','all')
  }

  async function deletePermanently(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function deleteAll() {
    const ids = tasks.filter(t => t.status === 'discarded').map(t => t.id)
    if (!ids.length) return
    await supabase.from('tasks').delete().in('id', ids)
    setTasks(prev => prev.filter(t => t.status !== 'discarded'))
  }

  // Drag reorder
  function onDragStart(e, idx) { dragItem.current = idx; e.dataTransfer.effectAllowed = 'move' }
  function onDragEnter(idx) { dragOver.current = idx }
  async function onDragEnd() {
    const from = dragItem.current, to = dragOver.current
    if (from === null || to === null || from === to) { dragItem.current = null; dragOver.current = null; return }
    const reordered = [...activeFiltered]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const updated = reordered.map((t, i) => ({ ...t, sort_order: i + 1 }))
    setTasks(prev => {
      const ids = new Set(activeFiltered.map(t => t.id))
      return [...updated, ...prev.filter(t => !ids.has(t.id))]
    })
    dragItem.current = null; dragOver.current = null
    await Promise.all(updated.map(t => supabase.from('tasks').update({ sort_order: t.sort_order }).eq('id', t.id)))
  }

  function sortActive(list) {
    const active = list.filter(t => t.status !== 'done')
    const done   = list.filter(t => t.status === 'done').sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    return [...active, ...done]
  }

  function getType(typeId) { return taskTypes.find(t => t.id === typeId) || null }

  const activeTasks    = tasks.filter(t => t.status !== 'discarded')
  const discardedTasks = tasks.filter(t => t.status === 'discarded')

  let activeFiltered = sortActive(
    activeTasks
      .filter(t => filter === 'all' ? true : t.status === filter)
      .filter(t => typeFilter === 'all' ? true : t.type_id === typeFilter)
  )

  const counts = ACTIVE_STATUSES.reduce((acc, s) => { acc[s.value] = activeTasks.filter(t => t.status === s.value).length; return acc }, {})

  return (
    <div className="space-y-5">
      {/* Type manager modal */}
      {showTypeManager && <TypeManager types={taskTypes} onRefresh={() => { loadTypes() }} onClose={() => setShowTypeManager(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Tareas</h1>
          <p className="muted mt-0.5 text-xs">{activeTasks.length} tareas activas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTypeManager(true)} className="btn-ghost text-xs py-1.5 px-3 gap-1.5">
            <Tag size={13} /> Tipos
          </button>
          {filter !== 'discarded' && (
            <button onClick={() => setShowForm(v => !v)}
              className={`btn-primary ${showForm ? '!bg-white/10 !shadow-none !text-zinc-300' : ''}`}>
              {showForm ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> Nueva</>}
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      <div className={`overflow-hidden transition-all duration-300 ${showForm && filter !== 'discarded' ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="card space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 25%, transparent)' }}>
          <input ref={titleRef} className="input" placeholder="Título de la tarea..."
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()} />
          <textarea className="input resize-none" rows={2} placeholder="Descripción (opcional)..."
            value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          {taskTypes.length > 0 && (
            <div>
              <label className="label">Tipo de actividad</label>
              <div className="flex flex-wrap gap-2">
                {taskTypes.map(t => (
                  <button key={t.id} onClick={() => setNewTypeId(t.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: newTypeId === t.id ? `${t.color || '#9ca3af'}25` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${newTypeId === t.id ? `${t.color || '#9ca3af'}60` : 'rgba(255,255,255,0.08)'}`,
                      color: newTypeId === t.id ? (t.color || '#9ca3af') : 'var(--text-muted)',
                    }}>
                    {t.icon_url ? <img src={t.icon_url} alt={t.name} className="w-3.5 h-3.5 rounded-full object-cover" /> : <div className="w-2 h-2 rounded-full" style={{ background: t.color || '#9ca3af' }} />}
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={addTask} className="btn-primary"><Plus size={15} /> Añadir</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => { setFilter('all'); localStorage.setItem('tasks_filter','all') }} className={`btn text-sm py-1 ${filter === 'all' ? 'bg-white/10 text-white' : 'btn-ghost'}`}>
          Todas <span className="ml-1 text-xs opacity-50">{activeTasks.length}</span>
        </button>
        {ACTIVE_STATUSES.map(s => (
          <button key={s.value} onClick={() => { setFilter(s.value); localStorage.setItem('tasks_filter', s.value) }} className={`btn text-sm py-1 ${filter === s.value ? 'bg-white/10 text-white' : 'btn-ghost'}`}>
            {s.label} <span className="ml-1 text-xs opacity-50">{counts[s.value]}</span>
          </button>
        ))}
        <button onClick={() => { setFilter('discarded'); localStorage.setItem('tasks_filter','discarded') }}
          className={`btn text-sm py-1 ml-auto ${filter === 'discarded' ? 'text-rose' : 'btn-ghost'}`}
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

      {/* Type filter pills */}
      {taskTypes.length > 1 && filter !== 'discarded' && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tipo:</span>
          <button onClick={() => setTypeFilter('all')}
            className={`text-xs px-2.5 py-0.5 rounded-full border transition-all ${typeFilter === 'all' ? 'text-white border-white/20 bg-white/10' : 'border-transparent text-zinc-500 hover:text-white'}`}>
            Todos
          </button>
          {taskTypes.map(t => (
            <button key={t.id} onClick={() => setTypeFilter(typeFilter === t.id ? 'all' : t.id)}
              className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full transition-all"
              style={{
                border: `1px solid ${typeFilter === t.id ? `${t.color || '#9ca3af'}60` : 'transparent'}`,
                background: typeFilter === t.id ? `${t.color || '#9ca3af'}15` : 'transparent',
                color: typeFilter === t.id ? (t.color || '#9ca3af') : 'rgba(255,255,255,0.4)',
              }}>
              {t.icon_url ? <img src={t.icon_url} alt={t.name} className="w-3 h-3 rounded-full object-cover" /> : <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color || '#9ca3af' }} />}
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="muted text-center py-12">Cargando...</p>
      ) : filter === 'discarded' ? (
        <TrashView tasks={discardedTasks} onRestore={restoreTask} onDeletePermanently={deletePermanently} onDeleteAll={deleteAll} />
      ) : activeFiltered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">✓</p>
          <p className="muted">No hay tareas en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeFiltered.map((task, index) => (
            <TaskCard key={task.id} task={task} taskType={getType(task.type_id)} index={index}
              onDiscard={discardTask}
              onStatusChange={updateStatus}
              onDragStart={onDragStart}
              onDragEnter={onDragEnter}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  )
}
