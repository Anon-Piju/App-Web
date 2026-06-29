import { useState, useEffect } from 'react'
import { Plus, Trash2, Flame, ChevronLeft, ChevronRight, Edit2, X, Check, BookOpen, Apple, Calendar } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

const MEAL_SLOTS = ['Desayuno', 'Almuerzo / Comida', 'Merienda', 'Cena']

// ── Macro color scheme: protein=rose, carbs=sky, fat=amber ───
const M = {
  cal:     { color: 'var(--text)',  label: 'kcal' },
  protein: { color: 'var(--rose)',  label: 'P' },
  carbs:   { color: 'var(--sky)',   label: 'H' },
  fat:     { color: 'var(--amber)', label: 'G' },
}

// Numbers only with colors, separated by · (middle dot). No letters, no labels.
function MacroDots({ cal, protein, carbs, fat, size = 'xs' }) {
  const fs = size === 'xs' ? '9px' : size === 'sm' ? '11px' : '13px'
  const items = [
    { val: Math.round(cal),     color: M.cal.color     },
    { val: Math.round(protein), color: M.protein.color },
    { val: Math.round(carbs),   color: M.carbs.color   },
    { val: Math.round(fat),     color: M.fat.color     },
  ]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2.5px', fontSize: fs }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
          {i > 0 && <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px', lineHeight: 1 }}>·</span>}
          <span style={{ color: it.color, fontWeight: 600 }}>{it.val}</span>
        </span>
      ))}
    </span>
  )
}


// ─── Macro bar ────────────────────────────────────────────────
function MacroBar({ protein, carbs, fat, calories }) {
  const total = protein * 4 + carbs * 4 + fat * 9
  if (!total) return null
  const pPct = Math.round((protein * 4 / total) * 100)
  const cPct = Math.round((carbs * 4 / total) * 100)
  const fPct = 100 - pPct - cPct
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-white">{Math.round(calories)}</span>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>kcal</span>
      </div>
      <div className="flex rounded-full overflow-hidden h-2.5">
        <div className="transition-all" style={{ width: `${pPct}%`, background: 'var(--rose)' }} />
        <div className="transition-all" style={{ width: `${cPct}%`, background: 'var(--sky)' }} />
        <div className="transition-all" style={{ width: `${fPct}%`, background: 'var(--amber)' }} />
      </div>
      <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span><span className="font-medium" style={{ color: 'var(--rose)' }}>{Math.round(protein)}g</span> proteína</span>
        <span><span className="font-medium" style={{ color: 'var(--sky)' }}>{Math.round(carbs)}g</span> hidratos</span>
        <span><span className="font-medium" style={{ color: 'var(--amber)' }}>{Math.round(fat)}g</span> grasas</span>
      </div>
    </div>
  )
}

// ─── Foods DB tab ─────────────────────────────────────────────
function FoodsTab({ foods, onAdd, onDelete, onUpdate }) {
  const emptyForm = { name: '', brand: '', cal: '', protein: '', carbs: '', fat: '' }
  const [form, setForm]       = useState(emptyForm)
  const [search, setSearch]   = useState('')
  const [editing, setEditing] = useState(null) // food id being edited

  async function save() {
    if (!form.name.trim() || !form.cal) return
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      calories_per_100g: parseFloat(form.cal),
      protein_per_100g: parseFloat(form.protein) || 0,
      carbs_per_100g: parseFloat(form.carbs) || 0,
      fat_per_100g: parseFloat(form.fat) || 0,
    }
    if (editing) {
      await onUpdate(editing, payload)
      setEditing(null)
    } else {
      await onAdd(payload)
    }
    setForm(emptyForm)
  }

  function startEdit(f) {
    setEditing(f.id)
    setForm({ name: f.name, brand: f.brand || '', cal: String(f.calories_per_100g),
      protein: String(f.protein_per_100g), carbs: String(f.carbs_per_100g), fat: String(f.fat_per_100g) })
  }

  function cancelEdit() { setEditing(null); setForm(emptyForm) }

  const filtered = foods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.brand || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">
          {editing ? 'Editar alimento' : 'Añadir alimento'} <span className="text-zinc-600 font-normal">(por 100g)</span>
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="input" placeholder="Marca (opcional)" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
          <input className="input" placeholder="kcal" type="number" value={form.cal} onChange={e => setForm(f => ({ ...f, cal: e.target.value }))} />
          <input className="input" placeholder="Proteína (g)" type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} />
          <input className="input" placeholder="Carbos (g)" type="number" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} />
          <input className="input" placeholder="Grasas (g)" type="number" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="btn-primary"><Plus size={15} /> {editing ? 'Guardar cambios' : 'Añadir alimento'}</button>
          {editing && <button onClick={cancelEdit} className="btn-ghost">Cancelar</button>}
        </div>
      </div>
      <input className="input" placeholder="Buscar alimento..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="space-y-1.5">
        {filtered.map(f => (
          <div key={f.id} className="card-sm flex items-center gap-3 group">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{f.name} {f.brand && <span className="text-zinc-500 font-normal text-xs">— {f.brand}</span>}</p>
              <div className="mt-0.5"><MacroDots cal={f.calories_per_100g} protein={f.protein_per_100g} carbs={f.carbs_per_100g} fat={f.fat_per_100g} /></div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => startEdit(f)} className="text-zinc-500 hover:text-accent-bright p-1">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(f.id)} className="text-zinc-500 hover:text-rose p-1">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="muted text-center py-4">Sin resultados.</p>}
      </div>
    </div>
  )
}

