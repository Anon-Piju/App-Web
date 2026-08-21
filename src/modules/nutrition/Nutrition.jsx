import { useState, useEffect } from 'react'
import { Plus, Trash2, Flame, ChevronLeft, ChevronRight, Edit2, X, Check, BookOpen, Apple, Calendar, LayoutTemplate, Repeat, Save, Search, ChefHat } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

const MEAL_SLOTS = ['Desayuno', 'Comida', 'Merienda', 'Cena']
const DAY_LABELS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// ── Macro color scheme: protein=rose, carbs=sky, fat=amber ───
const M = {
  cal:     { color: 'var(--text)' },
  protein: { color: 'var(--rose)' },
  carbs:   { color: 'var(--sky)' },
  fat:     { color: 'var(--amber)' },
}

// Numbers only with colors, separated by · (middle dot). No letters, no labels.
function MacroDots({ cal, protein, carbs, fat, size = 'xs' }) {
  const fs = size === 'xs' ? '9px' : size === 'sm' ? '11px' : '13px'
  const items = [
    { val: Math.round(cal || 0),     color: M.cal.color     },
    { val: Math.round(protein || 0), color: M.protein.color },
    { val: Math.round(carbs || 0),   color: M.carbs.color   },
    { val: Math.round(fat || 0),     color: M.fat.color     },
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
  const [editing, setEditing] = useState(null)

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
    if (editing) { await onUpdate(editing, payload); setEditing(null) }
    else { await onAdd(payload) }
    setForm(emptyForm)
  }

  function startEdit(f) {
    document.getElementById('app-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
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
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input className="input pl-8" placeholder="Buscar alimento..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        {filtered.map(f => (
          <div key={f.id} className="card-sm flex items-center gap-3 group">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{f.name} {f.brand && <span className="text-zinc-500 font-normal text-xs">— {f.brand}</span>}</p>
              <div className="mt-0.5"><MacroDots cal={f.calories_per_100g} protein={f.protein_per_100g} carbs={f.carbs_per_100g} fat={f.fat_per_100g} /></div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => startEdit(f)} className="text-zinc-500 hover:text-accent-bright p-1"><Edit2 size={13} /></button>
              <button onClick={() => onDelete(f.id)} className="text-zinc-500 hover:text-rose p-1"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="muted text-center py-4">Sin resultados.</p>}
      </div>
    </div>
  )
}

