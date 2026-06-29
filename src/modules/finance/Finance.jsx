import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

const INV_TYPES = ['Acción', 'ETF', 'Cripto', 'Fondo', 'Bono', 'Otro']
const TX_CATS   = ['Salario', 'Freelance', 'Alquiler', 'Comida', 'Transporte', 'Ocio', 'Salud', 'Ropa', 'Suscripciones', 'Ahorro', 'Inversión', 'Otro']

function fmt(n) {
  return n?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'
}

// ─── Transaction Calendar ─────────────────────────────────────
function TxCalendar({ transactions }) {
  const [month, setMonth]      = useState(new Date())
  const [selected, setSelected] = useState(null)

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const firstDow = (getDay(startOfMonth(month)) + 6) % 7 // Mon-first

  function txForDay(day) {
    const d = format(day, 'yyyy-MM-dd')
    return transactions.filter(t => t.date === d)
  }

  function dayBalance(txs) {
    return txs.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0)
  }

  const selectedTxs = selected ? txForDay(selected) : []

  return (
    <div className="space-y-4">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="btn-ghost px-2"><ChevronLeft size={16} /></button>
        <p className="text-sm font-medium text-white capitalize">
          {format(month, 'MMMM yyyy', { locale: es })}
        </p>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="btn-ghost px-2"><ChevronRight size={16} /></button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['L','M','X','J','V','S','D'].map(d => (
          <div key={d} className="text-xs text-zinc-600 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {days.map(day => {
          const txs = txForDay(day)
          const balance = dayBalance(txs)
          const isToday = isSameDay(day, new Date())
          const isSelected = selected && isSameDay(selected, day)
          const hasIncome  = txs.some(t => t.type === 'income')
          const hasExpense = txs.some(t => t.type === 'expense')

          return (
            <button key={day.toISOString()} onClick={() => setSelected(isSameDay(selected, day) ? null : day)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs
                transition-all border
                ${isSelected ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-surface-300'}
                ${txs.length > 0 ? 'bg-surface-200' : ''}`}>
              <span className={`font-medium ${isToday ? 'text-accent-bright' : 'text-zinc-300'}`}>
                {format(day, 'd')}
              </span>
              {txs.length > 0 && (
                <>
                  <span className={`text-[9px] font-medium leading-none
                    ${balance >= 0 ? 'text-jade' : 'text-rose'}`}>
                    {balance >= 0 ? '+' : ''}{Math.round(balance)}€
                  </span>
                  <div className="flex gap-0.5">
                    {hasIncome  && <span className="w-1 h-1 rounded-full bg-jade" />}
                    {hasExpense && <span className="w-1 h-1 rounded-full bg-rose" />}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selected && selectedTxs.length > 0 && (
        <div className="card space-y-2">
          <p className="text-sm font-medium text-white">
            {format(selected, "d 'de' MMMM", { locale: es })}
          </p>
          {selectedTxs.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 py-1 border-t border-surface-300">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                ${tx.type === 'income' ? 'bg-jade/10' : 'bg-rose/10'}`}>
                {tx.type === 'income'
                  ? <TrendingUp size={13} className="text-jade" />
                  : <TrendingDown size={13} className="text-rose" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200">{tx.category}</p>
                {tx.notes && <p className="text-xs text-zinc-600 truncate">{tx.notes}</p>}
              </div>
              <p className={`text-sm font-medium ${tx.type === 'income' ? 'text-jade' : 'text-rose'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)} €
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Investments tab ──────────────────────────────────────────
function InvestmentsTab({ investments, onAdd, onDelete }) {
  const [form, setForm] = useState({ asset: '', type: 'ETF', amount: '', buy_price: '', current_price: '', date: '' })

  async function save() {
    if (!form.asset || !form.amount) return
    await onAdd({ ...form, amount: parseFloat(form.amount), buy_price: parseFloat(form.buy_price) || null, current_price: parseFloat(form.current_price) || null })
    setForm({ asset: '', type: 'ETF', amount: '', buy_price: '', current_price: '', date: '' })
  }

  const totalInvested = investments.reduce((a, i) => a + (i.amount || 0), 0)
  const totalCurrent  = investments.reduce((a, i) => {
    if (i.buy_price && i.current_price && i.amount) {
      return a + (i.amount / i.buy_price) * i.current_price
    }
    return a + (i.amount || 0)
  }, 0)
  const pnl = totalCurrent - totalInvested

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Capital invertido', value: `${fmt(totalInvested)} €`, cls: 'text-white' },
          { label: 'Valor actual',      value: `${fmt(totalCurrent)} €`,  cls: 'text-white' },
          { label: 'P&L total',         value: `${pnl >= 0 ? '+' : ''}${fmt(pnl)} €`, cls: pnl >= 0 ? 'text-jade' : 'text-rose' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="card-sm">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className={`text-lg font-semibold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Añadir inversión</h3>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Nombre del activo" value={form.asset}
            onChange={e => setForm(f => ({ ...f, asset: e.target.value }))} />
          <select className="select" value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {INV_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input className="input" placeholder="Capital invertido (€)" type="number" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <input className="input" placeholder="Precio de compra" type="number" value={form.buy_price}
            onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))} />
          <input className="input" placeholder="Precio actual" type="number" value={form.current_price}
            onChange={e => setForm(f => ({ ...f, current_price: e.target.value }))} />
          <input className="input" type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <button onClick={save} className="btn-primary"><Plus size={15} /> Añadir</button>
      </div>

      <div className="space-y-2">
        {investments.length === 0 ? <p className="muted text-center py-6">Sin inversiones.</p> :
         investments.map(inv => {
          const p = inv.buy_price && inv.current_price
            ? ((inv.current_price - inv.buy_price) / inv.buy_price) * 100
            : null
          return (
            <div key={inv.id} className="card flex items-center gap-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{inv.asset}</p>
                  <span className="badge bg-surface-300 text-zinc-400 text-xs">{inv.type}</span>
                </div>
                <p className="text-zinc-500 text-xs">Invertido: {fmt(inv.amount)} €</p>
              </div>
              {p !== null && (
                <div className={`flex items-center gap-1 text-sm font-medium ${p >= 0 ? 'text-jade' : 'text-rose'}`}>
                  {p >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {p >= 0 ? '+' : ''}{p.toFixed(2)}%
                </div>
              )}
              <button onClick={() => onDelete(inv.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Transactions tab ─────────────────────────────────────────
function TransactionsTab({ transactions, onAdd, onDelete }) {
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'Otro', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [view, setView] = useState('list') // 'list' | 'calendar'

  async function save() {
    if (!form.amount || !form.date) return
    await onAdd({ ...form, amount: parseFloat(form.amount) })
    setForm(f => ({ ...f, amount: '', notes: '' }))
  }

  const income  = transactions.filter(t => t.type === 'income').reduce((a, t) => a + (t.amount || 0), 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + (t.amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ingresos',  value: `+${fmt(income)} €`,          cls: 'text-jade' },
          { label: 'Gastos',    value: `-${fmt(expense)} €`,          cls: 'text-rose' },
          { label: 'Balance',   value: `${fmt(income - expense)} €`,  cls: income - expense >= 0 ? 'text-jade' : 'text-rose' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="card-sm">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className={`text-lg font-semibold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Añadir movimiento</h3>
        <div className="grid grid-cols-2 gap-2">
          <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
          </select>
          <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {TX_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input className="input" placeholder="Importe (€)" type="number" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <input className="input" type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <input className="input col-span-2" placeholder="Notas (opcional)" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <button onClick={save} className="btn-primary"><Plus size={15} /> Añadir</button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1.5">
        {[{ v: 'list', l: 'Lista' }, { v: 'calendar', l: 'Calendario' }].map(({ v, l }) => (
          <button key={v} onClick={() => setView(v)}
            className={`btn text-sm py-1 ${view === v ? 'bg-surface-400 text-white' : 'btn-ghost'}`}>
            {l}
          </button>
        ))}
      </div>

      {view === 'calendar' && <TxCalendar transactions={transactions} />}

      {view === 'list' && (
        transactions.length === 0 ? <p className="muted text-center py-6">Sin movimientos.</p> :
        <div className="space-y-2">
          {[...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).map(tx => (
            <div key={tx.id} className="card flex items-center gap-3 group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                ${tx.type === 'income' ? 'bg-jade/10' : 'bg-rose/10'}`}>
                {tx.type === 'income'
                  ? <TrendingUp size={13} className="text-jade" />
                  : <TrendingDown size={13} className="text-rose" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{tx.category}</p>
                {tx.notes && <p className="text-xs text-zinc-500 truncate">{tx.notes}</p>}
              </div>
              <div className="text-right">
                <p className={`font-medium text-sm ${tx.type === 'income' ? 'text-jade' : 'text-rose'}`}>
                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)} €
                </p>
                <p className="text-xs text-zinc-600">{tx.date}</p>
              </div>
              <button onClick={() => onDelete(tx.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function Finance() {
  const [tab, setTab]               = useState('transactions')
  const [investments, setInvestments] = useState([])
  const [transactions, setTransactions] = useState([])

  useEffect(() => { loadInvestments(); loadTransactions() }, [])

  async function loadInvestments() {
    const { data } = await supabase.from('investments').select('*').order('created_at', { ascending: false })
    setInvestments(data || [])
  }
  async function loadTransactions() {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    setTransactions(data || [])
  }

  async function addInvestment(inv) {
    const { data } = await supabase.from('investments').insert([inv]).select().single()
    if (data) setInvestments(prev => [data, ...prev])
  }
  async function deleteInvestment(id) {
    await supabase.from('investments').delete().eq('id', id)
    setInvestments(prev => prev.filter(i => i.id !== id))
  }
  async function addTransaction(tx) {
    const { data } = await supabase.from('transactions').insert([tx]).select().single()
    if (data) setTransactions(prev => [data, ...prev])
  }
  async function deleteTransaction(id) {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-5">
      <h1 className="section-title">Finanzas</h1>
      <div className="flex gap-1.5">
        {[{ v: 'transactions', l: 'Movimientos' }, { v: 'investments', l: 'Inversiones' }].map(({ v, l }) => (
          <button key={v} onClick={() => setTab(v)}
            className={`btn text-sm py-1.5 ${tab === v ? 'bg-surface-400 text-white' : 'btn-ghost'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'transactions' && <TransactionsTab transactions={transactions} onAdd={addTransaction} onDelete={deleteTransaction} />}
      {tab === 'investments'  && <InvestmentsTab  investments={investments}   onAdd={addInvestment}  onDelete={deleteInvestment} />}
    </div>
  )
}
