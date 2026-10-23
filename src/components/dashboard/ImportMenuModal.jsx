import { useState, useRef } from 'react'
import { X, Upload, Loader2, Check, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ImportMenuModal({ restaurantId, onSuccess, onClose }) {
  const [step, setStep] = useState('upload') // upload | analyzing | review | importing
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [detected, setDetected] = useState([])
  const [apiError, setApiError] = useState(null)
  const fileRef = useRef()

  /* ── Gestión de imagen ── */
  const loadFile = (file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Usa una imagen JPG, PNG o WebP'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    const reader = new FileReader()
    reader.onload = (e) => setImageBase64(e.target.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]) }

  /* ── Llamada a Gemini ── */
  const analyze = async () => {
    if (!imageBase64) return
    setStep('analyzing')
    setApiError(null)

    try {
      const { data: parsed, error } = await supabase.functions.invoke('import-menu', {
        body: { restaurantId, imageBase64, mimeType: imageFile?.type || 'image/jpeg' },
      })
      if (error) {
        let message = 'No se pudo analizar la carta. Inténtalo de nuevo.'
        if (error.context instanceof Response) {
          const detail = await error.context.json().catch(() => null)
          if (typeof detail?.error === 'string') message = detail.error
        }
        throw new Error(message)
      }

      if (!parsed?.categorias?.length) {
        throw new Error('La IA no detectó ningún plato. Prueba con una imagen más nítida.')
      }

      const cats = parsed.categorias
        .map(cat => ({
          nombre: cat.nombre || 'Sin categoría',
          dishes: (cat.platos || [])
            .map(p => ({
              nombre: String(p.nombre || '').trim(),
              descripcion: String(p.descripcion || '').trim(),
              precio: parseFloat(p.precio) || 0,
              checked: true,
            }))
            .filter(p => p.nombre),
        }))
        .filter(c => c.dishes.length > 0)

      if (!cats.length) throw new Error('No se encontraron platos válidos en la respuesta.')

      setDetected(cats)
      setStep('review')
    } catch (err) {
      setApiError(err.message)
      setStep('upload')
    }
  }

  /* ── Checkboxes ── */
  const toggleDish = (ci, di) =>
    setDetected(prev =>
      prev.map((cat, i) =>
        i !== ci ? cat : { ...cat, dishes: cat.dishes.map((d, j) => j !== di ? d : { ...d, checked: !d.checked }) }
      )
    )

  const toggleCat = (ci) => {
    const allChecked = detected[ci].dishes.every(d => d.checked)
    setDetected(prev =>
      prev.map((cat, i) =>
        i !== ci ? cat : { ...cat, dishes: cat.dishes.map(d => ({ ...d, checked: !allChecked })) }
      )
    )
  }

  /* ── Importar a Supabase ── */
  const importSelected = async () => {
    setStep('importing')
    let ok = 0

    try {
      const { data: existingCats } = await supabase
        .from('categories')
        .select('id, name')
        .eq('restaurant_id', restaurantId)

      for (const cat of detected) {
        const selected = cat.dishes.filter(d => d.checked)
        if (!selected.length) continue

        // Buscar o crear categoría
        const found = existingCats?.find(c => c.name.toLowerCase() === cat.nombre.toLowerCase())
        let catId = found?.id

        if (!catId) {
          const { data: newCat, error: catErr } = await supabase
            .from('categories')
            .insert({ restaurant_id: restaurantId, name: cat.nombre, sort_order: 0 })
            .select('id')
            .single()
          if (catErr) { continue }
          catId = newCat.id
        }

        // Insertar platos en bloque
        const { error: dishErr } = await supabase.from('dishes').insert(
          selected.map(d => ({
            restaurant_id: restaurantId,
            category_id: catId,
            name: d.nombre,
            description: d.descripcion,
            price: d.precio,
            available: true,
            sort_order: 0,
          }))
        )
        if (!dishErr) ok += selected.length
      }

      if (ok > 0) {
        toast.success(`✅ ${ok} plato${ok !== 1 ? 's' : ''} importado${ok !== 1 ? 's' : ''} correctamente`)
        onSuccess?.()
        onClose()
      } else {
        toast.error('No se pudo importar ningún plato')
        setStep('review')
      }
    } catch (err) {
      toast.error('Error al importar: ' + err.message)
      setStep('review')
    }
  }

  const selectedCount = detected.flatMap(c => c.dishes).filter(d => d.checked).length

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FF6B35] rounded-xl flex items-center justify-center shadow-md shadow-[#FF6B35]/30">
              <Sparkles size={17} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-[15px]">Importar carta con IA</h2>
              {step === 'review' && (
                <p className="text-xs text-gray-400 mt-0.5">{selectedCount} platos seleccionados</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">

          {/* ══ PASO: subir imagen ══ */}
          {(step === 'upload' || step === 'analyzing') && (
            <>
              <div className="text-center mb-6">
                <p className="font-semibold text-gray-800 text-[17px]">Sube una foto de tu carta</p>
                <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                  La IA leerá tu carta y creará los platos automáticamente
                </p>
              </div>

              {apiError && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 leading-relaxed">
                  ⚠️ {apiError}
                </div>
              )}

              {/* Zona upload */}
              {!imagePreview ? (
                <label
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-[#FF6B35] hover:bg-orange-50 transition-all"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload size={30} className="text-gray-300 mb-3" />
                  <span className="font-semibold text-gray-500 text-sm">Arrastra aquí o haz clic para subir</span>
                  <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — máx. 5 MB</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => loadFile(e.target.files[0])}
                  />
                </label>
              ) : (
                <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100">
                  <img src={imagePreview} alt="Carta" className="w-full max-h-64 object-contain" />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                    <span className="text-white text-sm font-semibold flex items-center gap-2">
                      <Upload size={16} /> Cambiar imagen
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => loadFile(e.target.files[0])}
                    />
                  </label>
                </div>
              )}

              <button
                onClick={analyze}
                disabled={!imageBase64 || step === 'analyzing'}
                className="w-full mt-5 flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e55a24] disabled:opacity-50 text-white font-bold h-12 rounded-xl transition-colors shadow-lg shadow-[#FF6B35]/25"
              >
                {step === 'analyzing' ? (
                  <><Loader2 size={18} className="animate-spin" /> Analizando carta con IA…</>
                ) : (
                  <><Sparkles size={18} /> Analizar carta con IA</>
                )}
              </button>
            </>
          )}

          {/* ══ PASO: revisar resultados ══ */}
          {(step === 'review' || step === 'importing') && (
            <>
              <div className="mb-4">
                <p className="font-semibold text-gray-800">Platos detectados</p>
                <p className="text-sm text-gray-400 mt-0.5">Desmarca los que no quieras importar</p>
              </div>

              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-0.5">
                {detected.map((cat, ci) => {
                  const allChecked = cat.dishes.every(d => d.checked)
                  const someChecked = cat.dishes.some(d => d.checked)
                  return (
                    <div key={ci} className="border border-gray-100 rounded-2xl overflow-hidden">

                      {/* Fila categoría */}
                      <button
                        onClick={() => toggleCat(ci)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          allChecked ? 'bg-[#FF6B35] border-[#FF6B35]'
                          : someChecked ? 'bg-orange-200 border-orange-400'
                          : 'border-gray-300 bg-white'
                        }`}>
                          {(allChecked || someChecked) && <Check size={9} className="text-white" />}
                        </div>
                        <span className="font-bold text-sm text-gray-800 flex-1">{cat.nombre}</span>
                        <span className="text-xs text-gray-400">
                          {cat.dishes.filter(d => d.checked).length}/{cat.dishes.length}
                        </span>
                      </button>

                      {/* Filas plato */}
                      <div className="divide-y divide-gray-50">
                        {cat.dishes.map((dish, di) => (
                          <button
                            key={di}
                            onClick={() => toggleDish(ci, di)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/50 transition-colors text-left"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              dish.checked ? 'bg-[#FF6B35] border-[#FF6B35]' : 'border-gray-300 bg-white'
                            }`}>
                              {dish.checked && <Check size={9} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{dish.nombre}</p>
                              {dish.descripcion && (
                                <p className="text-xs text-gray-400 truncate">{dish.descripcion}</p>
                              )}
                            </div>
                            <span className="text-sm font-bold text-[#FF6B35] shrink-0 ml-2">
                              {dish.precio > 0 ? `${dish.precio.toFixed(2)}€` : '—'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setStep('upload')}
                  disabled={step === 'importing'}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-40"
                >
                  ← Otra imagen
                </button>
                <button
                  onClick={importSelected}
                  disabled={selectedCount === 0 || step === 'importing'}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e55a24] disabled:opacity-50 text-white font-bold h-11 rounded-xl transition-colors shadow-lg shadow-[#FF6B35]/25 text-sm"
                >
                  {step === 'importing' ? (
                    <><Loader2 size={15} className="animate-spin" /> Importando…</>
                  ) : (
                    <><Check size={15} /> Importar {selectedCount} plato{selectedCount !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
