import { useState } from 'react'
import { ArrowUp, ArrowDown, GripVertical, Save, X, UtensilsCrossed } from 'lucide-react'
import { moveDish } from '../../lib/dishOrder'

function Thumbnail({ dish }) {
  const [failed, setFailed] = useState(null)
  return <span className="flex w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gray-100 overflow-hidden items-center justify-center shrink-0 text-gray-400">{dish.image_url && failed !== dish.image_url ? <img src={dish.image_url} alt="" className="w-full h-full object-cover" onError={() => setFailed(dish.image_url)} /> : <UtensilsCrossed size={20} />}</span>
}

export default function DishOrderEditor({ dishes, onSave, onCancel, onReload }) {
  const [draft, setDraft] = useState(dishes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dragged, setDragged] = useState(null)
  const [target, setTarget] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const changed = draft.some((dish, index) => dish.id !== dishes[index]?.id)
  function move(sourceId, targetId) {
    if (saving) return
    const next = moveDish(draft, sourceId, targetId)
    setDraft(next)
    setError('')
    const index = next.findIndex(dish => dish.id === sourceId)
    if (index >= 0) setAnnouncement(`${next[index].name}, posición ${index + 1} de ${next.length}`)
  }
  async function save() {
    if (saving || !changed) return
    setSaving(true)
    setError('')
    try { await onSave(draft) }
    catch (failure) { setError(failure?.message?.includes('La carta ha cambiado') ? 'La carta ha cambiado desde que abriste la lista. Recarga los platos para ordenar la versión actual.' : 'No se ha podido guardar el orden. Tus cambios siguen aquí; vuelve a intentarlo.') }
    finally { setSaving(false) }
  }
  return <section className="space-y-4" aria-labelledby="dish-order-heading">
    <div className="rounded-2xl bg-[#faf7ff] border border-[#e8def5] p-4 sm:p-5"><h2 id="dish-order-heading" className="font-bold text-lg text-[#292537]">Organiza tu carta</h2><p id="dish-order-help" className="text-xs sm:text-sm leading-relaxed text-gray-500 mt-2">Arrastra el asa en ordenador o usa las flechas para subir y bajar platos. El nuevo orden se publicará cuando pulses «Guardar orden».</p><p className="text-xs text-gray-500 leading-relaxed mt-2">La carta respeta este orden dentro de cada sección y categoría. Los platos ocultos siguen sin mostrarse.</p></div>
    <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={save} disabled={saving || !changed} className="inline-flex gap-2 items-center justify-center min-h-11 bg-[#ec5c16] text-white rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"><Save size={17} />{saving ? 'Guardando…' : 'Guardar orden'}</button><button type="button" onClick={onCancel} disabled={saving} className="inline-flex gap-2 items-center justify-center min-h-11 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 disabled:opacity-50"><X size={16} />Cancelar</button><span className="text-xs text-gray-400 ml-auto">{draft.length} platos</span></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700 leading-relaxed"><p>{error}</p>{error.startsWith('La carta ha cambiado') && <button type="button" onClick={onReload} className="font-semibold underline min-h-11 mt-1">Recargar platos</button>}</div>}
    <p aria-live="polite" className="sr-only">{announcement}</p>
    <ol className="space-y-2" aria-label="Orden de los platos" aria-describedby="dish-order-help" aria-busy={saving}>
      {draft.map((dish, index) => <li key={dish.id} onDragOver={event => { if (dragged && !saving) { event.preventDefault(); setTarget(dish.id) } }} onDrop={event => { event.preventDefault(); if (dragged) move(dragged, dish.id); setDragged(null); setTarget(null) }} className={`flex items-center gap-2 sm:gap-3 rounded-2xl p-2 sm:p-3 border bg-white transition-colors ${target === dish.id && dragged !== dish.id ? 'border-[#ec5c16] bg-orange-50' : 'border-gray-200'} ${dragged === dish.id ? 'opacity-50' : ''}`}>
        <button type="button" disabled={saving} draggable={!saving} onDragStart={event => { event.dataTransfer.setData('text/plain', dish.id); event.dataTransfer.effectAllowed = 'move'; setDragged(dish.id) }} onDragEnd={() => { setDragged(null); setTarget(null) }} aria-label={`Arrastrar ${dish.name}`} className="hidden sm:flex min-h-11 min-w-8 items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing disabled:opacity-50"><GripVertical size={20} /></button>
        <span className="text-xs font-semibold text-gray-400 w-5 text-center shrink-0" aria-label={`Posición ${index + 1}`}>{index + 1}</span>
        <Thumbnail dish={dish} />
        <div className="flex-1 min-w-0"><h3 className="font-semibold text-xs sm:text-sm text-gray-800 break-words">{dish.name}</h3><div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-400 mt-1"><span>{Number(dish.price).toFixed(2)} €</span>{dish.categories?.name && <span>{dish.categories.name}</span>}{!dish.available && <span className="text-gray-500">Oculto</span>}{dish.featured && <span className="text-[#b65118]">Destacado</span>}</div></div>
        <div className="flex sm:flex-row flex-col gap-1 shrink-0"><button type="button" disabled={saving || index === 0} aria-label={`Subir ${dish.name}`} onClick={() => move(dish.id, draft[index - 1].id)} className="min-h-11 w-11 rounded-xl border border-gray-200 grid place-items-center text-gray-500 hover:bg-gray-50 disabled:opacity-25"><ArrowUp size={18} /></button><button type="button" disabled={saving || index === draft.length - 1} aria-label={`Bajar ${dish.name}`} onClick={() => move(dish.id, draft[index + 1].id)} className="min-h-11 w-11 rounded-xl border border-gray-200 grid place-items-center text-gray-500 hover:bg-gray-50 disabled:opacity-25"><ArrowDown size={18} /></button></div>
      </li>)}
    </ol>
  </section>
}