// ─── Recipes tab ──────────────────────────────────────────────
// A recipe is treated exactly like a food once saved: it gets its own
// calories_per_100g / protein_per_100g / carbs_per_100g / fat_per_100g,
// computed automatically from the sum of its ingredients. No "raciones"
// involved anywhere in this calculation — pure per-100g, like any food.
function RecipesTab({ recipes, foods, onSave, onUpdate, onDelete }) {
  const emptyForm = { name: '', servings: '1', ingredients: [] }
  const [form, setForm]         = useState(emptyForm)
  const [ingType, setIngType]   = useState('food') // 'food' | 'recipe'
  const [ing, setIng]           = useState({ food_id: '', quantity: '' })
  const [ingRecipe, setIngRecipe] = useState({ recipe_id: '', quantity: '' })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch]     = useState('')

  // Per-100g nutrition of a recipe — prefer the stored value (fast path),
  // fall back to live computation from its ingredients (covers legacy rows).
  function recipePer100g(rec) {
    if (rec.calories_per_100g != null) {
      return {
        cal: rec.calories_per_100g,
        protein: rec.protein_per_100g || 0,
        carbs: rec.carbs_per_100g || 0,
        fat: rec.fat_per_100g || 0,
      }
    }
    const totalG = (rec.ingredients || []).reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0)
    if (!totalG) return { cal: 0, protein: 0, carbs: 0, fat: 0 }
    return {
      cal: (rec.calories_total || 0) / totalG * 100,
      protein: (rec.protein_total || 0) / totalG * 100,
      carbs: (rec.carbs_total || 0) / totalG * 100,
      fat: (rec.fat_total || 0) / totalG * 100,
    }
  }

  // Macros contributed by one ingredient — food (per 100g) or recipe (per 100g, same rule)
  function ingredientMacros(item) {
    const grams = parseFloat(item.quantity) || 0
    const factor = grams / 100
    if (item.type === 'recipe') {
      const rec = recipes.find(r => r.id === item.recipe_id)
      if (!rec) return { cal: 0, protein: 0, carbs: 0, fat: 0 }
      const per100 = recipePer100g(rec)
      return { cal: per100.cal * factor, protein: per100.protein * factor, carbs: per100.carbs * factor, fat: per100.fat * factor }
    }
    const food = foods.find(f => f.id === item.food_id)
    if (!food) return { cal: 0, protein: 0, carbs: 0, fat: 0 }
    return {
      cal: food.calories_per_100g * factor,
      protein: food.protein_per_100g * factor,
      carbs: food.carbs_per_100g * factor,
      fat: food.fat_per_100g * factor,
    }
  }

  function calcMacros(ingredients) {
    return ingredients.reduce((acc, item) => {
      const m = ingredientMacros(item)
      return { cal: acc.cal + m.cal, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }
    }, { cal: 0, protein: 0, carbs: 0, fat: 0 })
  }

  function calcTotalGrams(ingredients) {
    return ingredients.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
  }

  function addIng() {
    if (ingType === 'recipe') {
      if (!ingRecipe.recipe_id || !ingRecipe.quantity) return
      const rec = recipes.find(r => r.id === ingRecipe.recipe_id)
      if (!rec) return
      setForm(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, { type: 'recipe', recipe_id: ingRecipe.recipe_id, quantity: ingRecipe.quantity, recipe_name: rec.name, id: Date.now() }]
      }))
      setIngRecipe({ recipe_id: '', quantity: '' })
    } else {
      if (!ing.food_id || !ing.quantity) return
      const food = foods.find(f => f.id === ing.food_id)
      if (!food) return
      setForm(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, { type: 'food', food_id: ing.food_id, quantity: ing.quantity, food_name: food.name, id: Date.now() }]
      }))
      setIng({ food_id: '', quantity: '' })
    }
  }

  async function save() {
    if (!form.name.trim() || form.ingredients.length === 0) return
    const macros = calcMacros(form.ingredients)
    const totalG = calcTotalGrams(form.ingredients)
    const payload = {
      name: form.name.trim(),
      servings: parseFloat(form.servings) || 1,
      ingredients: form.ingredients,
      calories_total: macros.cal,
      protein_total: macros.protein,
      carbs_total: macros.carbs,
      fat_total: macros.fat,
      total_grams: totalG || null,
      calories_per_100g: totalG ? macros.cal / totalG * 100 : null,
      protein_per_100g:  totalG ? macros.protein / totalG * 100 : null,
      carbs_per_100g:    totalG ? macros.carbs / totalG * 100 : null,
      fat_per_100g:      totalG ? macros.fat / totalG * 100 : null,
    }
    if (editingId) { await onUpdate(editingId, payload); setEditingId(null) }
    else { await onSave(payload) }
    setForm(emptyForm)
    setShowForm(false)
  }

  function startEdit(r) {
    document.getElementById('app-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
    setEditingId(r.id)
    setForm({ name: r.name, servings: String(r.servings), ingredients: r.ingredients || [] })
    setShowForm(true)
  }
  function cancel() { setShowForm(false); setEditingId(null); setForm(emptyForm) }

  const m = form.ingredients.length > 0 ? calcMacros(form.ingredients) : null
  const recipeOptions = recipes.filter(r => r.id !== editingId)
  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

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
            <input className="input col-span-2" placeholder="Raciones que da la receta" type="number" value={form.servings}
              onChange={e => setForm(f => ({ ...f, servings: e.target.value }))} />
          </div>

          {form.ingredients.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {item.type === 'recipe' && <ChefHat size={12} className="flex-shrink-0" style={{ color: 'var(--accent-bright)' }} />}
              <span className="flex-1 text-zinc-300">{item.type === 'recipe' ? item.recipe_name : item.food_name}</span>
              <span className="text-zinc-500 text-xs">{item.quantity}g</span>
              <button onClick={() => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))}
                className="text-zinc-600 hover:text-rose"><Trash2 size={12} /></button>
            </div>
          ))}

          <div className="flex rounded-lg overflow-hidden border w-fit" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {[{ v: 'food', l: 'Alimento' }, { v: 'recipe', l: 'Receta' }].map(({ v, l }) => (
              <button key={v} onClick={() => setIngType(v)}
                className="px-3 py-1 text-xs font-medium transition-all"
                style={{ background: ingType === v ? 'var(--accent)' : 'rgba(255,255,255,0.04)', color: ingType === v ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {l}
              </button>
            ))}
          </div>

          {ingType === 'food' && (
            <div className="grid grid-cols-12 gap-2">
              <select className="select col-span-7" value={ing.food_id} onChange={e => setIng(i => ({ ...i, food_id: e.target.value }))}>
                <option value="">Ingrediente...</option>
                {foods.map(f => <option key={f.id} value={f.id}>{f.name}{f.brand ? ` (${f.brand})` : ''}</option>)}
              </select>
              <input className="input col-span-3" placeholder="Gramos" type="number" value={ing.quantity}
                onChange={e => setIng(i => ({ ...i, quantity: e.target.value }))} />
              <button onClick={addIng} className="col-span-2 btn-ghost px-2 justify-center"><Plus size={14} /></button>
            </div>
          )}

          {ingType === 'recipe' && (
            <div className="grid grid-cols-12 gap-2">
              <select className="select col-span-7" value={ingRecipe.recipe_id} onChange={e => setIngRecipe(i => ({ ...i, recipe_id: e.target.value }))}>
                <option value="">Receta...</option>
                {recipeOptions.map(r => {
                  const p = recipePer100g(r)
                  return <option key={r.id} value={r.id}>{r.name} — {Math.round(p.cal)} kcal/100g</option>
                })}
              </select>
              <input className="input col-span-3" placeholder="Gramos" type="number" value={ingRecipe.quantity}
                onChange={e => setIngRecipe(i => ({ ...i, quantity: e.target.value }))} />
              <button onClick={addIng} className="col-span-2 btn-ghost px-2 justify-center"><Plus size={14} /></button>
            </div>
          )}
          {ingType === 'recipe' && recipeOptions.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aún no tienes otras recetas creadas para usar como ingrediente.</p>
          )}

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

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input className="input pl-8" placeholder="Buscar receta..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filteredRecipes.map(r => {
          const p = recipePer100g(r)
          return (
            <div key={r.id} className="card-sm group flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{r.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <MacroDots cal={r.calories_total} protein={r.protein_total} carbs={r.carbs_total} fat={r.fat_total} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    · {r.servings} ración{r.servings !== 1 ? 'es' : ''} ·{' '}
                    {Math.round(p.cal)}·{Math.round(p.protein)}·{Math.round(p.carbs)}·{Math.round(p.fat)} /100g
                  </span>
                </div>
                {r.ingredients?.length > 0 && (
                  <p className="text-[11px] text-zinc-700 mt-0.5 truncate">
                    {r.ingredients.map(i => i.type === 'recipe' ? `🍳 ${i.recipe_name}` : i.food_name).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                <button onClick={() => startEdit(r)} className="text-zinc-500 hover:text-accent-bright p-1"><Edit2 size={13} /></button>
                <button onClick={() => onDelete(r.id)} className="text-zinc-500 hover:text-rose p-1"><Trash2 size={13} /></button>
              </div>
            </div>
          )
        })}
        {filteredRecipes.length === 0 && <p className="muted text-center py-4">{search ? 'Sin resultados.' : 'Sin recetas aún.'}</p>}
      </div>
    </div>
  )
}

