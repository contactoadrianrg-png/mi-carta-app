import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { normalizeMenuSlides, MAX_MENU_SLIDES } from '../../lib/menuSlides'

export default function MenuSlidesEditor({ restaurant, userId, onUpdate }) {
  const [slides, setSlides] = useState(() => normalizeMenuSlides(restaurant?.menu_slides))
  const [saving, setSaving] = useState(false)
  const blobs = useRef(new Set())
  useEffect(() => { setSlides(normalizeMenuSlides(restaurant?.menu_slides)) }, [restaurant?.id, restaurant?.menu_slides])
  useEffect(() => () => { blobs.current.forEach(url => URL.revokeObjectURL(url)) }, [])

  function addFiles(event) {
    const files = [...event.target.files]
    event.target.value = ''
    if (files.length + slides.length > MAX_MENU_SLIDES) { toast.error(`Puedes añadir hasta ${MAX_MENU_SLIDES} imágenes`); return }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024)) { toast.error('Usa imágenes JPG, PNG, WebP o GIF de hasta 5 MB'); return }
    const additions = files.map(file => {
      const preview = URL.createObjectURL(file)
      blobs.current.add(preview)
      return { id: crypto.randomUUID(), image_url: preview, title: '', file }
    })
    setSlides(current => [...current, ...additions])
  }
  function move(index, direction) {
    setSlides(current => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next })
  }
  async function save() {
    if (!restaurant?.id || !userId) return
    setSaving(true)
    try {
      const uploaded = []
      for (const slide of slides) {
        if (!slide.file) { uploaded.push(slide); continue }
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[slide.file.type]
        const path = `${userId}/slides/${crypto.randomUUID()}.${extension}`
        const { error } = await supabase.storage.from('dish-images').upload(path, slide.file, { contentType: slide.file.type, upsert: false })
        if (error) throw error
        const { data } = supabase.storage.from('dish-images').getPublicUrl(path)
        const next = { id: slide.id, image_url: data.publicUrl, title: slide.title }
        uploaded.push(next)
        setSlides(current => current.map(item => item.id === slide.id ? next : item))
      }
      const { data, error } = await supabase.from('restaurants').update({ menu_slides: normalizeMenuSlides(uploaded) }).eq('id', restaurant.id).select().single()
      if (error) throw error
      onUpdate(data)
      toast.success('Destacado actualizado')
    } catch { toast.error('No se ha podido guardar el destacado. Tus cambios siguen aquí; inténtalo de nuevo.') }
    finally { setSaving(false) }
  }
  return (
    <fieldset disabled={saving} className="min-w-0 px-4 pb-5">
      <legend className="text-sm font-semibold text-gray-900 mb-2">Imágenes y ofertas de tu carta</legend>
      <p className="text-xs text-gray-500 leading-relaxed mb-4">Añade hasta 6 banners para ofertas, menús del día o novedades. Recomendamos formato horizontal 16:9. Las imágenes se muestran completas.</p>
      <ol className="space-y-4">
        {slides.map((slide, index) => <li key={slide.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white"><img src={slide.image_url} alt={slide.title || `Imagen ${index + 1} del destacado`} className="w-full aspect-video object-contain bg-gray-50" /><div className="p-3"><label className="text-xs font-medium text-gray-600 block">Descripción de la imagen {index + 1}<input value={slide.title} maxLength={160} placeholder="Ej.: Menú del día de lunes a viernes" onChange={e => setSlides(current => current.map(item => item.id === slide.id ? { ...item, title: e.target.value } : item))} className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm" /></label><div className="flex gap-2 justify-end mt-2"><button type="button" className="h-11 w-11 grid place-items-center border rounded-lg disabled:opacity-30" disabled={saving || index === 0} onClick={() => move(index, -1)} aria-label={`Subir imagen ${index + 1}`}><ArrowUp size={17} /></button><button type="button" className="h-11 w-11 grid place-items-center border rounded-lg disabled:opacity-30" disabled={saving || index === slides.length - 1} onClick={() => move(index, 1)} aria-label={`Bajar imagen ${index + 1}`}><ArrowDown size={17} /></button><button type="button" className="h-11 w-11 grid place-items-center border rounded-lg text-red-500" onClick={() => setSlides(current => current.filter(item => item.id !== slide.id))} aria-label={`Quitar imagen ${index + 1}`}><X size={17} /></button></div></div></li>)}
      </ol>
      {slides.length < MAX_MENU_SLIDES && <label className="relative mt-4 flex items-center justify-center gap-2 min-h-12 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 cursor-pointer"><Upload size={18} />Añadir imágenes<input aria-label="Añadir imágenes al destacado" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving} onChange={addFiles} className="absolute inset-0 opacity-0 w-full cursor-pointer" /></label>}
      <button type="button" disabled={saving} onClick={save} className="mt-4 w-full min-h-12 bg-[#EF4444] rounded-xl text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar destacado'}</button>
    </fieldset>
  )
}
