import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronUp, LayoutList, PanelsTopLeft, UtensilsCrossed } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DishDetailSheet from '../components/menu/DishDetailSheet'
import CategoryTabs from '../components/menu/CategoryTabs'
import { supabase } from '../lib/supabase'
import { getTheme, applyTheme, getVisualTheme } from '../lib/themes'
import { filterMenuDishes, loadPublicMenu, visibleMenuCategories } from '../lib/menuData'
import './DiscoverMenuPage.css'

export default function DiscoverMenuPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [restaurant, setRestaurant] = useState(null)
  const [categories, setCategories] = useState([])
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDish, setSelectedDish] = useState(null)

  useEffect(() => {
    let alive = true
    loadPublicMenu(supabase, slug)
      .then(data => { if (alive) { setRestaurant(data.restaurant); setCategories(data.categories || []); setDishes(data.dishes || []) } })
      .catch(() => { if (alive) setRestaurant(false) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug])

  useEffect(() => {
    applyTheme(restaurant?.theme ?? 'default')
    return () => applyTheme('default')
  }, [restaurant?.theme])

  const theme = restaurant?.theme && restaurant.theme !== 'default'
    ? getVisualTheme(restaurant.theme)
    : getTheme(restaurant?.color_theme)
  const activeCategory = searchParams.get('category') || null
  const visible = useMemo(() => filterMenuDishes(dishes, categories, activeCategory).sort((a, b) => Number(b.featured) - Number(a.featured)), [dishes, categories, activeCategory])
  const topCats = useMemo(() => visibleMenuCategories(categories, dishes), [categories, dishes])
  const openDish = useCallback(dish => setSelectedDish(dish), [])
  const changeCategory = useCallback((category) => {
    navigate({ pathname: `/carta/${slug}/descubre`, search: category ? `?category=${encodeURIComponent(category)}` : '' })
  }, [navigate, slug])

  if (loading) return <div className="discover-loading"><span /></div>
  if (!restaurant || !visible.length) return <div className="discover-empty"><UtensilsCrossed size={48} /><h1>Próximamente</h1><p>Este restaurante aún no tiene platos para descubrir.</p><Link to={`/carta/${slug}/menu`}>Volver a la carta</Link></div>

  return <main className="discover-menu" style={{ '--discover-accent': theme.accent }}>
    <Link to={`/carta/${slug}/menu`} className="discover-back" aria-label="Volver a la carta"><ArrowLeft size={22} /></Link>
    <header className="discover-header"><strong>{restaurant.name}</strong><span>DESCUBRE LA CARTA</span></header>
    <nav className="discover-view-toggle" aria-label="Modo de visualización">
      <Link to={`/carta/${slug}/menu`} title="Vista normal" aria-label="Cambiar a vista normal"><LayoutList size={19} /></Link>
      <span className="is-active" title="Vista feed"><PanelsTopLeft size={19} /></span>
    </nav>
    <div className="discover-categories"><CategoryTabs categories={topCats} activeId={activeCategory} onChange={changeCategory} theme={theme} /></div>
    <div className="discover-feed" aria-label="Platos destacados. Desliza para descubrir más.">
      {visible.map((dish, index) => <article className="discover-dish" key={dish.id}>
        {dish.image_url ? <img src={dish.image_url} alt={dish.name} /> : <div className="discover-photo-fallback"><UtensilsCrossed size={54} /></div>}
        <div className="discover-shade" />
        <button className="discover-copy" type="button" onClick={() => openDish(dish)} aria-label={`Ver ${dish.name}`}>
          {dish.featured && <span className="discover-tag">DESTACADO</span>}
          <h1>{dish.name}</h1>
          <strong>{Number(dish.price).toFixed(2).replace('.', ',')} €</strong>
          {dish.description && <p>{dish.description}</p>}
          <span className="discover-detail">Ver plato <b>→</b></span>
        </button>
        <aside className="discover-progress" aria-hidden="true">{visible.map((_, point) => <i key={point} className={point === index ? 'is-active' : ''} />)}</aside>
        {index === 0 && <div className="discover-swipe" aria-hidden="true"><ChevronUp size={19} />Desliza para descubrir</div>}
      </article>)}
    </div>
    {selectedDish && <DishDetailSheet dish={selectedDish} onClose={() => setSelectedDish(null)} theme={theme} />}
  </main>
}
