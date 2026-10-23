import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { nextDishSortOrder } from '../../lib/dishOrder'
import { X, Upload, Loader2, Star, TrendingUp, Tag, Flame } from 'lucide-react'

function Toggle({ checked, onChange, label, icon: Icon, color = 'orange' }) {
  const colors = {
    orange: checked ? 'bg-[#FF6B35]' : 'bg-gray-200',
    blue: checked ? 'bg-blue-500' : 'bg-gray-200',
  }
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-colors ${
        checked ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={checked ? 'text-[#FF6B35]' : 'text-gray-400'} />
        <span className={`text-sm font-semibold ${checked ? 'text-[#FF6B35]' : 'text-gray-600'}`}>{label}</span>
      </div>
      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${colors[color]}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`} />
      </div>
    </button>
  )
}

export default function DishForm({ restaurantId, categories, dish, onSuccess, onCancel }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [featured, setFeatured] = useState(false)
  const [bestSeller, setBestSeller] = useState(false)
  const [isSpecial, setIsSpecial] = useState(false)
  const [originalPrice, setOriginalPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (dish) {
      setName(dish.name || '')
      setDescription(dish.description || '')
      setPrice(dish.price?.toString() || '')
      setCategoryId(dish.category_id || '')
      setImagePreview(dish.image_url || null)
      setFeatured(dish.featured || false)
      setBestSeller(dish.best_seller || false)
      setIsSpecial(dish.is_special || false)
      setOriginalPrice(dish.original_price?.toString() || '')
    }
  }, [dish])

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5 MB')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async () => {
    const ext = imageFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('dish-images')
      .upload(path, imageFile, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('dish-images')
      .getPublicUrl(path)
    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isSpecial && !dish?.is_special) {
        const { count } = await supabase
          .from('dishes')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('is_special', true)
        if (count >= 2) {
          toast.error('Ya tienes 2 especiales activos')
          setSaving(false)
          return
        }
      }

      let imageUrl = dish?.image_url || null
      if (imageFile) imageUrl = await uploadImage()

      const origPriceVal = originalPrice.trim() ? parseFloat(originalPrice) : null

      const payload = {
        restaurant_id: restaurantId,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category_id: categoryId || null,
        image_url: imageUrl,
        featured,
        best_seller: bestSeller,
        is_special: isSpecial,
        original_price: origPriceVal,
      }

      if (dish) {
        const { data, error } = await supabase
          .from('dishes')
          .update(payload)
          .eq('id', dish.id)
          .select('*, categories(name)')
          .single()
        if (error) throw error
        toast.success('Plato actualizado')
        onSuccess(data)
      } else {
        const sortOrder = await nextDishSortOrder(supabase, restaurantId)
        const { data, error } = await supabase
          .from('dishes')
          .insert({ ...payload, sort_order: sortOrder })
          .select('*, categories(name)')
          .single()
        if (error) throw error
        toast.success('Plato añadido')
        onSuccess(data)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {dish ? 'Editar plato' : 'Nuevo plato'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Foto del plato</label>
            {imagePreview ? (
              <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-gray-100">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  <span className="text-white text-sm font-semibold flex items-center gap-2">
                    <Upload size={16} /> Cambiar foto
                  </span>
                  <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all">
                <Upload size={22} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 font-semibold">Subir foto</span>
                <span className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP — máx. 5 MB</span>
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pasta Carbonara"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingredientes, alérgenos, elaboración..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Precio (€) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              >
                <option value="">Sin categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Precio original (oferta) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Tag size={14} className="text-gray-400" />
                Precio antes de la oferta (€)
              </span>
            </label>
            <input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="Dejar vacío si no hay oferta"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            {originalPrice && (
              <p className="text-xs text-[#6B6B6B] mt-1.5">
                Aparecerá tachado. El precio actual ({price || '0.00'}€) será el precio de oferta.
              </p>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Destacar en carta</p>
            <Toggle
              checked={isSpecial}
              onChange={setIsSpecial}
              label="Especial de hoy — aparece destacado en la carta"
              icon={Flame}
            />
            <Toggle
              checked={featured}
              onChange={setFeatured}
              label="Destacado — aparece en sección especial al inicio"
              icon={Star}
            />
            <Toggle
              checked={bestSeller}
              onChange={setBestSeller}
              label="Más vendido — aparece con badge especial"
              icon={TrendingUp}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Guardando...' : dish ? 'Guardar' : 'Añadir plato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