// ─── Add item to a meal-plan slot: Food or Recipe ──────────────
function AddMealItemModal({ slotLabel, foods, recipes, onAddFood, onAddRecipe, onClose }) {
  const [type, setType] = useState('recipe') // 'recipe' | 'food'
  const [recipeForm, setRecipeForm] = useState({ recipe_id: '', servings: '1' })
  const [foodForm, setFoodForm]     = useState({ food_id: '', quantity: '' })

  return (
    <div className="card space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Añadir a {slotLabel}</p>
        <button onClick={onClose}><X size={15} className="text-zinc-500" /></button>
      </div>

      <div className="flex rounded-lg overflow-hidden border w-fit" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        {[{ v: 'recipe', l: 'Receta' }, { v: 'food', l: 'Alimento' }].map(({ v, l }) => (
          <button key={v} onClick={() => setType(v)}
            className="px-3 py-1 text-xs font-medium transition-all"
            style={{ background: type === v ? 'var(--accent)' : 'rgba(255,255,255,0.04)', color: type === v ? '#fff' : 'rgba(255,255,255,0.5)' }}>
            {l}
          </button>
        ))}
      </div>

      {type === 'recipe' ? (
        <>
          <select className="select" value={recipeForm.recipe_id} onChange={e => setRecipeForm(f => ({ ...f, recipe_id: e.target.value }))}>
            <option value="">Selecciona una receta...</option>
            {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({Math.round(r.calories_total)} kcal / {r.servings} ración)</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-zinc-400 whitespace-nowrap">Raciones:</label>
            <input className="input w-20" type="number" step="0.5" value={recipeForm.servings}
              onChange={e => setRecipeForm(f => ({ ...f, servings: e.target.value }))} />
          </div>
          <button onClick={() => recipeForm.recipe_id && recipeForm.servings && onAddRecipe(recipeForm)} className="btn-primary w-full justify-center">
            <Check size={15} /> Añadir receta
          </button>
        </>
      ) : (
        <>
          <select className="select" value={foodForm.food_id} onChange={e => setFoodForm(f => ({ ...f, food_id: e.target.value }))}>
            <option value="">Selecciona un alimento...</option>
            {foods.map(f => <option key={f.id} value={f.id}>{f.name}{f.brand ? ` (${f.brand})` : ''}</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-zinc-400 whitespace-nowrap">Gramos:</label>
            <input className="input w-24" type="number" value={foodForm.quantity}
              onChange={e => setFoodForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <button onClick={() => foodForm.food_id && foodForm.quantity && onAddFood(foodForm)} className="btn-primary w-full justify-center">
            <Check size={15} /> Añadir alimento
          </button>
        </>
      )}
    </div>
  )
}

// ─── Save-as-template modal ─────────────────────────────────────
function SaveTemplateModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  return (
    <div className="card space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Guardar semana como plantilla</p>
        <button onClick={onClose}><X size={15} className="text-zinc-500" /></button>
      </div>
      <input className="input" placeholder="Nombre de la plantilla" value={name}
        onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())} />
      <div className="flex gap-2">
        <button onClick={() => name.trim() && onSave(name.trim())} className="btn-primary"><Save size={14} /> Guardar</button>
        <button onClick={onClose} className="btn-ghost">Cancelar</button>
      </div>
    </div>
  )
}

// ─── Apply-template modal ───────────────────────────────────────
function ApplyTemplateModal({ template, onApply, onClose }) {
  const [weeks, setWeeks] = useState(4)
  const [startWeek, setStartWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  return (
    <div className="card space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Aplicar "{template.name}"</p>
        <button onClick={onClose}><X size={15} className="text-zinc-500" /></button>
      </div>
      <div>
        <label className="label">Semana de inicio</label>
        <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setStartWeek(w => subWeeks(w, 1))} className="text-zinc-400 hover:text-white"><ChevronLeft size={16} /></button>
          <p className="text-sm text-white font-medium">{format(startWeek, "d MMM", { locale: es })} — {format(addDays(startWeek, 6), "d MMM", { locale: es })}</p>
          <button onClick={() => setStartWeek(w => addWeeks(w, 1))} className="text-zinc-400 hover:text-white"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div>
        <label className="label">Repetir durante</label>
        <div className="flex items-center gap-2">
          <input className="input w-24" type="number" min="1" max="52" value={weeks} onChange={e => setWeeks(parseInt(e.target.value) || 1)} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>semana{weeks !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <p className="text-xs" style={{ color: 'var(--rose)' }}>Esto reemplazará lo ya planificado en esas {weeks} semana{weeks !== 1 ? 's' : ''}.</p>
      <div className="flex gap-2">
        <button onClick={() => onApply(startWeek, weeks)} className="btn-primary"><Repeat size={14} /> Aplicar</button>
        <button onClick={onClose} className="btn-ghost">Cancelar</button>
      </div>
    </div>
  )
}

// ─── Template editor (day-of-week based, recipes only for now) ─
function TemplateEditor({ template, recipes, onClose }) {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [addingTo, setAddingTo] = useState(null)
  const [addForm, setAddForm]   = useState({ recipe_id: '', servings: '1' })
  const [expandedCell, setExpandedCell] = useState(null)

  useEffect(() => { load() }, [template.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('meal_template_items').select('*').eq('template_id', template.id)
    setItems(data || [])
    setLoading(false)
  }

  function cellItems(dow, slot) { return items.filter(i => i.day_of_week === dow && i.slot === slot) }

  async function addItem() {
    if (!addForm.recipe_id || !addingTo) return
    const [dowStr, ...slotParts] = addingTo.split('_')
    const dow = parseInt(dowStr), slot = slotParts.join('_')
    const recipe = recipes.find(r => r.id === addForm.recipe_id)
    if (!recipe) return
    const factor = parseFloat(addForm.servings) / (recipe.servings || 1)
    const { data } = await supabase.from('meal_template_items').insert([{
      template_id: template.id, day_of_week: dow, slot, type: 'recipe',
      recipe_id: addForm.recipe_id, recipe_name: recipe.name, servings: parseFloat(addForm.servings),
      calories: Math.round(recipe.calories_total * factor),
      protein_g: +(recipe.protein_total * factor).toFixed(1),
      carbs_g:   +(recipe.carbs_total   * factor).toFixed(1),
      fat_g:     +(recipe.fat_total     * factor).toFixed(1),
    }]).select().single()
    if (data) setItems(prev => [...prev, data])
    setAddingTo(null)
    setAddForm({ recipe_id: '', servings: '1' })
  }

  async function removeItem(id) {
    await supabase.from('meal_template_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function dayTotals(dow) {
    return MEAL_SLOTS.reduce((acc, slot) => {
      cellItems(dow, slot).forEach(it => {
        acc.cal += it.calories || 0; acc.protein += it.protein_g || 0; acc.carbs += it.carbs_g || 0; acc.fat += it.fat_g || 0
      })
      return acc
    }, { cal: 0, protein: 0, carbs: 0, fat: 0 })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{template.name}</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clic en cualquier comida para editarla o eliminarla</p>
        </div>
        <button onClick={onClose} className="btn-ghost text-sm py-1.5"><X size={14} /> Cerrar</button>
      </div>

      {loading ? <p className="muted text-center py-8">Cargando...</p> : (
        <div className="week-scroll"><div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS_FULL.map((label, dow) => {
            const totals = dayTotals(dow)
            return (
              <div key={dow} className="space-y-1">
                <div className="week-day-header">
                  <div className="text-zinc-400 uppercase tracking-wider" style={{ fontSize: '10px' }}>{label.slice(0, 3)}</div>
                  {totals.cal > 0 && <div className="mt-0.5"><MacroDots cal={totals.cal} protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size="xs" /></div>}
                </div>
                {MEAL_SLOTS.map(slot => {
                  const key = `${dow}_${slot}`
                  const cItems = cellItems(dow, slot)
                  const isExpanded = expandedCell === key
                  return (
                    <div key={slot} onClick={() => setExpandedCell(isExpanded ? null : key)}
                      style={cItems.length > 0
                        ? { background: 'rgba(124,106,247,0.12)', border: '1px solid rgba(124,106,247,0.35)' }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                      className={`rounded-xl text-[10px] transition-all cursor-pointer min-h-[38px] hover:border-accent/50 hover:bg-accent/10 ${isExpanded ? 'ring-1 ring-accent/60' : ''}`}>
                      {!isExpanded && (
                        <div className="p-1.5">
                          {cItems.length === 0 ? (
                            <p className="text-center leading-tight font-medium" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>{slot}</p>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="leading-tight font-semibold uppercase" style={{ color: 'rgba(124,106,247,0.8)', fontSize: '8px', letterSpacing: '0.05em' }}>{slot}</p>
                              {cItems.map(it => (
                                <div key={it.id} className="leading-tight">
                                  <p className="text-white truncate font-medium" style={{ fontSize: '12.5px' }}>{it.recipe_name}</p>
                                  <MacroDots cal={it.calories} protein={it.protein_g} carbs={it.carbs_g} fat={it.fat_g} size="xs" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {isExpanded && (
                        <div className="p-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-zinc-400 font-medium">{slot}</p>
                            <button onClick={e => { e.stopPropagation(); setExpandedCell(null) }} className="text-zinc-600 hover:text-white"><X size={11} /></button>
                          </div>
                          {cItems.map(it => (
                            <div key={it.id} className="flex items-center gap-1 group/it">
                              <div className="flex-1 min-w-0">
                                <p className="text-zinc-200 truncate">{it.recipe_name}</p>
                                <MacroDots cal={it.calories} protein={it.protein_g} carbs={it.carbs_g} fat={it.fat_g} size="xs" />
                              </div>
                              <button onClick={e => { e.stopPropagation(); removeItem(it.id) }} className="opacity-0 group-hover/it:opacity-100 text-rose flex-shrink-0"><Trash2 size={10} /></button>
                            </div>
                          ))}
                          <button onClick={e => { e.stopPropagation(); setAddingTo(key) }} className="btn-ghost text-[10px] py-0.5 w-full justify-center"><Plus size={10} /> añadir</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div></div>
      )}

      {addingTo && (
        <div className="card space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Añadir a {DAY_LABELS_FULL[parseInt(addingTo.split('_')[0])]} · {addingTo.split('_').slice(1).join(' ')}</p>
            <button onClick={() => setAddingTo(null)}><X size={15} className="text-zinc-500" /></button>
          </div>
          <select className="select" value={addForm.recipe_id} onChange={e => setAddForm(f => ({ ...f, recipe_id: e.target.value }))}>
            <option value="">Selecciona una receta...</option>
            {recipes.map(r => <option key={r.id} value={r.id}>{r.name} ({Math.round(r.calories_total)} kcal / {r.servings} ración)</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-zinc-400 whitespace-nowrap">Raciones:</label>
            <input className="input w-20" type="number" step="0.5" value={addForm.servings} onChange={e => setAddForm(f => ({ ...f, servings: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} className="btn-primary"><Check size={15} /> Añadir</button>
            <button onClick={() => setAddingTo(null)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Templates tab ────────────────────────────────────────────
function TemplatesTab({ recipes }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [newName, setNewName]     = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [applyingTemplate, setApplyingTemplate] = useState(null)
  const [applyStatus, setApplyStatus] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: tmpls } = await supabase.from('meal_templates').select('*').order('created_at', { ascending: false })
    const { data: allItems } = await supabase.from('meal_template_items').select('template_id')
    const counts = {}
    ;(allItems || []).forEach(i => { counts[i.template_id] = (counts[i.template_id] || 0) + 1 })
    setTemplates((tmpls || []).map(t => ({ ...t, itemCount: counts[t.id] || 0 })))
    setLoading(false)
  }

  async function createTemplate() {
    if (!newName.trim()) return
    const { data } = await supabase.from('meal_templates').insert([{ name: newName.trim() }]).select().single()
    if (data) { setTemplates(prev => [{ ...data, itemCount: 0 }, ...prev]); setEditingTemplate(data) }
    setNewName(''); setShowNewForm(false)
  }

  async function deleteTemplate(id) {
    await supabase.from('meal_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function applyTemplate(template, startWeek, weeks) {
    setApplyStatus('applying')
    const { data: items } = await supabase.from('meal_template_items').select('*').eq('template_id', template.id)
    for (let w = 0; w < weeks; w++) {
      const weekMonday = addWeeks(startWeek, w)
      const from = format(weekMonday, 'yyyy-MM-dd'), to = format(addDays(weekMonday, 6), 'yyyy-MM-dd')
      await supabase.from('meal_plan').delete().gte('date', from).lte('date', to)
      const rows = (items || []).map(it => ({
        date: format(addDays(weekMonday, it.day_of_week), 'yyyy-MM-dd'),
        slot: it.slot, type: 'recipe', recipe_id: it.recipe_id, recipe_name: it.recipe_name,
        servings: it.servings, calories: it.calories, protein_g: it.protein_g, carbs_g: it.carbs_g, fat_g: it.fat_g,
      }))
      if (rows.length > 0) await supabase.from('meal_plan').insert(rows)
    }
    setApplyStatus('done')
    setTimeout(() => { setApplyStatus(null); setApplyingTemplate(null) }, 1800)
  }

  if (editingTemplate) {
    return <TemplateEditor template={editingTemplate} recipes={recipes} onClose={() => { setEditingTemplate(null); load() }} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Crea una plantilla semanal editable y repítela durante varias semanas seguidas.</p>
        <button onClick={() => setShowNewForm(v => !v)} className="btn-primary text-sm py-1.5"><Plus size={14} /> Nueva plantilla</button>
      </div>

      {showNewForm && (
        <div className="card space-y-3">
          <input className="input" placeholder="Nombre de la plantilla" value={newName} onChange={e => setNewName(e.target.value)}
            autoFocus onKeyDown={e => e.key === 'Enter' && createTemplate()} />
          <div className="flex gap-2">
            <button onClick={createTemplate} className="btn-primary"><Check size={15} /> Crear y editar</button>
            <button onClick={() => setShowNewForm(false)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      {applyingTemplate && (
        applyStatus === 'applying' ? (
          <div className="card text-center py-6"><p className="text-sm text-white">Aplicando plantilla...</p></div>
        ) : applyStatus === 'done' ? (
          <div className="card text-center py-6" style={{ borderColor: 'color-mix(in srgb, var(--jade) 30%, transparent)' }}>
            <p className="text-sm" style={{ color: 'var(--jade)' }}>✓ Plantilla aplicada.</p>
          </div>
        ) : (
          <ApplyTemplateModal template={applyingTemplate} onApply={(sw, w) => applyTemplate(applyingTemplate, sw, w)} onClose={() => setApplyingTemplate(null)} />
        )
      )}

      {loading ? <p className="muted text-center py-8">Cargando...</p> :
       templates.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">📋</p>
          <p className="muted">Aún no tienes plantillas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="card-sm flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                <LayoutTemplate size={16} style={{ color: 'var(--accent-bright)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.itemCount} comida{t.itemCount !== 1 ? 's' : ''} planificadas</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setApplyingTemplate(t)} className="btn-ghost text-xs py-1 px-2 gap-1"><Repeat size={12} /> Aplicar</button>
                <button onClick={() => setEditingTemplate(t)} className="text-zinc-500 hover:text-accent-bright p-1.5"><Edit2 size={13} /></button>
                <button onClick={() => deleteTemplate(t.id)} className="text-zinc-500 hover:text-rose p-1.5"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Weekly planner ───────────────────────────────────────────
function WeeklyPlanner({ recipes, foods, weekStart, onNavigate }) {
  const [plan, setPlan]       = useState({})
  const [expandedCell, setExpandedCell] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [editing, setEditing]   = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => { loadPlan() }, [weekStart])

  async function loadPlan() {
    const from = format(weekStart, 'yyyy-MM-dd'), to = format(addDays(weekStart, 6), 'yyyy-MM-dd')
    const { data } = await supabase.from('meal_plan').select('*').gte('date', from).lte('date', to)
    const map = {}
    ;(data || []).forEach(row => {
      const key = `${row.date}_${row.slot}`
      if (!map[key]) map[key] = []
      map[key].push(row)
    })
    setPlan(map)
  }

  async function addRecipeToPlan(recipeForm) {
    const [date, ...slotParts] = addingTo.split('_')
    const slot = slotParts.join('_')
    const recipe = recipes.find(r => r.id === recipeForm.recipe_id)
    if (!recipe) return
    const factor = parseFloat(recipeForm.servings) / (recipe.servings || 1)
    const { data } = await supabase.from('meal_plan').insert([{
      date, slot, type: 'recipe', recipe_id: recipeForm.recipe_id, recipe_name: recipe.name,
      servings: parseFloat(recipeForm.servings),
      calories: Math.round(recipe.calories_total * factor),
      protein_g: +(recipe.protein_total * factor).toFixed(1),
      carbs_g:   +(recipe.carbs_total   * factor).toFixed(1),
      fat_g:     +(recipe.fat_total     * factor).toFixed(1),
    }]).select().single()
    if (data) setPlan(prev => ({ ...prev, [addingTo]: [...(prev[addingTo] || []), data] }))
    setAddingTo(null)
  }

  async function addFoodToPlan(foodForm) {
    const [date, ...slotParts] = addingTo.split('_')
    const slot = slotParts.join('_')
    const food = foods.find(f => f.id === foodForm.food_id)
    if (!food) return
    const factor = parseFloat(foodForm.quantity) / 100
    const { data } = await supabase.from('meal_plan').insert([{
      date, slot, type: 'food', food_id: foodForm.food_id, food_name: food.name, quantity_g: parseFloat(foodForm.quantity),
      calories: Math.round(food.calories_per_100g * factor),
      protein_g: +(food.protein_per_100g * factor).toFixed(1),
      carbs_g:   +(food.carbs_per_100g   * factor).toFixed(1),
      fat_g:     +(food.fat_per_100g     * factor).toFixed(1),
    }]).select().single()
    if (data) setPlan(prev => ({ ...prev, [addingTo]: [...(prev[addingTo] || []), data] }))
    setAddingTo(null)
  }

  async function removeFromPlan(key, id) {
    await supabase.from('meal_plan').delete().eq('id', id)
    setPlan(prev => ({ ...prev, [key]: (prev[key] || []).filter(r => r.id !== id) }))
  }

  function itemLabel(it) { return it.type === 'food' ? it.food_name : it.recipe_name }

  function dayTotals(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    return MEAL_SLOTS.reduce((acc, slot) => {
      const key = `${dateStr}_${slot}`
      ;(plan[key] || []).forEach(r => {
        acc.cal += r.calories || 0; acc.protein += r.protein_g || 0; acc.carbs += r.carbs_g || 0; acc.fat += r.fat_g || 0
      })
      return acc
    }, { cal: 0, protein: 0, carbs: 0, fat: 0 })
  }

  async function saveAsTemplate(name) {
    setSaveStatus('saving')
    const { data: template } = await supabase.from('meal_templates').insert([{ name }]).select().single()
    if (template) {
      const rows = []
      days.forEach((day, dow) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        MEAL_SLOTS.forEach(slot => {
          ;(plan[`${dateStr}_${slot}`] || []).filter(it => it.type !== 'food').forEach(it => {
            rows.push({
              template_id: template.id, day_of_week: dow, slot, type: 'recipe',
              recipe_id: it.recipe_id, recipe_name: it.recipe_name, servings: it.servings,
              calories: it.calories, protein_g: it.protein_g, carbs_g: it.carbs_g, fat_g: it.fat_g,
            })
          })
        })
      })
      if (rows.length > 0) await supabase.from('meal_template_items').insert(rows)
    }
    setSaveStatus('done')
    setTimeout(() => { setSaveStatus(null); setShowSaveTemplate(false) }, 1600)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => onNavigate(-1)} className="btn-ghost px-2"><ChevronLeft size={16} /></button>
        <p className="text-sm font-medium text-white">
          {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}
        </p>
        <button onClick={() => onNavigate(1)} className="btn-ghost px-2"><ChevronRight size={16} /></button>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => setShowSaveTemplate(v => !v)} className="btn-ghost text-xs py-1 gap-1"><Save size={12} /> Guardar como plantilla</button>
        <button onClick={() => setEditing(v => !v)} className={`btn text-xs py-1 gap-1 ${editing ? 'btn-primary' : 'btn-ghost'}`}>
          <Edit2 size={12} /> {editing ? 'Terminando de editar' : 'Editar semana'}
        </button>
      </div>

      {showSaveTemplate && (
        saveStatus === 'saving' ? <div className="card text-center py-4"><p className="text-sm text-white">Guardando...</p></div> :
        saveStatus === 'done' ? (
          <div className="card text-center py-4" style={{ borderColor: 'color-mix(in srgb, var(--jade) 30%, transparent)' }}>
            <p className="text-sm" style={{ color: 'var(--jade)' }}>✓ Plantilla guardada. (Solo recetas — los alimentos sueltos no se incluyen en plantillas todavía.)</p>
          </div>
        ) : <SaveTemplateModal onSave={saveAsTemplate} onClose={() => setShowSaveTemplate(false)} />
      )}

      <div className="week-scroll"><div className="grid grid-cols-7 gap-1.5">
        {days.map(day => {
          const isToday = isSameDay(day, new Date())
          const totals = dayTotals(day)
          return (
            <div key={day.toISOString()} className="space-y-1">
              <div className={`week-day-header ${isToday ? 'today' : ''}`}>
                <div className="text-zinc-400 uppercase tracking-wider" style={{ fontSize: '10px' }}>{format(day, 'EEE', { locale: es })}</div>
                <div className="font-bold text-white text-sm">{format(day, 'd')}</div>
                {totals.cal > 0 && <div className="mt-0.5"><MacroDots cal={totals.cal} protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size="xs" /></div>}
              </div>
              {MEAL_SLOTS.map(slot => {
                const key = `${format(day, 'yyyy-MM-dd')}_${slot}`
                const items = plan[key] || []
                const isExpanded = expandedCell === key
                return (
                  <div key={slot} onClick={() => !editing && setExpandedCell(isExpanded ? null : key)}
                    style={items.length > 0
                      ? { background: 'rgba(124,106,247,0.12)', border: '1px solid rgba(124,106,247,0.35)' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                    className={`rounded-xl text-[10px] transition-all cursor-pointer min-h-[38px] hover:border-accent/50 hover:bg-accent/10 ${isExpanded ? 'ring-1 ring-accent/60' : ''}`}>
                    {!isExpanded && (
                      <div className="p-1.5">
                        {items.length === 0 ? (
                          <p className="text-center leading-tight font-medium" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>{slot}</p>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="leading-tight font-semibold uppercase" style={{ color: 'rgba(124,106,247,0.8)', fontSize: '8px', letterSpacing: '0.05em' }}>{slot}</p>
                            {items.map(it => (
                              <div key={it.id} className="leading-tight">
                                <p className="text-white truncate font-medium" style={{ fontSize: '12.5px' }}>{itemLabel(it)}</p>
                                <MacroDots cal={it.calories} protein={it.protein_g} carbs={it.carbs_g} fat={it.fat_g} size="xs" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {isExpanded && (
                      <div className="p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-zinc-400 font-medium">{slot}</p>
                          <button onClick={e => { e.stopPropagation(); setExpandedCell(null) }} className="text-zinc-600 hover:text-white"><X size={11} /></button>
                        </div>
                        {items.map(it => (
                          <div key={it.id} className="flex items-center gap-1 group/it">
                            <div className="flex-1 min-w-0">
                              <p className="text-zinc-200 truncate">{itemLabel(it)}{it.type === 'food' ? ` · ${it.quantity_g}g` : ''}</p>
                              <MacroDots cal={it.calories} protein={it.protein_g} carbs={it.carbs_g} fat={it.fat_g} size="xs" />
                            </div>
                            {editing && (
                              <button onClick={e => { e.stopPropagation(); removeFromPlan(key, it.id) }} className="opacity-0 group-hover/it:opacity-100 text-rose"><Trash2 size={10} /></button>
                            )}
                          </div>
                        ))}
                        {editing && (
                          <button onClick={e => { e.stopPropagation(); setAddingTo(key) }} className="btn-ghost text-[10px] py-0.5 w-full justify-center"><Plus size={10} /> añadir</button>
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

      {(() => {
        const allItems = Object.values(plan).flat()
        const wTotals = allItems.reduce((a, r) => ({
          cal: a.cal + (r.calories || 0), protein: a.protein + (r.protein_g || 0),
          carbs: a.carbs + (r.carbs_g || 0), fat: a.fat + (r.fat_g || 0),
        }), { cal: 0, protein: 0, carbs: 0, fat: 0 })
        if (wTotals.cal === 0) return null
        return (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">{Math.round(wTotals.cal)}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>kcal · media {Math.round(wTotals.cal / 7)}/día</span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><span style={{ color: 'var(--rose)', fontWeight: 700 }}>{Math.round(wTotals.protein)}</span><span style={{ color: 'var(--rose)', opacity: 0.7, fontSize: '10px' }}>P</span></span>
                <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px' }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><span style={{ color: 'var(--sky)', fontWeight: 700 }}>{Math.round(wTotals.carbs)}</span><span style={{ color: 'var(--sky)', opacity: 0.7, fontSize: '10px' }}>H</span></span>
                <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px' }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><span style={{ color: 'var(--amber)', fontWeight: 700 }}>{Math.round(wTotals.fat)}</span><span style={{ color: 'var(--amber)', opacity: 0.7, fontSize: '10px' }}>G</span></span>
              </span>
            </div>
            <div className="flex rounded-full overflow-hidden h-1.5">
              {(() => {
                const total = wTotals.protein * 4 + wTotals.carbs * 4 + wTotals.fat * 9
                if (!total) return null
                const pPct = (wTotals.protein * 4 / total) * 100, cPct = (wTotals.carbs * 4 / total) * 100, fPct = 100 - pPct - cPct
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

      {addingTo && (
        <AddMealItemModal
          slotLabel={addingTo.split('_').slice(1).join(' ')}
          foods={foods} recipes={recipes}
          onAddRecipe={addRecipeToPlan}
          onAddFood={addFoodToPlan}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  )
}

// ─── Daily log tab ────────────────────────────────────────────
function DailyLog({ foods }) {
  const [meals, setMeals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [form, setForm]     = useState({ meal_type: 'Comida', food_id: '', quantity: '' })

  useEffect(() => { loadMeals() }, [selectedDate])

  async function loadMeals() {
    setLoading(true)
    const { data } = await supabase.from('nutrition_logs').select('*').eq('date', selectedDate).order('created_at')
    setMeals(data || [])
    setLoading(false)
  }

  async function addEntry() {
    if (!form.food_id || !form.quantity) return
    const food = foods.find(f => f.id === form.food_id)
    if (!food) return
    const factor = parseFloat(form.quantity) / 100
    const { data, error } = await supabase.from('nutrition_logs').insert([{
      date: selectedDate, meal_type: form.meal_type, food_id: form.food_id, food_name: food.name, quantity_g: parseFloat(form.quantity),
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

  const byType = MEAL_SLOTS.map(type => ({ type, entries: meals.filter(m => m.meal_type === type) })).filter(g => g.entries.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="date" className="input w-auto" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
      </div>
      <MacroBar protein={totals.protein} carbs={totals.carbs} fat={totals.fat} calories={totals.cal} />
      <div className="card space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Registrar alimento</h3>
        <div className="grid grid-cols-3 gap-2">
          <select className="select" value={form.meal_type} onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))}>
            {MEAL_SLOTS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="select" value={form.food_id} onChange={e => setForm(f => ({ ...f, food_id: e.target.value }))}>
            <option value="">Alimento...</option>
            {foods.map(f => <option key={f.id} value={f.id}>{f.name}{f.brand ? ` (${f.brand})` : ''}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="input" placeholder="g" type="number" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addEntry()} />
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
                  cal={entries.reduce((a, e) => a + (e.calories || 0), 0)}
                  protein={entries.reduce((a, e) => a + (e.protein_g || 0), 0)}
                  carbs={entries.reduce((a, e) => a + (e.carbs_g || 0), 0)}
                  fat={entries.reduce((a, e) => a + (e.fat_g || 0), 0)}
                  size="xs"
                />
              </div>
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 group py-1 border-t border-surface-300">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{entry.food_name}</p>
                    <p className="text-xs text-zinc-600">{entry.quantity_g}g</p>
                  </div>
                  <div className="text-right"><MacroDots cal={entry.calories} protein={entry.protein_g} carbs={entry.carbs_g} fat={entry.fat_g} size="xs" /></div>
                  <button onClick={() => deleteEntry(entry.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose transition-all"><Trash2 size={13} /></button>
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
    if (data) setFoods(prev => prev.map(f => f.id === id ? data : f).sort((a, b) => a.name.localeCompare(b.name)))
  }
  async function saveRecipe(recipe) {
    const { data } = await supabase.from('recipes').insert([recipe]).select().single()
    if (data) setRecipes(prev => [...prev, data])
  }
  async function deleteRecipe(id) {
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  const TABS = [
    { v: 'weekly',    l: 'Menú semanal',    icon: Calendar },
    { v: 'templates', l: 'Plantillas',      icon: LayoutTemplate },
    { v: 'daily',     l: 'Registro diario', icon: Flame },
    { v: 'recipes',   l: 'Recetas',         icon: BookOpen },
    { v: 'foods',     l: 'Alimentos',       icon: Apple },
  ]

  return (
    <div className="space-y-5">
      <h1 className="section-title">Nutrición</h1>
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(({ v, l, icon: Icon }) => (
          <button key={v} onClick={() => setTab(v)} className={`btn text-sm py-1.5 gap-1.5 ${tab === v ? 'bg-surface-400 text-white' : 'btn-ghost'}`}>
            <Icon size={13} /> {l}
          </button>
        ))}
      </div>

      {tab === 'daily'     && <DailyLog foods={foods} />}
      {tab === 'weekly'    && <WeeklyPlanner recipes={recipes} foods={foods} weekStart={weekStart}
                                onNavigate={dir => setWeekStart(w => dir > 0 ? addWeeks(w, 1) : subWeeks(w, 1))} />}
      {tab === 'templates' && <TemplatesTab recipes={recipes} />}
      {tab === 'recipes'   && <RecipesTab recipes={recipes} foods={foods} onSave={saveRecipe} onUpdate={updateRecipe} onDelete={deleteRecipe} />}
      {tab === 'foods'     && <FoodsTab foods={foods} onAdd={addFood} onUpdate={updateFood} onDelete={deleteFood} />}
    </div>
  )
}
