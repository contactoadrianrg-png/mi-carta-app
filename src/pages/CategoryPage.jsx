import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DishCard from '../components/menu/DishCard'
import { UtensilsCrossed, ChevronLeft, Menu, X } from 'lucide-react'
import { getTheme } from '../lib/themes'

export default function CategoryPage() {
  const { slug, catId } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [category, setCategory] = useState(null)
  const [allCats, setAllCats] = useState([])
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const channelRef = useRef(null)

  const fetchData = useCallback(async () => {
    const { data: rest, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, color_theme')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !rest) {
      setNotFound(true)
      setLoading(false)
      return null
    }
    setRestaurant(rest)

    const [catsRes, dishesRes] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', rest.id).order('sort_order'),
      supabase.from('dishes').select('*').eq('restaurant_id', rest.id).eq('available', true).eq('category_id', catId).order('sort_order'),
    ])

    const cats = catsRes.data || []
    setAllCats(cats)

    const found = cats.find(c => c.id === catId)
    if (!found) {
      setNotFound(true)
      setLoading(false)
      return null
    }
    setCategory(found)
    setDishes(dishesRes.data || [])
    setLoading(false)
    return rest.id
  }, [slug, catId])

  useEffect(() => {
    let isMounted = true
    fetchData().then(id => {
      if (!isMounted || !id) return
      channelRef.current = supabase
        .channel(`cat-${id}-${catId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes', filter: `restaurant_id=eq.${id}` }, () => { if (isMounted) fetchData() })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `restaurant_id=eq.${id}` }, () => { if (isMounted) fetchData() })
        .subscribe()
    })
    return () => {
      isMounted = false
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [fetchData])

  const topCats = useMemo(() => allCats.filter(c => !c.parent_id), [allCats])
  const theme = getTheme(restaurant?.color_theme)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
      <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${theme.accent} transparent transparent transparent` }} />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ backgroundColor: theme.bg }}>
      <UtensilsCrossed size={56} className="opacity-30 mb-4" style={{ color: theme.accent }} />
      <h1 className="text-xl font-bold text-gray-900">Categoría no encontrada</h1>
      <button onClick={() => navigate(`/carta/${slug}`)} className="mt-4 text-sm font-medium" style={{ color: theme.accent }}>
        ← Volver a la carta
      </button>
    </div>
  )

  const [first, ...rest] = dishes

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg }}>

      {/* ── Botón volver ── */}
      <button
        onClick={() => navigate(`/carta/${slug}`)}
        aria-label="Volver"
        className="fixed top-4 left-4 z-40 w-11 h-11 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"
      >
        <ChevronLeft size={20} className="text-gray-700" />
      </button>

      {/* ── Botón hamburguesa ── */}
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Abrir menú"
        className="fixed top-4 right-4 z-40 w-11 h-11 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
        style={{ backgroundColor: theme.accent }}
      >
        <Menu size={20} />
      </button>

      {/* ── Overlay ── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}

      {/* ── Panel lateral ── */}
      <aside className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white flex flex-col shadow-2xl border-l border-gray-100 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.accent }}>Carta</p>
            <p className="font-bold text-gray-900 text-sm truncate mt-0.5">{restaurant.name}</p>
          </div>
          <button onClick={() => setMenuOpen(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {topCats.map(cat => (
            <Link
              key={cat.id}
              to={`/carta/${slug}/${cat.id}`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-4 py-3.5 rounded-xl text-sm font-medium transition-colors"
              style={cat.id === catId
                ? { backgroundColor: theme.bgTint, color: theme.accent }
                : { color: '#6b7280' }
              }
            >
              {cat.name}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Carta digital por <span style={{ color: theme.accent }}>Messa</span></p>
        </div>
      </aside>

      {/* ── Cabecera de categoría ── */}
      <header className="pt-20 pb-6 px-5 bg-white border-b border-gray-100">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{restaurant.name}</p>
        <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {dishes.length} {dishes.length === 1 ? 'plato' : 'platos'}
        </p>
      </header>

      {/* ── Platos ── */}
      <main className="max-w-lg mx-auto px-4 pt-5 pb-12">
        {dishes.length === 0 ? (
          <p className="text-center py-16 text-gray-400 text-sm">No hay platos disponibles.</p>
        ) : (
          <div className="space-y-3">
            <DishCard dish={first} variant="featured" theme={theme} />
            {rest.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {rest.map(dish => (
                  <DishCard key={dish.id} dish={dish} variant="grid" theme={theme} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center pb-8 text-xs text-gray-400">
        Carta digital por <span className="font-medium" style={{ color: theme.accent }}>Messa</span>
      </footer>
    </div>
  )
}
