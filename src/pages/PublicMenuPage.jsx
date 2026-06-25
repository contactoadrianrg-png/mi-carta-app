import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DishCard from '../components/menu/DishCard'
import DishDetailSheet from '../components/menu/DishDetailSheet'
import { UtensilsCrossed, Menu, X } from 'lucide-react'
import { SOCIALS, buildSocialUrl } from '../lib/socials'
import { getTheme, applyTheme } from '../lib/themes'

const FREE_DISH_LIMIT = 20

const EMOJI_MAP = {
  entrante: '🥗', entrantes: '🥗', ensalada: '🥗', ensaladas: '🥗',
  sopa: '🍲', sopas: '🍲', pasta: '🍝',
  pizza: '🍕', pizzas: '🍕',
  carne: '🥩', carnes: '🥩', pollo: '🍗',
  pescado: '🐟', pescados: '🐟', marisco: '🦐', mariscos: '🦐',
  hamburguesa: '🍔', hamburguesas: '🍔',
  sandwich: '🥪', bocadillo: '🥪', bocadillos: '🥪',
  tapa: '🫙', tapas: '🫙', ración: '🍽️', raciones: '🍽️',
  postre: '🍮', postres: '🍮',
  bebida: '🥤', bebidas: '🥤', vino: '🍷', vinos: '🍷',
  cerveza: '🍺', cervezas: '🍺',
  cocktail: '🍹', cóctel: '🍹', cócteles: '🍹',
  café: '☕', cafés: '☕', infusión: '🍵',
  desayuno: '🥐', desayunos: '🥐', brunch: '🍳',
  sushi: '🍣', asiático: '🥢', asiática: '🥢',
  vegano: '🌱', vegana: '🌱', vegetariano: '🌿', vegetariana: '🌿',
  especial: '⭐', especiales: '⭐',
  niños: '🧒', infantil: '🧒',
}

function getEmoji(name) {
  return EMOJI_MAP[name?.toLowerCase().trim()] || '🍽️'
}

