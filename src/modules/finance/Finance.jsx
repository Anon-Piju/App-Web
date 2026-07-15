import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Edit2, X, Check, Wallet, Activity } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

const EXPENSE_CATS = ['Alquiler','Hipoteca','Alimentación','Transporte','Gasolina','Ocio','Restaurantes','Salud','Ropa','Suscripciones','Educación','Viajes','Tecnología','Hogar','Seguros','Inversión','Ahorro','Otro']
const INCOME_CATS  = ['Salario','Freelance','Negocio','Inversiones','Alquiler cobrado','Regalo','Otro']
const MONTHS_ES    = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n) {
  return (n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getCatColor(cat) {
  const palette = ['#7c6af7','#3ecf8e','#f4a94e','#f16b6b','#5aafee','#a99cf9','#00c896','#ff6b9d','#ffd93d','#6bcbf7','#c77dff','#ff9f43','#26de81','#fd79a8','#74b9ff']
  const idx = (cat || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length
  return palette[idx]
}

// ── Donut chart ───────────────────────────────────────────────
function DonutChart({ data, size = 110 }) {
  if (!data?.length) return null
  const total = data.reduce((a, d) => a + d.value, 0)
  if (!total) return null
  const cx = size/2, cy = size/2, r = size*0.38, inner = size*0.22
  let angle = -Math.PI/2
  const slices = data.filter(d => d.value > 0).map(d => {
    const sweep = (d.value/total)*2*Math.PI
    const s = angle; angle += sweep
    return { ...d, start: s, sweep }
  })
  function arc(cx, cy, r, start, sweep) {
    const x1=cx+r*Math.cos(start), y1=cy+r*Math.sin(start)
    const x2=cx+r*Math.cos(start+sweep), y2=cy+r*Math.sin(start+sweep)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep>Math.PI?1:0} 1 ${x2} ${y2}`
  }
  return (
    <svg width={size} height={size}>
      {slices.map((s, i) => (
        <path key={i} fill={s.color} opacity="0.85"
          d={`${arc(cx,cy,r,s.start,s.sweep)} L ${cx+inner*Math.cos(s.start+s.sweep)} ${cy+inner*Math.sin(s.start+s.sweep)} ${arc(cx,cy,inner,s.start+s.sweep,-s.sweep)} Z`}>
          <title>{s.label}: {fmt(s.value)}€ ({Math.round(s.value/total*100)}%)</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={inner} fill="var(--surface1)" />
    </svg>
  )
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ data, color = 'var(--jade)', height = 40 }) {
  if (!data?.length || data.every(d => d === 0)) return null
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 100/(data.length-1)
  const pts = data.map((v,i) => `${i*w},${height-((v-min)/range)*height}`).join(' ')
  return (
    <svg width="100%" height={height} preserveAspectRatio="none" viewBox={`0 0 100 ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {data.map((v,i) => (
        <circle key={i} cx={i*w} cy={height-((v-min)/range)*height} r="1.5" fill={color}>
          <title>{fmt(v)}€</title>
        </circle>
      ))}
    </svg>
  )
}

// ── Charts ────────────────────────────────────────────────────
function Charts({ transactions }) {
  const [cm, setCm] = useState(new Date())
  const ms = format(cm, 'yyyy-MM')
  const mtx = transactions.filter(t => t.date?.startsWith(ms))
  const income  = mtx.filter(t => t.type==='income').reduce((a,t) => a+(t.amount||0), 0)
  const expense = mtx.filter(t => t.type==='expense').reduce((a,t) => a+(t.amount||0), 0)
  const balance = income - expense
  const savRate = income>0 ? Math.round((balance/income)*100) : 0

  const last6 = Array.from({length:6}, (_,i) => {
    const d = subMonths(cm, 5-i), ms2 = format(d,'yyyy-MM')
    const tx = transactions.filter(t => t.date?.startsWith(ms2))
    return { label: MONTHS_ES[d.getMonth()], income: tx.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||0),0), expense: tx.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||0),0) }
  })

  const expByCat = Object.entries(mtx.filter(t=>t.type==='expense').reduce((acc,t)=>{ acc[t.category||'Otro']=(acc[t.category||'Otro']||0)+(t.amount||0); return acc },{}))
    .sort((a,b)=>b[1]-a[1]).map(([cat,val]) => ({ label:cat, value:val, color:getCatColor(cat) }))

  const days = eachDayOfInterval({ start:startOfMonth(cm), end:endOfMonth(cm) })
  let running = 0
  const runningBal = days.map(day => {
    const ds = format(day,'yyyy-MM-dd')
    const tx = mtx.filter(t=>t.date===ds)
    running += tx.reduce((a,t)=>a+(t.type==='income'?t.amount:-t.amount),0)
    return running
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setCm(m=>subMonths(m,1))} className="btn-ghost px-2"><ChevronLeft size={15}/></button>
        <p className="text-sm font-medium text-white capitalize">{format(cm,'MMMM yyyy',{locale:es})}</p>
        <button onClick={() => setCm(m=>addMonths(m,1))} className="btn-ghost px-2"><ChevronRight size={15}/></button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { l:'Ingresos',     v:`${fmt(income)}€`,  c:'var(--jade)', I:TrendingUp },
          { l:'Gastos',       v:`${fmt(expense)}€`, c:'var(--rose)', I:TrendingDown },
          { l:'Balance',      v:`${balance>=0?'+':''}${fmt(balance)}€`, c:balance>=0?'var(--jade)':'var(--rose)', I:Wallet },
          { l:'Tasa ahorro',  v:`${savRate}%`,       c:'var(--sky)',  I:Activity },
        ].map(({l,v,c,I}) => (
          <div key={l} className="card-sm text-center space-y-1">
            <I size={14} style={{color:c,margin:'0 auto'}}/>
            <p className="text-sm font-bold" style={{color:c}}>{v}</p>
            <p className="text-[10px]" style={{color:'var(--text-muted)'}}>{l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Bar: income vs expense 6M */}
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-white">Ingresos vs Gastos</p>
          <p className="text-[10px]" style={{color:'var(--text-muted)'}}>Últimos 6 meses</p>
          <svg width="100%" height="90" className="overflow-visible">
            {last6.map((d,i) => {
              const maxV = Math.max(...last6.map(x=>Math.max(x.income,x.expense)),1)
              const bw=100/6, gx=bw*0.08, hw=bw*0.38
              const ih=(d.income/maxV)*65, eh=(d.expense/maxV)*65
              return (
                <g key={i}>
                  <rect x={`${i*bw+gx}%`} y={70-ih} width={`${hw}%`} height={ih||1} fill="var(--jade)" rx="2" opacity="0.8"/>
                  <rect x={`${i*bw+gx+hw+0.5}%`} y={70-eh} width={`${hw}%`} height={eh||1} fill="var(--rose)" rx="2" opacity="0.8"/>
                  <text x={`${i*bw+bw/2}%`} y="83" textAnchor="middle" style={{fontSize:'8px',fill:'rgba(255,255,255,0.3)'}}>{d.label}</text>
                </g>
              )
            })}
          </svg>
          <div className="flex gap-3">
            {[{c:'var(--jade)',l:'Ingresos'},{c:'var(--rose)',l:'Gastos'}].map(({c,l})=>(
              <span key={l} className="flex items-center gap-1 text-[10px]" style={{color:c}}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{background:c}}/> {l}
              </span>
            ))}
          </div>
        </div>

        {/* Donut: expenses by category */}
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-white">Gastos por categoría</p>
          <p className="text-[10px]" style={{color:'var(--text-muted)'}}>{format(cm,'MMMM',{locale:es})}</p>
          {expByCat.length===0 ? (
            <p className="text-[11px] text-center py-4" style={{color:'var(--text-muted)'}}>Sin gastos</p>
          ) : (
            <div className="flex items-center gap-2">
              <DonutChart data={expByCat} size={90}/>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                {expByCat.slice(0,5).map(d=>(
                  <div key={d.label} className="flex items-center gap-1.5 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:d.color}}/>
                    <p className="text-[10px] truncate flex-1" style={{color:'var(--text-muted)'}}>{d.label}</p>
                    <p className="text-[10px] font-semibold text-white flex-shrink-0">{fmt(d.value)}€</p>
                  </div>
                ))}
                {expByCat.length>5 && <p className="text-[9px]" style={{color:'var(--text-muted)'}}>+{expByCat.length-5} más</p>}
              </div>
            </div>
          )}
        </div>

        {/* Running balance sparkline */}
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-white">Balance acumulado</p>
          <p className="text-[10px]" style={{color:'var(--text-muted)'}}>{format(cm,'MMMM',{locale:es})} día a día</p>
          <Sparkline data={runningBal} color={running>=0?'var(--jade)':'var(--rose)'} height={50}/>
          <p className="text-xs font-bold text-right" style={{color:running>=0?'var(--jade)':'var(--rose)'}}>
            {running>=0?'+':''}{fmt(running)}€
          </p>
        </div>

        {/* Income/expense trend sparklines */}
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-white">Tendencia 6 meses</p>
          <div className="space-y-2">
            {[{l:'Ingresos',c:'var(--jade)',d:last6.map(x=>x.income)},{l:'Gastos',c:'var(--rose)',d:last6.map(x=>x.expense)}].map(({l,c,d})=>(
              <div key={l}>
                <p className="text-[10px] mb-0.5" style={{color:c}}>{l}</p>
                <Sparkline data={d} color={c} height={26}/>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px]" style={{color:'var(--text-muted)'}}>
            {last6.map(d=><span key={d.label}>{d.label}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Transaction Calendar ──────────────────────────────────────
function TxCalendar({ transactions, month, onMonthChange }) {
  const days = eachDayOfInterval({ start:startOfMonth(month), end:endOfMonth(month) })
  const firstDow = (startOfMonth(month).getDay()+6)%7
  const [selected, setSelected] = useState(null)

  function txForDay(day) { return transactions.filter(t => t.date===format(day,'yyyy-MM-dd')) }
  function dayBal(txs) { return txs.reduce((a,t) => a+(t.type==='income'?t.amount:-t.amount),0) }
  const selTx = selected ? txForDay(selected) : []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => onMonthChange(subMonths(month,1))} className="btn-ghost px-2"><ChevronLeft size={15}/></button>
        <p className="text-sm font-medium text-white capitalize">{format(month,'MMMM yyyy',{locale:es})}</p>
        <button onClick={() => onMonthChange(addMonths(month,1))} className="btn-ghost px-2"><ChevronRight size={15}/></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['L','M','X','J','V','S','D'].map(d=><div key={d} className="text-[10px]" style={{color:'var(--text-muted)'}}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({length:firstDow}).map((_,i)=><div key={`e${i}`}/>)}
        {days.map(day => {
          const txs=txForDay(day), bal=dayBal(txs)
          const isToday=isSameDay(day,new Date()), isSel=selected&&isSameDay(selected,day)
          return (
            <button key={day.toISOString()} onClick={()=>setSelected(isSel?null:day)}
              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all border"
              style={{ background:isSel?'color-mix(in srgb, var(--accent) 20%, transparent)':txs.length?'rgba(255,255,255,0.04)':'transparent', borderColor:isSel?'var(--accent)':'transparent' }}>
              <span style={{fontSize:'11px',fontWeight:isToday?700:400,color:isToday?'var(--accent-bright)':'var(--text)'}}>{format(day,'d')}</span>
              {txs.length>0 && <span style={{fontSize:'8px',fontWeight:600,color:bal>=0?'var(--jade)':'var(--rose)',lineHeight:1}}>{bal>=0?'+':''}{Math.round(bal)}</span>}
            </button>
          )
        })}
      </div>
      {selected && selTx.length>0 && (
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-white">{format(selected,"d 'de' MMMM",{locale:es})}</p>
          {selTx.map(tx=>(
            <div key={tx.id} className="flex items-center gap-3 py-1 border-t" style={{borderColor:'rgba(255,255,255,0.06)'}}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{background:tx.type==='income'?'rgba(62,207,142,0.15)':'rgba(241,107,107,0.12)'}}>
                {tx.type==='income'?<TrendingUp size={12} style={{color:'var(--jade)'}}/>:<TrendingDown size={12} style={{color:'var(--rose)'}}/>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{tx.category}</p>
                {tx.notes&&<p className="text-[10px] truncate" style={{color:'var(--text-muted)'}}>{tx.notes}</p>}
              </div>
              <p className="text-xs font-semibold" style={{color:tx.type==='income'?'var(--jade)':'var(--rose)'}}>
                {tx.type==='income'?'+':'-'}{fmt(tx.amount)}€
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Transaction Form ──────────────────────────────────────────
function TxForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { type:'expense', amount:'', category:'Alimentación', date:format(new Date(),'yyyy-MM-dd'), notes:'' })
  const f = (k,v) => setForm(p=>({...p,[k]:v}))
  const cats = form.type==='income' ? INCOME_CATS : EXPENSE_CATS
  async function submit() {
    if (!form.amount||!form.date) return
    await onSave({...form, amount:parseFloat(form.amount)})
  }
  return (
    <div className="card space-y-3" style={{borderColor:form.type==='income'?'rgba(62,207,142,0.3)':'rgba(241,107,107,0.3)'}}>
      <div className="flex rounded-xl overflow-hidden border" style={{borderColor:'rgba(255,255,255,0.08)'}}>
        {[{v:'expense',l:'Gasto',c:'var(--rose)'},{v:'income',l:'Ingreso',c:'var(--jade)'}].map(({v,l,c})=>(
          <button key={v} onClick={()=>{f('type',v);f('category',v==='income'?'Salario':'Alimentación')}}
            className="flex-1 py-2 text-sm font-medium transition-all"
            style={{background:form.type===v?c+'20':'transparent',color:form.type===v?c:'var(--text-muted)'}}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Importe (€)</label>
          <input className="input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>f('amount',e.target.value)} autoFocus/>
        </div>
        <div>
          <label className="label">Fecha</label>
          <input className="input" type="date" value={form.date} onChange={e=>f('date',e.target.value)}/>
        </div>
      </div>
      <div>
        <label className="label">Categoría</label>
        <select className="select" value={form.category} onChange={e=>f('category',e.target.value)}>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Notas (opcional)</label>
        <input className="input" placeholder="Descripción..." value={form.notes} onChange={e=>f('notes',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="btn-primary"><Check size={15}/> {initial?'Guardar':'Añadir'}</button>
        <button onClick={onCancel} className="btn-ghost">Cancelar</button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Finance() {
  const [tab, setTab]             = useState('overview')
  const [transactions, setTxs]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [month, setMonth]         = useState(new Date())
  const [txFilter, setTxFilter]   = useState('all')
  const [search, setSearch]       = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('transactions').select('*').order('date',{ascending:false})
    setTxs(data||[])
    setLoading(false)
  }

  async function saveTx(data) {
    if (editingTx) {
      const { data:u } = await supabase.from('transactions').update(data).eq('id',editingTx.id).select().single()
      if (u) setTxs(prev=>prev.map(t=>t.id===editingTx.id?u:t))
      setEditingTx(null)
    } else {
      const { data:c } = await supabase.from('transactions').insert([data]).select().single()
      if (c) setTxs(prev=>[c,...prev])
    }
    setShowForm(false)
  }

  async function delTx(id) {
    await supabase.from('transactions').delete().eq('id',id)
    setTxs(prev=>prev.filter(t=>t.id!==id))
  }

  const ms = format(month,'yyyy-MM')
  const mtx = transactions.filter(t=>t.date?.startsWith(ms))
  const income  = mtx.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||0),0)
  const expense = mtx.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||0),0)
  const balance = income-expense

  const listTx = transactions.filter(t => {
    if (txFilter!=='all'&&t.type!==txFilter) return false
    if (search&&!(t.category||'').toLowerCase().includes(search.toLowerCase())&&!(t.notes||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title">Finanzas</h1>
        <button onClick={()=>{setEditingTx(null);setShowForm(v=>!v)}} className="btn-primary">
          {showForm?<><X size={15}/> Cerrar</>:<><Plus size={15}/> Añadir</>}
        </button>
      </div>

      {(showForm||editingTx)&&<TxForm initial={editingTx} onSave={saveTx} onCancel={()=>{setShowForm(false);setEditingTx(null)}}/>}

      <div className="flex gap-1.5 flex-wrap">
        {[{v:'overview',l:'Resumen'},{v:'charts',l:'Gráficas'},{v:'calendar',l:'Calendario'},{v:'list',l:'Movimientos'}].map(({v,l})=>(
          <button key={v} onClick={()=>setTab(v)} className={`btn text-sm py-1.5 ${tab===v?'bg-surface-400 text-white':'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      {tab==='overview'&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={()=>setMonth(m=>subMonths(m,1))} className="btn-ghost px-2"><ChevronLeft size={15}/></button>
            <p className="text-sm font-medium text-white capitalize">{format(month,'MMMM yyyy',{locale:es})}</p>
            <button onClick={()=>setMonth(m=>addMonths(m,1))} className="btn-ghost px-2"><ChevronRight size={15}/></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{l:'Ingresos',v:`${fmt(income)}€`,c:'var(--jade)',I:TrendingUp},{l:'Gastos',v:`${fmt(expense)}€`,c:'var(--rose)',I:TrendingDown},{l:'Balance',v:`${balance>=0?'+':''}${fmt(balance)}€`,c:balance>=0?'var(--jade)':'var(--rose)',I:Wallet}].map(({l,v,c,I})=>(
              <div key={l} className="card text-center space-y-2">
                <I size={18} style={{color:c,margin:'0 auto'}}/>
                <p className="text-xl font-bold" style={{color:c}}>{v}</p>
                <p className="text-xs" style={{color:'var(--text-muted)'}}>{l}</p>
              </div>
            ))}
          </div>
          {mtx.filter(t=>t.type==='expense').length>0&&(
            <div className="card space-y-3">
              <p className="text-sm font-semibold text-white">Principales gastos del mes</p>
              {Object.entries(mtx.filter(t=>t.type==='expense').reduce((acc,t)=>{acc[t.category||'Otro']=(acc[t.category||'Otro']||0)+(t.amount||0);return acc},{}))
                .sort((a,b)=>b[1]-a[1]).slice(0,6).map(([cat,val])=>{
                  const pct=expense>0?(val/expense)*100:0
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{background:getCatColor(cat)}}/>
                          <span className="text-white">{cat}</span>
                        </div>
                        <div className="flex items-center gap-2" style={{color:'var(--text-muted)'}}>
                          <span>{Math.round(pct)}%</span>
                          <span className="font-semibold text-white">{fmt(val)}€</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:getCatColor(cat)}}/>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
          <div className="card space-y-2">
            <p className="text-sm font-semibold text-white">Últimos movimientos</p>
            {mtx.slice(0,8).map(tx=>(
              <div key={tx.id} className="flex items-center gap-3 py-1.5 border-t group" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:tx.type==='income'?'rgba(62,207,142,0.15)':'rgba(241,107,107,0.12)'}}>
                  {tx.type==='income'?<TrendingUp size={13} style={{color:'var(--jade)'}}/>:<TrendingDown size={13} style={{color:'var(--rose)'}}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{tx.category}</p>
                  {tx.notes&&<p className="text-[10px] truncate" style={{color:'var(--text-muted)'}}>{tx.notes}</p>}
                </div>
                <p className="text-sm font-semibold" style={{color:tx.type==='income'?'var(--jade)':'var(--rose)'}}>{tx.type==='income'?'+':'-'}{fmt(tx.amount)}€</p>
                <p className="text-[10px]" style={{color:'var(--text-muted)'}}>{tx.date?.slice(5)}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={()=>{setEditingTx(tx);setShowForm(false)}} className="text-zinc-600 hover:text-white p-0.5"><Edit2 size={12}/></button>
                  <button onClick={()=>delTx(tx.id)} className="text-zinc-600 hover:text-rose p-0.5"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
            {mtx.length===0&&<p className="muted text-center py-4">Sin movimientos este mes.</p>}
          </div>
        </div>
      )}

      {tab==='charts'&&<Charts transactions={transactions}/>}
      {tab==='calendar'&&<TxCalendar transactions={transactions} month={month} onMonthChange={setMonth}/>}

      {tab==='list'&&(
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input className="input flex-1 min-w-40" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="select w-auto" value={txFilter} onChange={e=>setTxFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>
          {loading?<p className="muted text-center py-8">Cargando...</p>:
           listTx.length===0?<p className="muted text-center py-8">Sin movimientos.</p>:(
            <div className="space-y-1.5">
              {listTx.map(tx=>(
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl group" style={{background:'var(--surface1)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:tx.type==='income'?'rgba(62,207,142,0.12)':'rgba(241,107,107,0.10)'}}>
                    {tx.type==='income'?<TrendingUp size={14} style={{color:'var(--jade)'}}/>:<TrendingDown size={14} style={{color:'var(--rose)'}}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.category}</p>
                    {tx.notes&&<p className="text-xs truncate" style={{color:'var(--text-muted)'}}>{tx.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{color:tx.type==='income'?'var(--jade)':'var(--rose)'}}>{tx.type==='income'?'+':'-'}{fmt(tx.amount)}€</p>
                    <p className="text-[10px]" style={{color:'var(--text-muted)'}}>{tx.date}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={()=>{setEditingTx(tx);setShowForm(false)}} className="btn-ghost p-1.5"><Edit2 size={13}/></button>
                    <button onClick={()=>delTx(tx.id)} className="btn-ghost p-1.5 hover:text-rose"><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
