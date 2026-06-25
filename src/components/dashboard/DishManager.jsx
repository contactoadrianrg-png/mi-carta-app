import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import DishForm from './DishForm'
import ImportMenuModal from './ImportMenuModal'
import { Plus, Pencil, Trash2, Eye, EyeOff, UtensilsCrossed, Star, TrendingUp, Tag, Flame, Sparkles, Lock } from 'lucide-react'

const FREE_DISH_LIMIT = 20

export default function DishManager({ restaurantId, plan = 'free' }) {
  const { user } = useAuth()
  const [dishes, setDishes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDish, setEditingDish] = useState(null)
  const [showImport, setShowImport] = useState(false)

  const isFree = plan === 'free'
  const atFreeLimit = isFree && dishes.length >= FREE_DISH_LIMIT

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      supabase.from('dishes').select('*, categories(name)').eq('restaurant_id', restaurantId).order('sort_order'),
      supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
    ])
    if (d.error) toast.error('Error al cargar platos')
    else setDishes(d.data || [])
    if (!c.error) setCategories(c.data || [])
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { load() }, [load])

  const toggleSpecial = async (dish) => {
    if (isFree) {
      toast.error('Los Especiales del día están disponibles en Plan Pro o Premium')
      return
    }
    if (!dish.is_special) {
      const specialCount = dishes.filter(d => d.is_special).length
      if (specialCount >= 2) {
        toast.error('Ya tienes 2 especiales activos')
        return
      }
    }
    const { data, error } = await supabase
      .from('dishes')
      .update({ is_special: !dish.is_special })
      .eq('id', dish.id)
      .select('*, categories(name)')
      .single()
    if (error) toast.error(error.message)
    else setDishes(prev => prev.map(d => d.id === dish.id ? data : d))
  }

  const toggleAvailable = async (dish) => {
    const { data, error } = await supabase
      .from('dishes')
      .update({ available: !dish.available })
      .eq('id', dish.id)
      .select('*, categories(name)')
      .single()
    if (error) toast.error(error.message)
    else setDishes(prev => prev.map(d => d.id === dish.id ? data : d))
  }

  const deleteDish = async (dish) => {
    if (!confirm(`¿Eliminar "${dish.name}"?`)) return

    if (dish.image_url) {
      try {
        const parts = dish.image_url.split('/storage/v1/object/public/dish-images/')
        if (parts[1]) await supabase.storage.from('dish-images').remove([parts[1]])
      } catch (_) {}
    }

    const { error } = await supabase.from('dishes').delete().eq('id', dish.id)
    if (error) toast.error(error.message)
    else {
      setDishes(prev => prev.filter(d => d.id !== dish.id))
      toast.success('Plato eliminado')
    }
  }

  const handleFormSuccess = (saved) => {
    setDishes(prev =>
      editingDish
        ? prev.map(d => d.id === saved.id ? saved : d)
        : [...prev, saved]
    )
    setShowForm(false)
    setEditingDish(null)
  }

  const handleNewDish = () => {
    if (atFreeLimit) {
      toast.error(`El Plan Free tiene un límite de ${FREE_DISH_LIMIT} platos. Mejora a Pro para platos ilimitados.`)
      return
    }
    setEditingDish(null)
    setShowForm(true)
  }

  const handleImportClick = () => {
    if (isFree) {
      toast.error('La importación con IA está disponible en Plan Pro o Premium')
      return
    }
    setShowImport(true)
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">
            {dishes.length} {dishes.length === 1 ? 'plato' : 'platos'}
          </p>
          {isFree && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              atFreeLimit ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {dishes.length}/{FREE_DISH_LIMIT} Free
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Importar carta con IA */}
          <button
            onClick={handleImportClick}
            title={isFree ? 'Disponible en Plan Pro o Premium' : 'Importar carta con IA'}
            className={`flex items-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm ${
              isFree
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#FF6B35] hover:bg-[#e55a24] text-white shadow-md shadow-[#FF6B35]/25'
            }`}
          >
            {isFree ? <Lock size={14} /> : <Sparkles size={16} />}
            Importar con IA
          </button>

          <button
            onClick={handleNewDish}
            title={atFreeLimit ? `Límite de ${FREE_DISH_LIMIT} platos en Plan Free` : 'Nuevo plato'}
            className={`flex items-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm ${
              atFreeLimit
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-100'
            }`}
          >
            {atFreeLimit ? <Lock size={14} /> : <Plus size={16} />}
            Nuevo plato
          </button>
        </div>
      </div>

      {/* Aviso límite Free */}
      {atFreeLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Lock size={16} className="text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Límite de platos alcanzado</p>
            <p className="text-xs text-amber-700 mt-0.5">El Plan Free permite hasta {FREE_DISH_LIMIT} platos. Mejora a Pro para platos ilimitados.</p>
          </div>
          <a
            href={`https://wa.me/34674460692?text=${encodeURIComponent('Hola, quiero mejorar mi plan de Messa al plan Pro')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap"
          >
            Mejorar a Pro
          </a>
        </div>
      )}

      {showImport && (
        <ImportMenuModal
          restaurantId={restaurantId}
          onSuccess={load}
          onClose={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <DishForm
          restaurantId={restaurantId}
          categories={categories}
          dish={editingDish}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setEditingDish(null) }}
        />
      )}

      {dishes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center text-gray-400">
          <UtensilsCrossed size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-500">Aún no tienes platos</p>
          <p className="text-sm mt-1">Haz clic en "Nuevo plato" para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {dishes.map(dish => (
            <div
              key={dish.id}
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-opacity ${
                !dish.available ? 'opacity-55' : ''
              }`}
            >
              {dish.image_url && (
                <div className="h-40 overflow-hidden bg-gray-100">
                  <img
                    src={dish.image_url}
                    alt={dish.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{dish.name}</h3>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {dish.original_price && (
                      <span className="text-gray-400 text-xs line-through">
                        {Number(dish.original_price).toFixed(2)} €
                      </span>
                    )}
                    <span className="text-amber-600 font-bold text-sm whitespace-nowrap">
                      {Number(dish.price).toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-1.5">
                  {dish.categories && (
                    <span className="inline-flex items-center text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                      {dish.categories.name}
                    </span>
                  )}
                  {dish.featured && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-[#FF6B35] border border-orange-100 px-2 py-0.5 rounded-full font-medium">
                      <Star size={9} /> Destacado
                    </span>
                  )}
                  {dish.best_seller && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-[#FF6B35] border border-orange-100 px-2 py-0.5 rounded-full font-medium">
                      <TrendingUp size={9} /> + Vendido
                    </span>
                  )}
                  {dish.is_special && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-[#FF6B35] border border-orange-100 px-2 py-0.5 rounded-full font-medium">
                      <Flame size={9} /> Especial hoy
                    </span>
                  )}
                  {dish.original_price && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full font-medium">
                      <Tag size={9} /> Oferta
                    </span>
                  )}
                </div>

                {dish.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 flex-1 mb-3">
                    {dish.description}
                  </p>
                )}

                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-50 mt-auto">
                  <button
                    onClick={() => toggleAvailable(dish)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                      dish.available
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {dish.available ? <Eye size={11} /> : <EyeOff size={11} />}
                    {dish.available ? 'Disponible' : 'Oculto'}
                  </button>

                  <button
                    onClick={() => toggleSpecial(dish)}
                    title={isFree ? 'Disponible en Plan Pro o Premium' : (dish.is_special ? 'Quitar especial' : 'Marcar como especial')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                      isFree
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : dish.is_special
                          ? 'bg-orange-50 text-[#FF6B35] hover:bg-orange-100'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {isFree ? <Lock size={9} /> : <Flame size={11} />}
                    Especial
                  </button>

                  <div className="ml-auto flex gap-1">
                    <button
                      onClick={() => { setEditingDish(dish); setShowForm(true) }}
                      className="p-1.5 text-gray-300 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteDish(dish)}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
