import { useEffect, useState } from 'react'
import { Eye, ImagePlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { DAILY_MENU_SECTIONS, dailyMenuFromForm, dailyMenuToForm } from '../../lib/dailyMenu'
import { DailyMenuSheet } from '../menu/DailyMenu'
import { getTheme } from '../../lib/themes'

export default function DailyMenuEditor({ restaurant, userId, onUpdate }) {
  const [form, setForm] = useState(() => dailyMenuToForm(restaurant.daily_menu))
  const [file, setFile] = useState(null)
  const [previewImage, setPreviewImage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  useEffect(() => { setForm(dailyMenuToForm(restaurant.daily_menu)); setFile(null); setError('') }, [restaurant.id, restaurant.daily_menu])
  useEffect(() => {
    if (!file) { setPreviewImage(''); return }
    const url = URL.createObjectURL(file)
    setPreviewImage(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  function change(key, value) { setForm(current => ({ ...current, [key]: value })); setError('') }
  function chooseImage(event) {
    const next = event.target.files?.[0]
    event.target.value = ''
    if (!next) return
    if (!['image/jpeg','image/png','image/webp'].includes(next.type) || next.size > 5 * 1024 * 1024) { setError('Usa una imagen JPG, PNG o WebP de hasta 5 MB.'); return }
    setFile(next); setError('')
  }
  async function save(event) {
    event.preventDefault()
    if (!userId || saving) return
    setSaving(true); setError('')
    try {
      let menu = dailyMenuFromForm(form)
      if (file) {
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
        const path = `${userId}/daily-menu/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('dish-images').upload(path, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        const imageUrl = supabase.storage.from('dish-images').getPublicUrl(path).data.publicUrl
        menu = { ...menu, image_url: imageUrl }
        setForm(current => ({ ...current, image_url: imageUrl }))
        setFile(null)
      }
      const { data, error: saveError } = await supabase.from('restaurants').update({ daily_menu: menu }).eq('id', restaurant.id).select().single()
      if (saveError) throw saveError
      onUpdate(data)
      toast.success(menu.enabled ? 'Menú del día publicado' : 'Menú del día guardado y oculto')
    } catch (failure) { setError(failure.message || 'No se ha podido guardar. Tus cambios siguen aquí; vuelve a intentarlo.') }
    finally { setSaving(false) }
  }
  function showPreview() {
    try {
      const menu = dailyMenuFromForm({ ...form, enabled: true })
      setPreview({ ...menu, image_url: previewImage || menu.image_url }); setError('')
    } catch (failure) { setError(failure.message) }
  }
  const input = 'w-full rounded-xl border border-gray-200 p-3 text-sm bg-white min-h-11'
  return <>
    <form onSubmit={save} className="md-daily-editor">
      <div className="mb-6"><h2 className="text-xl font-bold text-gray-900">Menú del día</h2><p className="text-sm text-gray-500 mt-2 leading-relaxed">Cambia los platos de cada servicio y el precio del menú completo. Estos platos se gestionan únicamente aquí.</p></div>
      {error && <p role="alert" className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-4 mb-4 text-sm">{error}</p>}
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        <label className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm font-semibold text-gray-800"><input type="checkbox" checked={form.enabled} onChange={event => change('enabled', event.target.checked)} className="w-5 h-5 accent-orange-600" />Mostrar menú del día en mi carta</label>
        <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm text-gray-700 font-medium">Nombre<input className={`${input} mt-2`} value={form.title} maxLength={80} onChange={event => change('title', event.target.value)} placeholder="Menú del día" /></label><label className="text-sm text-gray-700 font-medium">Precio del menú completo (€)<input className={`${input} mt-2`} type="number" inputMode="decimal" min="0" max="99999.99" step="0.01" value={form.price} onChange={event => change('price', event.target.value)} placeholder="12,50" /></label></div>
        <div><p className="text-sm text-gray-700 font-medium mb-2">Foto del menú</p>{(previewImage || form.image_url) && <div className="relative mb-3"><img src={previewImage || form.image_url} alt="Foto del menú del día" className="w-full max-h-56 object-cover rounded-2xl" /><button type="button" className="absolute top-3 right-3 bg-white rounded-full min-h-11 min-w-11 grid place-items-center shadow" aria-label="Quitar foto del menú" onClick={() => { setFile(null); change('image_url', '') }}><Trash2 size={18} /></button></div>}<label className="relative flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-300 text-gray-600 text-sm cursor-pointer"><ImagePlus size={18} />{previewImage || form.image_url ? 'Cambiar foto' : 'Añadir foto'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} aria-label="Foto del menú del día" className="absolute inset-0 opacity-0 cursor-pointer w-full" /></label></div>
        <label className="block text-sm text-gray-700 font-medium">Descripción opcional<textarea className={`${input} mt-2`} rows={2} maxLength={400} value={form.description} onChange={event => change('description', event.target.value)} placeholder="Un primero y un segundo a elegir" /></label>
        <div className="grid sm:grid-cols-2 gap-4">{DAILY_MENU_SECTIONS.map(({ key, label }) => <label key={key} className="block text-sm text-gray-700 font-medium">{label} a elegir<textarea aria-label={`${label} del menú`} className={`${input} mt-2`} rows={5} maxLength={2000} value={form[key]} onChange={event => change(key, event.target.value)} placeholder="Escribe un plato por línea" /><span className="block text-xs font-normal text-gray-500 mt-1">Un plato por línea · hasta 10 opciones</span></label>)}</div>
        <label className="block text-sm text-gray-700 font-medium">¿Qué incluye?<input className={`${input} mt-2`} maxLength={200} value={form.includes} onChange={event => change('includes', event.target.value)} placeholder="Ej.: bebida, pan y postre" /></label>
        <label className="block text-sm text-gray-700 font-medium">Días y horario (opcional)<input className={`${input} mt-2`} maxLength={160} value={form.availability} onChange={event => change('availability', event.target.value)} placeholder="Ej.: lunes a viernes, de 13:00 a 16:00" /></label>
        <p className="text-xs text-gray-500 leading-relaxed">La casilla «Mostrar menú del día» controla si aparece en la carta. El horario se muestra como información.</p>
        <div className="flex gap-3 flex-wrap"><button type="submit" disabled={saving} className="md-primary">{saving ? 'Guardando…' : 'Guardar menú del día'}</button><button type="button" className="min-h-11 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 font-semibold" onClick={showPreview}><Eye size={17} />Vista previa</button></div>
      </fieldset>
    </form>
    {preview && <DailyMenuSheet menu={preview} onClose={() => setPreview(null)} theme={getTheme(restaurant.color_theme)} />}
  </>
}
