import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DishDetailSheet from '../components/menu/DishDetailSheet'
import RestaurantHeader from '../components/menu/RestaurantHeader'
import CategoryTabs from '../components/menu/CategoryTabs'
import DishGridCard from '../components/menu/DishGridCard'
import { UtensilsCrossed } from 'lucide-react'
import { SOCIALS, buildSocialUrl } from '../lib/socials'
import { getTheme, applyTheme, getVisualTheme } from '../lib/themes'
import { loadPublicMenu, filterMenuDishes, visibleMenuCategories, categoryFamilyIds } from '../lib/menuData'
import { readMenuFavorites, saveMenuFavorites } from '../lib/menuFavorites'

const FREE_DISH_LIMIT = 20

export default function PublicMenuPage() {
  const { slug, catId } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [categories, setCategories] = useState([])
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeCategory, setActiveCategory] = useState(catId ?? null)
  const [selectedDish, setSelectedDish] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [favorites, setFavorites] = useState(() => readMenuFavorites(slug))
  const closeDish = useCallback(() => setSelectedDish(null), [])

  const trackPlateView = useCallback(async (restaurantId, dish) => {
    await supabase.from('plate_views').insert({
      restaurant_id: restaurantId,
      plate_id:      dish.id,
      plate_name:    dish.name,
    })
  }, [])

  useEffect(() => {
    let alive = true
    let requestVersion = 0
    let channel = null
    let tracked = false
    setLoading(true)
    setNotFound(false)
    setLoadError(false)
    setRestaurant(null)
    setCategories([])
    setDishes([])
    setSelectedDish(null)
    setFavorites(readMenuFavorites(slug))

    async function refresh() {
      const version = ++requestVersion
      try {
        const data = await loadPublicMenu(supabase, slug)
        if (!alive || version !== requestVersion) return
        setRestaurant(data.restaurant)
        setCategories(data.categories)
        setDishes(data.dishes)
        setNotFound(!data.restaurant)
        setLoadError(false)
        if (data.restaurant && data.restaurant.active !== false) {
          const id = data.restaurant.id
          if (!tracked) {
            tracked = true
            Promise.resolve(supabase.from('carta_views').insert({ restaurant_id: id })).catch(() => {})
          }
          if (!channel) {
            channel = supabase.channel(`pub-${id}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes', filter: `restaurant_id=eq.${id}` }, refresh)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `restaurant_id=eq.${id}` }, refresh)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants', filter: `id=eq.${id}` }, refresh)
              .subscribe()
          }
        }
      } catch {
        if (alive && version === requestVersion) setLoadError(true)
      } finally {
        if (alive && version === requestVersion) setLoading(false)
      }
    }
    refresh()
    return () => {
      alive = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [slug, retry])

  useEffect(() => { setActiveCategory(catId ?? null) }, [slug, catId])

  useEffect(() => {
    applyTheme(restaurant?.theme ?? 'default')
    return () => applyTheme('default')
  }, [restaurant?.theme])

  const handleDishClick = useCallback((dish) => {
    setSelectedDish(dish)
    if (restaurant?.id) trackPlateView(restaurant.id, dish).catch(() => {})
  }, [restaurant, trackPlateView])

  const toggleFavorite = () => {
    if (!selectedDish) return
    const next = favorites.includes(selectedDish.id)
      ? favorites.filter(id => id !== selectedDish.id)
      : [...favorites, selectedDish.id]
    setFavorites(next)
    saveMenuFavorites(slug, next)
  }

  const plan = restaurant?.plan || 'free'
  const isFree = plan === 'free'
  const theme = (restaurant?.theme && restaurant.theme !== 'default')
    ? getVisualTheme(restaurant.theme)
    : getTheme(restaurant?.color_theme)

  const planDishes = useMemo(() => {
    if (!isFree) return dishes
    return dishes.slice(0, FREE_DISH_LIMIT)
  }, [dishes, isFree])

  const topCats = useMemo(() => visibleMenuCategories(categories, planDishes), [categories, planDishes])

  const filtered = useMemo(() => {
    return filterMenuDishes(planDishes, categories, activeCategory)
  }, [planDishes, categories, activeCategory])

  const specials = useMemo(() => filtered.filter(d => d.is_special), [filtered])
  const activeTab = topCats.find(c => categoryFamilyIds(categories, c.id).has(activeCategory))?.id ?? activeCategory

  const activeName = activeCategory
    ? categories.find(c => c.id === activeCategory)?.name ?? 'Categoría'
    : 'Toda la carta'

  const socialLinks = useMemo(() => {
    if (isFree || !restaurant) return []
    return SOCIALS
      .map(s => ({ ...s, url: buildSocialUrl(s.key, restaurant[`social_${s.key}`]) }))
      .filter(s => s.url)
  }, [restaurant, isFree])

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B35 transparent transparent transparent' }} />
    </div>
  )

  if (loadError) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6" role="alert">
      <h1 className="text-xl font-bold text-[#1A1A1A]">No se ha podido cargar la carta</h1>
      <p className="text-gray-500 text-sm mt-2">Comprueba tu conexión e inténtalo de nuevo.</p>
      <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-5 rounded-xl px-5 py-3 bg-[#FF6B35] text-white font-semibold">Reintentar</button>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
      <UtensilsCrossed size={52} className="opacity-30 mb-4" style={{ color: '#FF6B35' }} />
      <h1 className="text-xl font-bold text-[#1A1A1A]">Carta no encontrada</h1>
      <p className="text-gray-400 text-sm mt-1">No existe ningún restaurante con esta URL.</p>
    </div>
  )

  if (restaurant && restaurant.active === false) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
      <UtensilsCrossed size={52} className="opacity-30 mb-4" style={{ color: '#FF6B35' }} />
      <h1 className="text-xl font-bold text-[#1A1A1A]">Carta no disponible</h1>
      <p className="text-gray-400 text-sm mt-1">Este restaurante no está disponible en este momento.</p>
    </div>
  )

  if (catId && !categories.some(category => category.id === catId)) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-xl font-bold text-[#1A1A1A]">Categoría no encontrada</h1>
      <Link to={`/carta/${slug}/menu`} className="mt-4 text-[#FF6B35] font-semibold">Volver a la carta</Link>
    </div>
  )

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: theme.bg }}>

      {/* ── CABECERA: banner + nombre ── */}
      <RestaurantHeader restaurant={restaurant} theme={theme} />

      {/* ── CATEGORÍAS: única navegación de categorías de la carta ── */}
      <CategoryTabs
        categories={topCats}
        activeId={activeTab}
        onChange={setActiveCategory}
        theme={theme}
      />

      {/* ── SECCIÓN DE PLATOS ── */}
      <main className="max-w-lg mx-auto px-4 pt-5 pb-10">
        <div className="text-center mb-5">
          <h2 className="font-bold text-xl" style={{ color: theme.accent }}>{activeName}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} {filtered.length === 1 ? 'plato' : 'platos'}</p>
        </div>

        {/* ── ESPECIALES DE HOY — solo Plan Pro / Premium ── */}
        {!isFree && specials.length > 0 && (
          <div className="mb-6">
            <div
              className="rounded-2xl p-4"
              style={{ border: `1px solid ${theme.accent}`, backgroundColor: theme.bgTint + 'aa' }}
            >
              <h2 className="font-bold text-[18px] mb-3 flex items-center gap-1.5" style={{ color: theme.accent }}>
                ⭐ Especial de hoy
              </h2>
              <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                {specials.map(dish => (
                  <DishGridCard key={dish.id} dish={dish} onClick={() => handleDishClick(dish)} theme={theme} />
                ))}
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-center py-16 text-gray-400 text-sm">No hay platos disponibles.</p>
        ) : (
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
            {filtered.map(dish => (
              <DishGridCard key={dish.id} dish={dish} onClick={() => handleDishClick(dish)} theme={theme} />
            ))}
          </div>
        )}

        {isFree && dishes.length > FREE_DISH_LIMIT && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Mostrando {FREE_DISH_LIMIT} de {dishes.length} platos · Plan Free
          </p>
        )}
      </main>

      {/* ── FOOTER REDES SOCIALES — solo Plan Pro / Premium ── */}
      {socialLinks.length > 0 && (
        <div className="pb-6 px-4 text-center">
          <div className="h-px bg-black/5 mb-6 max-w-lg mx-auto" />
          <div className="flex flex-wrap justify-center gap-3">
            {socialLinks.map(({ key, label, path, url }) => (
              <a key={key} href={url} target={key === 'phone' ? undefined : '_blank'} rel="noopener noreferrer" aria-label={label}
                className="w-12 h-12 rounded-full text-white flex items-center justify-center active:scale-95 transition-transform shadow-md"
                style={{ backgroundColor: theme.accent }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d={path} /></svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOTER MARCA MESSA — solo Plan Free ── */}
      {isFree && (
        <footer className="text-center pb-8 text-xs text-gray-400">
          Carta digital por <span className="font-medium" style={{ color: theme.accent }}>Messa</span>
        </footer>
      )}

      {selectedDish && (
        <DishDetailSheet key={selectedDish.id} dish={selectedDish} onClose={closeDish} theme={theme}
          isFavorite={favorites.includes(selectedDish.id)} onToggleFavorite={toggleFavorite} />
      )}
    </div>
  )
}