export default function PublicMenuPage() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [categories, setCategories] = useState([])
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedDish, setSelectedDish] = useState(null)
  const channelRef    = useRef(null)
  const cartaTracked  = useRef(false)

  const trackCartaView = useCallback(async (restaurantId) => {
    if (cartaTracked.current) return
    cartaTracked.current = true
    await supabase.from('carta_views').insert({ restaurant_id: restaurantId })
  }, [])

  const trackPlateView = useCallback(async (restaurantId, dish) => {
    await supabase.from('plate_views').insert({
      restaurant_id: restaurantId,
      plate_id:      dish.id,
      plate_name:    dish.name,
    })
  }, [])

  const fetchData = useCallback(async () => {
    const { data: rest, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !rest) { setNotFound(true); setLoading(false); return null }
    setRestaurant(rest)
    trackCartaView(rest.id)

    const [catsRes, dishesRes] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', rest.id).order('sort_order'),
      supabase.from('dishes').select('*').eq('restaurant_id', rest.id).eq('available', true).order('sort_order'),
    ])

    setCategories(catsRes.data || [])
    setDishes(dishesRes.data || [])
    setLoading(false)
    return rest.id
  }, [slug])

  useEffect(() => {
    let alive = true
    fetchData().then(id => {
      if (!alive || !id) return
      channelRef.current = supabase.channel(`pub-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes', filter: `restaurant_id=eq.${id}` }, () => { if (alive) fetchData() })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `restaurant_id=eq.${id}` }, () => { if (alive) fetchData() })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants', filter: `id=eq.${id}` }, () => { if (alive) fetchData() })
        .subscribe()
    })
    return () => {
      alive = false
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [fetchData])

  useEffect(() => {
    applyTheme(restaurant?.theme ?? 'default')
    return () => applyTheme('default')
  }, [restaurant?.theme])

  const handleDishClick = useCallback((dish) => {
    setSelectedDish(dish)
    if (restaurant?.id) trackPlateView(restaurant.id, dish)
  }, [restaurant, trackPlateView])

  const plan = restaurant?.plan || 'free'
  const isFree = plan === 'free'
  const theme = getTheme(restaurant?.color_theme)

  const planDishes = useMemo(() => {
    if (!isFree) return dishes
    return dishes.slice(0, FREE_DISH_LIMIT)
  }, [dishes, isFree])

  const specials = useMemo(() => planDishes.filter(d => d.is_special), [planDishes])

  const topCats = useMemo(() => {
    const top = categories.filter(c => !c.parent_id)
    return top.filter(c => planDishes.some(d => d.category_id === c.id))
  }, [categories, planDishes])

  const catFirstImage = useMemo(() => {
    const map = {}
    planDishes.forEach(d => {
      if (d.category_id && d.image_url && !map[d.category_id]) map[d.category_id] = d.image_url
    })
    return map
  }, [planDishes])

  const filtered = useMemo(() => {
    if (activeCategory === null) return planDishes
    return planDishes.filter(d => d.category_id === activeCategory)
  }, [planDishes, activeCategory])

  const activeName = activeCategory
    ? topCats.find(c => c.id === activeCategory)?.name ?? ''
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

  const initial = (restaurant.name || '?')[0].toUpperCase()

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg }}>

      {/* ── Hamburguesa fija ── */}
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
        <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      )}

      {/* ── Panel lateral ── */}
      <aside className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white flex flex-col shadow-2xl border-l border-gray-100 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.accent }}>Carta</p>
            <p className="font-bold text-[#1A1A1A] text-sm mt-0.5 truncate">{restaurant.name}</p>
          </div>
          <button onClick={() => setMenuOpen(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <button
            onClick={() => { setActiveCategory(null); setMenuOpen(false) }}
            className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-colors"
            style={activeCategory === null
              ? { backgroundColor: theme.bgTint, color: theme.accent }
              : { color: '#6b7280' }
            }
          >
            Toda la carta
          </button>
          {topCats.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setMenuOpen(false) }}
              className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-colors"
              style={activeCategory === cat.id
                ? { backgroundColor: theme.bgTint, color: theme.accent }
                : { color: '#6b7280' }
              }
            >
              {cat.name}
            </button>
          ))}
        </nav>
        {isFree && (
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Carta digital por <span style={{ color: theme.accent }}>Messa</span></p>
          </div>
        )}
      </aside>

      {/* ── HEADER — nombre siempre visible */}
      <header style={{
        position: 'relative',
        minHeight: 180,
        overflow: 'hidden',
        backgroundColor: theme.primary,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}>
        {/* Banner como fondo absoluto */}
        {restaurant.banner_url && (
          <img
            src={restaurant.banner_url}
            alt={restaurant.name}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', zIndex: 0,
            }}
          />
        )}

        {/* Overlay: gradiente oscuro cuando hay banner, suave sin él */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: restaurant.banner_url
            ? 'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.20) 60%, transparent 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.30) 0%, transparent 100%)',
        }} />

        {/* Contenido — siempre encima del overlay */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '24px 20px 28px',
          boxSizing: 'border-box',
        }}>
          {/* Logo */}
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt="Logo"
              style={{
                width: 52, height: 52, borderRadius: '50%',
                objectFit: 'cover', marginBottom: 12,
                border: '2px solid rgba(255,255,255,0.70)',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              border: '2px solid rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#FFF' }}>{initial}</span>
            </div>
          )}

          {/* Nombre — siempre visible */}
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 700,
            color: '#FFF', lineHeight: 1.2,
          }}>
            {restaurant.name}
          </h1>

          {/* Descripción */}
          {restaurant.description && (
            <p style={{
              margin: '6px 0 0', fontSize: 13,
              color: 'rgba(255,255,255,0.82)', lineHeight: 1.5,
            }}>
              {restaurant.description}
            </p>
          )}
        </div>
      </header>

      {/* ── CATEGORÍAS estilo historias ── */}
      {topCats.length > 0 && (
        <div className="border-b border-black/5">
          <div className="flex gap-6 px-5 py-5 overflow-x-auto scrollbar-hide">

            {/* Todos */}
            <button onClick={() => setActiveCategory(null)} className="flex flex-col items-center gap-2 shrink-0">
              <div
                className="w-[70px] h-[70px] rounded-full flex items-center justify-center text-[28px] transition-all"
                style={activeCategory === null
                  ? { border: `3px solid ${theme.accent}`, backgroundColor: theme.bgTint }
                  : { border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }
                }
              >
                ✨
              </div>
              <span className="text-xs font-semibold w-[72px] text-center truncate" style={{ color: activeCategory === null ? theme.accent : '#6b7280' }}>
                Todos
              </span>
            </button>

            {topCats.map(cat => {
              const isActive = activeCategory === cat.id
              const img = catFirstImage[cat.id]
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className="w-[70px] h-[70px] rounded-full overflow-hidden transition-all"
                    style={isActive
                      ? { border: `3px solid ${theme.accent}` }
                      : { border: '1px solid #e5e7eb' }
                    }
                  >
                    {img ? (
                      <img src={img} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-[28px]"
                        style={{ backgroundColor: isActive ? theme.bgTint : '#f9fafb' }}
                      >
                        {getEmoji(cat.name)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold w-[72px] text-center truncate" style={{ color: isActive ? theme.accent : '#6b7280' }}>
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

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
              <div className="grid grid-cols-2 gap-3">
                {specials.map(dish => (
                  <DishCard key={dish.id} dish={dish} variant="grid" onClick={() => handleDishClick(dish)} theme={theme} />
                ))}
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-center py-16 text-gray-400 text-sm">No hay platos disponibles.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(dish => (
              <DishCard key={dish.id} dish={dish} variant="grid" onClick={() => handleDishClick(dish)} theme={theme} />
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
        <DishDetailSheet dish={selectedDish} onClose={() => setSelectedDish(null)} theme={theme} />
      )}
    </div>
  )
}