// ─── Recipes tab ──────────────────────────────────────────────
function RecipesTab({ recipes, foods, onSave, onUpdate, onDelete }) {
  const emptyForm = { name: '', servings: '1', ingredients: [] }
  const [form, setForm]         = useState(emptyForm)
  const [ing, setIng]           = useState({ food_id: '', quantity: '', unit: 'g' })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  function calcMacros(ingredients) {
    return ingredients.reduce((acc, ing) => {
      const food = foods.find(f => f.id === ing.food_id)
      if (!food) return acc
      // If unit is 'u' (units), quantity means number of units; 1 unit = 100g base
      const grams = ing.unit === 'u' ? parseFloat(ing.quantity) * 100 : parseFloat(ing.quantity)
      const factor = grams / 100
      return {
        cal:     acc.cal     + food.calories_per_100g * factor,
        protein: acc.protein + food.protein_per_100g  * factor,
        carbs:   acc.carbs   + food.carbs_per_100g    * factor,
        fat:     acc.fat     + food.fat_per_100g      * factor,
      }
    }, { cal: 0, protein: 0, carbs: 0, fat: 0 })
  }

  function addIng() {
    if (!ing.food_id || !ing.quantity) return
    const food = foods.find(f => f.id === ing.food_id)
    setForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...ing, id: Date.now(), food_name: food.name }]
    }))
    setIng({ food_id: '', quantity: '', unit: 'g' })
  }

  async function save() {
    if (!form.name.trim() || form.ingredients.length === 0) return
    const macros = calcMacros(form.ingredients)
    const payload = {
      name: form.name.trim(),
      servings: parseFloat(form.servings) || 1,
      ingredients: form.ingredients,
      calories_total: macros.cal,
      protein_total: macros.protein,
      carbs_total: macros.carbs,
      fat_total: macros.fat,
    }
    if (editingId) { await onUpdate(editingId, payload); setEditingId(null) }
    else { await onSave(payload) }
    setForm(emptyForm)
    setShowForm(false)
  }

  function startEdit(r) {
    setEditingId(r.id)
    setForm({ name: r.name, servings: String(r.servings), ingredients: r.ingredients || [] })
    setShowForm(true)
  }

  function cancel() { setShowForm(false); setEditingId(null); setForm(emptyForm) }

  const m = form.ingredients.length > 0 ? calcMacros(form.ingredients) : null

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary w-full justify-center">
          <Plus size={15} /> Nueva receta
        </button>
      ) : (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">{editingId ? 'Editar receta' : 'Nueva receta'}</h3>
            <button onClick={cancel} className="text-zinc-500 hover:text-white"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="input col-span-2" placeholder="Nombre de la receta" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Raciones" type="number" value={form.servings}
              onChange={e => setForm(f => ({ ...f, servings: e.target.value }))} />
          </div>
          {/* Ingredient rows */}
          {form.ingredients.map((ing, i) => {
            const food = foods.find(f => f.id === ing.food_id)
            return (
              <div key={ing.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="flex-1 text-zinc-300">{food?.name}</span>
                <span className="text-zinc-500 text-xs">{ing.quantity}{ing.unit === 'u' ? ' uds' : 'g'}</span>
                <button onClick={() => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))}
                  className="text-zinc-600 hover:text-rose"><Trash2 size={12} /></button>
              </div>
            )
          })}
          {/* Add ingredient row */}
          <div className="grid grid-cols-12 gap-2">
            <select className="select col-span-5" value={ing.food_id}
              onChange={e => setIng(i => ({ ...i, food_id: e.target.value }))}>
              <option value="">Ingrediente...</option>
              {foods.map(f => <option key={f.id} value={f.id}>{f.name}{f.brand ? ` (${f.brand})` : ''}</option>)}
            </select>
            <input className="input col-span-3" placeholder="Cantidad" type="number" value={ing.quantity}
              onChange={e => setIng(i => ({ ...i, quantity: e.target.value }))} />
            {/* Unit toggle g / u */}
            <div className="col-span-2 flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              {['g','u'].map(u => (
                <button key={u} onClick={() => setIng(i => ({ ...i, unit: u }))}
                  className="flex-1 text-xs font-medium transition-all"
                  style={{
                    background: ing.unit === u ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                    color: ing.unit === u ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}>
                  {u}
                </button>
              ))}
            </div>
            <button onClick={addIng} className="col-span-2 btn-ghost px-2 justify-center"><Plus size={14} /></button>
          </div>
          {m && (
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total:</span>
              <MacroDots cal={m.cal} protein={m.protein} carbs={m.carbs} fat={m.fat} />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary"><Check size={15} /> {editingId ? 'Guardar cambios' : 'Crear receta'}</button>
            <button onClick={cancel} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {recipes.map(r => (
          <div key={r.id} className="card-sm group flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{r.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <MacroDots cal={r.calories_total} protein={r.protein_total} carbs={r.carbs_total} fat={r.fat_total} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {r.servings} ración{r.servings !== 1 ? 'es' : ''}</span>
              </div>
              {r.ingredients?.length > 0 && (
                <p className="text-[11px] text-zinc-700 mt-0.5 truncate">
                  {r.ingredients.map(i => i.food_name).join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
              <button onClick={() => startEdit(r)} className="text-zinc-500 hover:text-accent-bright p-1"><Edit2 size={13} /></button>
              <button onClick={() => onDelete(r.id)} className="text-zinc-500 hover:text-rose p-1"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {recipes.length === 0 && <p className="muted text-center py-4">Sin recetas aún.</p>}
      </div>
    </div>
  )
}

// ─── Weekly planner ───────────────────────────────────────────
function WeeklyPlanner({ recipes, foods, weekStart, onNavigate }) {
  const [plan, setPlan]       = useState({})   // { 'YYYY-MM-DD_Slot': [{ recipe_id, servings }] }
  const [dragging, setDragging] = useState(null)
  const [expandedCell, setExpandedCell] = useState(null)
  const [addingTo, setAddingTo] = useState(null)  // 'YYYY-MM-DD_Slot'
  const [addForm, setAddForm]   = useState({ recipe_id: '', servings: '1' })
  const [editing, setEditing]   = useState(false)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => { loadPlan() }, [weekStart])

  async function loadPlan() {
    const from = format(weekStart, 'yyyy-MM-dd')
    const to   = format(addDays(weekStart, 6), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('meal_plan')
      .select('*')
      .gte('date', from)
      .lte('date', to)
    const map = {}
    ;(data || []).forEach(row => {
      const key = `${row.date}_${row.slot}`
      if (!map[key]) map[key] = []
      map[key].push(row)
    })
    setPlan(map)
  }

  async function addToPlan() {
    if (!addForm.recipe_id || !addingTo) return
    const [date, ...slotParts] = addingTo.split('_')
    const slot = slotParts.join('_')
    const recipe = recipes.find(r => r.id === addForm.recipe_id)
    const factor = parseFloat(addForm.servings) / (recipe.servings || 1)
    const { data } = await supabase.from('meal_plan').insert([{
      date, slot,
      recipe_id: addForm.recipe_id,
      recipe_name: recipe.name,
      servings: parseFloat(addForm.servings),
      calories: Math.round(recipe.calories_total * factor),
      protein_g: +(recipe.protein_total * factor).toFixed(1),
      carbs_g:   +(recipe.carbs_total   * factor).toFixed(1),
      fat_g:     +(recipe.fat_total     * factor).toFixed(1),
    }]).select().single()
    if (data) {
      const key = addingTo
      setPlan(prev => ({ ...prev, [key]: [...(prev[key] || []), data] }))
    }
    setAddingTo(null)
    setAddForm({ recipe_id: '', servings: '1' })
  }

  async function removeFromPlan(key, id) {
    await supabase.from('meal_plan').delete().eq('id', id)
    setPlan(prev => ({ ...prev, [key]: (prev[key] || []).filter(r => r.id !== id) }))
  }

  // drag from recipe list onto a cell
  function onDrop(e, key) {
    e.preventDefault()
    const recipeId = e.dataTransfer.getData('recipeId')
    if (!recipeId) return
    setAddingTo(key)
    setAddForm({ recipe_id: recipeId, servings: '1' })
  }

  // daily totals
  function dayTotals(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    return MEAL_SLOTS.reduce((acc, slot) => {
      const key = `${dateStr}_${slot}`;
      (plan[key] || []).forEach(r => {
        acc.cal     += r.calories   || 0
        acc.protein += r.protein_g  || 0
        acc.carbs   += r.carbs_g    || 0
        acc.fat     += r.fat_g      || 0
      })
      return acc
    }, { cal: 0, protein: 0, carbs: 0, fat: 0 })
  }

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => onNavigate(-1)} className="btn-ghost px-2"><ChevronLeft size={16} /></button>
        <p className="text-sm font-medium text-white">
          {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}
        </p>
        <button onClick={() => onNavigate(1)} className="btn-ghost px-2"><ChevronRight size={16} /></button>
      </div>

      {/* Edit mode toggle */}
      <div className="flex justify-end">
        <button onClick={() => setEditing(v => !v)}
          className={`btn text-xs py-1 gap-1 ${editing ? 'btn-primary' : 'btn-ghost'}`}>
          <Edit2 size={12} /> {editing ? 'Terminando de editar' : 'Editar semana'}
        </button>
      </div>

      {/* Grid */}
      <div className="week-scroll"><div className="grid grid-cols-7 gap-1.5">
        {days.map(day => {
          const isToday = isSameDay(day, new Date())
          const totals = dayTotals(day)
          return (
            <div key={day.toISOString()} className="space-y-1">
              <div className={`week-day-header ${isToday ? 'today' : ''}`}>
                <div className="text-zinc-400 uppercase tracking-wider" style={{fontSize:'10px'}}>{format(day, 'EEE', { locale: es })}</div>
                <div className="font-bold text-white text-sm">{format(day, 'd')}</div>
                {totals.cal > 0 && (
                  <div className="mt-0.5"><MacroDots cal={totals.cal} protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size="xs" /></div>
                )}
              </div>
              {MEAL_SLOTS.map(slot => {
                const key = `${format(day, 'yyyy-MM-dd')}_${slot}`
                const items = plan[key] || []
                const isExpanded = expandedCell === key
                return (
                  <div key={slot}
                    onDragOver={editing ? e => e.preventDefault() : undefined}
                    onDrop={editing ? e => onDrop(e, key) : undefined}
                    onClick={() => !editing && setExpandedCell(isExpanded ? null : key)}
                    style={items.length > 0 ? {
                      background: 'rgba(124,106,247,0.12)',
                      border: '1px solid rgba(124,106,247,0.35)',
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    className={`rounded-xl text-[10px] transition-all cursor-pointer min-h-[38px]
                      hover:border-accent/50 hover:bg-accent/10
                      ${isExpanded ? 'ring-1 ring-accent/60' : ''}`}>
                    {/* Collapsed view */}
                    {!isExpanded && (
                      <div className="p-1.5">
                        {items.length === 0 ? (
                          <p className="text-center leading-tight font-medium" style={{color:'rgba(255,255,255,0.25)', fontSize:'9px'}}>{slot.split('/')[0].trim()}</p>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="leading-tight font-semibold uppercase" style={{color:'rgba(124,106,247,0.8)', fontSize:'8px', letterSpacing:'0.05em'}}>{slot.split('/')[0].trim()}</p>
                            {items.map(it => (
                              <div key={it.id} className="leading-tight">
                                <p className="text-white truncate font-medium" style={{fontSize:'12.5px'}}>{it.recipe_name}</p>
                                <MacroDots cal={it.calories||0} protein={it.protein_g||0} carbs={it.carbs_g||0} fat={it.fat_g||0} size="xs" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Expanded view */}
                    {isExpanded && (
                      <div className="p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-zinc-400 font-medium">{slot}</p>
                          <button onClick={e => { e.stopPropagation(); setExpandedCell(null) }}
                            className="text-zinc-600 hover:text-white"><X size={11} /></button>
                        </div>
                        {items.map(it => (
                          <div key={it.id} className="flex items-center gap-1 group/it">
                            <div className="flex-1 min-w-0">
                              <p className="text-zinc-200 truncate">{it.recipe_name}</p>
                              <p className="text-zinc-600">{it.calories} kcal · P:{it.protein_g}g</p>
                            </div>
                            {editing && (
                              <button onClick={e => { e.stopPropagation(); removeFromPlan(key, it.id) }}
                                className="opacity-0 group-hover/it:opacity-100 text-rose"><Trash2 size={10} /></button>
                            )}
                          </div>
                        ))}
                        {editing && (
                          <button onClick={e => { e.stopPropagation(); setAddingTo(key) }}
                            className="btn-ghost text-[10px] py-0.5 w-full justify-center">
                            <Plus size={10} /> añadir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div></div>

      {/* Weekly macro summary — below calendar */}
      {(() => {
        const allItems = Object.values(plan).flat()
        const wTotals = allItems.reduce((a, r) => ({
          cal: a.cal + (r.calories || 0),
          protein: a.protein + (r.protein_g || 0),
          carbs: a.carbs + (r.carbs_g || 0),
          fat: a.fat + (r.fat_g || 0),
        }), { cal: 0, protein: 0, carbs: 0, fat: 0 })
        if (wTotals.cal === 0) return null
        return (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">{Math.round(wTotals.cal)}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>kcal · media {Math.round(wTotals.cal/7)}/día</span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <span style={{ color: 'var(--rose)', fontWeight: 700 }}>{Math.round(wTotals.protein)}</span>
                  <span style={{ color: 'var(--rose)', opacity: 0.7, fontSize: '10px' }}>P</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px' }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <span style={{ color: 'var(--sky)', fontWeight: 700 }}>{Math.round(wTotals.carbs)}</span>
                  <span style={{ color: 'var(--sky)', opacity: 0.7, fontSize: '10px' }}>H</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px' }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{Math.round(wTotals.fat)}</span>
                  <span style={{ color: 'var(--amber)', opacity: 0.7, fontSize: '10px' }}>G</span>
                </span>
              </span>
            </div>
            <div className="flex rounded-full overflow-hidden h-1.5">
              {(() => {
                const total = wTotals.protein*4 + wTotals.carbs*4 + wTotals.fat*9
                if (!total) return null
                const pPct = (wTotals.protein*4/total)*100
                const cPct = (wTotals.carbs*4/total)*100
                const fPct = 100 - pPct - cPct
                return (<>
                  <div style={{ width: `${pPct}%`, background: 'var(--rose)' }} />
                  <div style={{ width: `${cPct}%`, background: 'var(--sky)' }} />
                  <div style={{ width: `${fPct}%`, background: 'var(--amber)' }} />
                </>)
              })()}
            </div>
          </div>
        )
      })()}

      {/* Add-to-plan modal */}
      {addingTo && (
        <div className="card space-y-3 border-accent/30">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Añadir a {addingTo.split('_').slice(1).join(' ')}</p>
            <button onClick={() => setAddingTo(null)}><X size={15} className="text-zinc-500" /></button>
          </div>
          <select className="select" value={addForm.recipe_id}
            onChange={e => setAddForm(f => ({ ...f, recipe_id: e.target.value }))}>
            <option value="">Selecciona una receta...</option>
            {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({Math.round(r.calories_total)} kcal / {r.servings} ración)</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-zinc-400 whitespace-nowrap">Raciones:</label>
            <input className="input w-20" type="number" step="0.5" value={addForm.servings}
              onChange={e => setAddForm(f => ({ ...f, servings: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={addToPlan} className="btn-primary"><Check size={15} /> Añadir</button>
            <button onClick={() => setAddingTo(null)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      {/* Drag hint */}
      {editing && recipes.length > 0 && (
        <div className="card-sm">
          <p className="text-xs text-zinc-500 mb-2">Arrastra una receta al día que quieras:</p>
          <div className="flex flex-wrap gap-1.5">
            {recipes.map(r => (
              <div key={r.id} draggable
                onDragStart={e => e.dataTransfer.setData('recipeId', r.id)}
                className="badge bg-surface-300 text-zinc-300 cursor-grab active:cursor-grabbing text-xs">
                {r.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Daily log tab ────────────────────────────────────────────
function DailyLog({ foods, recipes }) {
  const [meals, setMeals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [form, setForm]     = useState({ meal_type: 'Almuerzo / Comida', food_id: '', quantity: '' })

  useEffect(() => { loadMeals() }, [selectedDate])

  async function loadMeals() {
    setLoading(true)
    const { data } = await supabase.from('nutrition_logs').select('*')
      .eq('date', selectedDate).order('created_at')
    setMeals(data || [])
    setLoading(false)
  }

  async function addEntry() {
    if (!form.food_id || !form.quantity) return
    const food = foods.find(f => f.id === form.food_id)
    if (!food) return
    const factor = parseFloat(form.quantity) / 100
    const { data, error } = await supabase.from('nutrition_logs').insert([{
      date: selectedDate,
      meal_type: form.meal_type,
      food_id: form.food_id,
      food_name: food.name,
      quantity_g: parseFloat(form.quantity),
      calories:  Math.round(food.calories_per_100g * factor),
      protein_g: +(food.protein_per_100g * factor).toFixed(1),
      carbs_g:   +(food.carbs_per_100g   * factor).toFixed(1),
      fat_g:     +(food.fat_per_100g     * factor).toFixed(1),
    }]).select().single()
    if (!error) { setMeals(prev => [...prev, data]); setForm(f => ({ ...f, food_id: '', quantity: '' })) }
  }

  async function deleteEntry(id) {
    await supabase.from('nutrition_logs').delete().eq('id', id)
    setMeals(prev => prev.filter(m => m.id !== id))
  }

  const totals = meals.reduce((acc, m) => ({
    cal: acc.cal + (m.calories || 0), protein: acc.protein + (m.protein_g || 0),
    carbs: acc.carbs + (m.carbs_g || 0), fat: acc.fat + (m.fat_g || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 })

  const byType = MEAL_SLOTS.map(type => ({
    type, entries: meals.filter(m => m.meal_type === type)
  })).filter(g => g.entries.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="date" className="input w-auto" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)} />
      </div>
      <MacroBar protein={totals.protein} carbs={totals.carbs} fat={totals.fat} calories={totals.cal} />
      <div className="card space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Registrar alimento</h3>
        <div className="grid grid-cols-3 gap-2">
          <select className="select" value={form.meal_type}
            onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))}>
            {MEAL_SLOTS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="select" value={form.food_id}
            onChange={e => setForm(f => ({ ...f, food_id: e.target.value }))}>
            <option value="">Alimento...</option>
            {foods.map(f => <option key={f.id} value={f.id}>{f.name}{f.brand ? ` (${f.brand})` : ''}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="input" placeholder="g" type="number" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addEntry()} />
            <button onClick={addEntry} className="btn-primary px-3"><Plus size={15} /></button>
          </div>
        </div>
      </div>
      {loading ? <p className="muted text-center py-4">Cargando...</p> :
       byType.length === 0 ? <p className="muted text-center py-4">Nada registrado para este día.</p> : (
        <div className="space-y-3">
          {byType.map(({ type, entries }) => (
            <div key={type} className="card space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white text-sm">{type}</h3>
                <MacroDots
                  cal={entries.reduce((a,e)=>a+(e.calories||0),0)}
                  protein={entries.reduce((a,e)=>a+(e.protein_g||0),0)}
                  carbs={entries.reduce((a,e)=>a+(e.carbs_g||0),0)}
                  fat={entries.reduce((a,e)=>a+(e.fat_g||0),0)}
                  size="xs"
                />
              </div>
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 group py-1 border-t border-surface-300">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{entry.food_name}</p>
                    <p className="text-xs text-zinc-600">{entry.quantity_g}g</p>
                  </div>
                  <div className="text-right">
                    <MacroDots cal={entry.calories||0} protein={entry.protein_g||0} carbs={entry.carbs_g||0} fat={entry.fat_g||0} size="xs" />
                  </div>
                  <button onClick={() => deleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────
export default function Nutrition() {
  const [tab, setTab]       = useState('weekly')
  const [foods, setFoods]   = useState([])
  const [recipes, setRecipes] = useState([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  useEffect(() => { loadFoods(); loadRecipes() }, [])

  async function loadFoods() {
    const { data } = await supabase.from('foods').select('*').order('name')
    setFoods(data || [])
  }

  async function loadRecipes() {
    const { data } = await supabase.from('recipes').select('*').order('name')
    setRecipes(data || [])
  }

  async function addFood(food) {
    const { data } = await supabase.from('foods').insert([food]).select().single()
    if (data) setFoods(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function deleteFood(id) {
    await supabase.from('foods').delete().eq('id', id)
    setFoods(prev => prev.filter(f => f.id !== id))
  }

  async function updateRecipe(id, recipe) {
    const { data } = await supabase.from('recipes').update(recipe).eq('id', id).select().single()
    if (data) setRecipes(prev => prev.map(r => r.id === id ? data : r))
  }

  async function updateFood(id, food) {
    const { data } = await supabase.from('foods').update(food).eq('id', id).select().single()
    if (data) setFoods(prev => prev.map(f => f.id === id ? data : f).sort((a,b) => a.name.localeCompare(b.name)))
  }

  async function saveRecipe(recipe) {
    const { data } = await supabase.from('recipes').insert([{
      name: recipe.name,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      calories_total: recipe.calories_total,
      protein_total: recipe.protein_total,
      carbs_total: recipe.carbs_total,
      fat_total: recipe.fat_total,
    }]).select().single()
    if (data) setRecipes(prev => [...prev, data])
  }

  async function deleteRecipe(id) {
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  const TABS = [
    { v: 'weekly',  l: 'Menú semanal',    icon: Calendar },
    { v: 'daily',   l: 'Registro diario', icon: Flame },
    { v: 'recipes', l: 'Recetas',         icon: BookOpen },
    { v: 'foods',   l: 'Alimentos',       icon: Apple },
  ]

  return (
    <div className="space-y-5">
      <h1 className="section-title">Nutrición</h1>
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(({ v, l, icon: Icon }) => (
          <button key={v} onClick={() => setTab(v)}
            className={`btn text-sm py-1.5 gap-1.5 ${tab === v ? 'bg-surface-400 text-white' : 'btn-ghost'}`}>
            <Icon size={13} /> {l}
          </button>
        ))}
      </div>

      {tab === 'daily'   && <DailyLog foods={foods} recipes={recipes} />}
      {tab === 'weekly'  && <WeeklyPlanner recipes={recipes} foods={foods} weekStart={weekStart}
                              onNavigate={dir => setWeekStart(w => dir > 0 ? addWeeks(w, 1) : subWeeks(w, 1))} />}
      {tab === 'recipes' && <RecipesTab recipes={recipes} foods={foods} onSave={saveRecipe} onUpdate={updateRecipe} onDelete={deleteRecipe} />}
      {tab === 'foods'   && <FoodsTab foods={foods} onAdd={addFood} onUpdate={updateFood} onDelete={deleteFood} />}
    </div>
  )
}
