import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Trash2, Tag, ChevronRight, X } from 'lucide-react'

export default function CategoryManager({ restaurantId }) {
  const [categories, setCategories] = useState([])
  const [newName, setNewName] = useState('')
  const [addingSubFor, setAddingSubFor] = useState(null)
  const [newSubName, setNewSubName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) toast.error('Error al cargar categorías')
        else setCategories(data || [])
        setLoading(false)
      })
  }, [restaurantId])

  const parents = categories.filter(c => !c.parent_id)
  const childrenOf = (pid) => categories.filter(c => c.parent_id === pid)

  const addCategory = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({ restaurant_id: restaurantId, name: newName.trim(), sort_order: parents.length })
      .select()
      .single()
    if (error) toast.error(error.message)
    else {
      setCategories(prev => [...prev, data])
      setNewName('')
      toast.success('Categoría añadida')
    }
    setAdding(false)
  }

  const addSubcategory = async (e, parentId) => {
    e.preventDefault()
    if (!newSubName.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({
        restaurant_id: restaurantId,
        name: newSubName.trim(),
        sort_order: childrenOf(parentId).length,
        parent_id: parentId,
      })
      .select()
      .single()
    if (error) toast.error(error.message)
    else {
      setCategories(prev => [...prev, data])
      setNewSubName('')
      setAddingSubFor(null)
      toast.success('Subcategoría añadida')
    }
    setAdding(false)
  }

  const deleteCategory = async (cat) => {
    const isParent = !cat.parent_id
    const label = isParent ? 'categoría' : 'subcategoría'
    const extra = isParent ? '\nSus subcategorías y platos asociados quedarán sin categoría.' : ''
    if (!confirm(`¿Eliminar la ${label} "${cat.name}"?${extra}`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) toast.error(error.message)
    else {
      setCategories(prev => prev.filter(c => c.id !== cat.id && c.parent_id !== cat.id))
      toast.success(`${isParent ? 'Categoría' : 'Subcategoría'} eliminada`)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  )

  return (
    <div className="max-w-xl space-y-4">
      {/* Nueva categoría */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Nueva categoría</h2>
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ej: Entrantes, Postres, Bebidas..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-3 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Plus size={18} />
            Añadir
          </button>
        </form>
      </div>

      {/* Lista de categorías */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Categorías{' '}
          <span className="text-gray-400 font-normal text-sm">({parents.length})</span>
        </h2>

        {parents.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Tag size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no tienes categorías</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {parents.map(cat => {
              const subs = childrenOf(cat.id)
              return (
                <li key={cat.id} className="rounded-xl border border-gray-100 overflow-hidden">
                  {/* Fila de categoría padre */}
                  <div className="flex items-center gap-3 px-4 py-3 group">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Tag size={13} className="text-amber-500" />
                    </div>
                    <span className="flex-1 font-medium text-gray-800 text-sm">{cat.name}</span>
                    <button
                      onClick={() => {
                        setAddingSubFor(addingSubFor === cat.id ? null : cat.id)
                        setNewSubName('')
                      }}
                      className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-all font-medium shrink-0"
                      title="Añadir subcategoría"
                    >
                      <Plus size={12} />
                      Sub
                    </button>
                    <button
                      onClick={() => deleteCategory(cat)}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      title="Eliminar categoría"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Subcategorías */}
                  {subs.map(sub => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/70 border-t border-gray-100 group/sub"
                    >
                      <ChevronRight size={12} className="text-gray-300 ml-7 shrink-0" />
                      <span className="flex-1 text-sm text-gray-600">{sub.name}</span>
                      <button
                        onClick={() => deleteCategory(sub)}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover/sub:opacity-100 shrink-0"
                        title="Eliminar subcategoría"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Formulario inline para añadir subcategoría */}
                  {addingSubFor === cat.id && (
                    <form
                      onSubmit={e => addSubcategory(e, cat.id)}
                      className="flex items-center gap-2 px-4 py-3 bg-amber-50/60 border-t border-amber-100"
                    >
                      <ChevronRight size={12} className="text-amber-400 ml-7 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        value={newSubName}
                        onChange={e => setNewSubName(e.target.value)}
                        placeholder="Nombre de subcategoría..."
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                      />
                      <button
                        type="submit"
                        disabled={adding || !newSubName.trim()}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingSubFor(null); setNewSubName('') }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
