import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useScreenNavigation } from '../hooks/useScreenNavigation'
import { supabase } from '../lib/supabase'
import DishDetailSheet from '../components/menu/DishDetailSheet'
import RestaurantHeader from '../components/menu/RestaurantHeader'
import MenuHighlights from '../components/menu/MenuHighlights'
import { DailyMenuSheet } from '../components/menu/DailyMenu'
import { normalizeDailyMenu } from '../lib/dailyMenu'
import './PublicMenuPage.css'
import { normalizeMenuSlides } from '../lib/menuSlides'
import CategoryTabs from '../components/menu/CategoryTabs'
import DishGridCard from '../components/menu/DishGridCard'
import { LayoutList, PanelsTopLeft, UtensilsCrossed } from 'lucide-react'
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
  const menuDefaults = useMemo(() => ({ category: catId ?? null, favorites: false, dishId: null, daily: false }), [catId])
  const [screen, openScreen, backScreen] = useScreenNavigation('menuScreen', menuDefaults)
  const activeCategory = screen.category
  const showFavorites = screen.favorites
  const visibleDishes = restaurant?.plan === 'free' ? dishes.slice(0, FREE_DISH_LIMIT) : dishes
  const selectedDish = visibleDishes.find(dish => dish.id === screen.dishId) ?? null
  const setActiveCategory = category => openScreen({ category, dishId: null, daily: false })
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [favorites, setFavorites] = useState(() => readMenuFavorites(slug))
  const closeDish = useCallback(() => backScreen({ dishId: null }), [backScreen])
  const closeDailyMenu = useCallback(() => backScreen({ daily: false }), [backScreen])
  const openDailyMenu = useCallback(() => openScreen({ dishId: null, daily: true }), [openScreen])
  const dailyMenu = useMemo(() => normalizeDailyMenu(restaurant?.daily_menu), [restaurant?.daily_menu])
  const showDailyMenu = screen.daily && !!dailyMenu?.enabled

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

  useEffect(() => {
    applyTheme(restaurant?.theme ?? 'default')
    return () => applyTheme('default')
  }, [restaurant?.theme])

  const handleDishClick = useCallback((dish) => {
    openScreen({ daily: false, dishId: dish.id })
    if (restaurant?.id) trackPlateView(restaurant.id, dish).catch(() => {})
  }, [restaurant, trackPlateView, openScreen])

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
    const matching = filterMenuDishes(planDishes, categories, activeCategory)
    return showFavorites ? matching.filter(dish => favorites.includes(dish.id)) : matching
  }, [planDishes, categories, activeCategory, showFavorites, favorites])

  const slides = useMemo(() => {
    const custom = !isFree ? normalizeMenuSlides(restaurant?.menu_slides) : []
    return custom.length ? custom : normalizeMenuSlides(restaurant?.banner_url ? [{ id: 'restaurant-banner', image_url: restaurant.banner_url, title: restaurant.name }] : [])
  }, [restaurant, isFree])
  const featured = !showFavorites && !activeCategory ? filtered.filter(dish => dish.featured || (!isFree && dish.is_special)) : []
  const featuredIds = new Set(featured.map(dish => dish.id))
  const regularDishes = filtered.filter(dish => !featuredIds.has(dish.id))
  const activeTab = topCats.find(c => categoryFamilyIds(categories, c.id).has(activeCategory))?.id ?? activeCategory

  const activeName = showFavorites ? 'Tus favoritos' : activeCategory
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
    <div className="messa-public-menu min-h-screen" style={{ backgroundColor: theme.bg, '--menu-bg': theme.bg, '--menu-tint': theme.bgTint, '--menu-accent': theme.accent, '--menu-text': theme.text ?? '#252a21', '--menu-card': theme.text ? theme.bgTint : '#ffffff', '--menu-border': theme.cardBorder ?? 'rgba(35,40,30,.09)' }}>
      <nav className="messa-view-toggle" aria-label="Modo de visualización">
        <span className="is-active" title="Vista normal"><LayoutList size={19} /></span>
        <Link to={`/carta/${slug}/descubre${activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : ''}`} title="Vista feed" aria-label="Cambiar a vista feed"><PanelsTopLeft size={19} /></Link>
      </nav>
      <RestaurantHeader restaurant={restaurant} theme={theme} favoriteCount={planDishes.filter(dish => favorites.includes(dish.id)).length} showFavorites={showFavorites} onToggleFavorites={() => openScreen({ category: null, favorites: !showFavorites, dishId: null, daily: false })} />
      {!showFavorites && <MenuHighlights slides={slides} />}
      <div className="messa-menu-categories"><CategoryTabs categories={topCats} activeId={activeTab} onChange={setActiveCategory} theme={theme} onOpenDailyMenu={dailyMenu?.enabled ? openDailyMenu : undefined} dailyMenuOpen={showDailyMenu} /></div>
      <main className="messa-menu-main">
        {featured.length > 0 && <section className="messa-featured-section" aria-labelledby="featured-heading"><div className="messa-menu-section-heading"><div><p>LOS IMPRESCINDIBLES</p><h2 id="featured-heading">Platos destacados</h2></div></div><div className="messa-dishes-grid">{featured.map(dish => <DishGridCard key={dish.id} dish={dish} onClick={() => handleDishClick(dish)} theme={theme} isFavorite={favorites.includes(dish.id)} />)}</div></section>}
        {(regularDishes.length > 0 || filtered.length === 0) && <section aria-labelledby="menu-list-heading">
          <div className="messa-menu-section-heading"><div><p>ELIGE LO QUE TE APETECE</p><h2 id="menu-list-heading">{activeName}</h2></div><span className="messa-menu-count">{filtered.length} {filtered.length === 1 ? 'plato' : 'platos'}</span></div>
          {filtered.length === 0 ? <p className="messa-menu-empty">{showFavorites ? 'Aún no tienes favoritos en esta selección. Abre un plato y toca el corazón para guardarlo.' : 'No hay platos disponibles.'}</p> : regularDishes.length > 0 ? <div className="messa-dishes-grid">{regularDishes.map(dish => <DishGridCard key={dish.id} dish={dish} onClick={() => handleDishClick(dish)} theme={theme} isFavorite={favorites.includes(dish.id)} />)}</div> : <p className="messa-menu-empty">Todos los platos de esta carta están en destacados.</p>}
        </section>}
        {isFree && dishes.length > FREE_DISH_LIMIT && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Mostrando {FREE_DISH_LIMIT} de {dishes.length} platos · Plan Free
          </p>
        )}
      </main>

      {/* ── FOOTER REDES SOCIALES — solo Plan Pro ── */}
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
          Carta digital por <span className="font-semibold" style={{ color: theme.accent }}>Messa</span>
        </footer>
      )}

      {selectedDish && (
        <DishDetailSheet key={selectedDish.id} dish={selectedDish} onClose={closeDish} theme={theme}
          isFavorite={favorites.includes(selectedDish.id)} onToggleFavorite={toggleFavorite} />
      )}
      {showDailyMenu && dailyMenu?.enabled && <DailyMenuSheet menu={dailyMenu} onClose={closeDailyMenu} theme={theme} />}
    </div>
  )
}
