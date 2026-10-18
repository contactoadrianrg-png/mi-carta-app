import { useState } from 'react'
import { Home, UtensilsCrossed, Brush, Tags, CalendarDays, Settings, BarChart3, User, ChevronRight, HelpCircle } from 'lucide-react'
import './DashboardLayout.css'

export const SUPPORT_URL = 'https://wa.me/34674460692?text=Hola,%20necesito%20ayuda%20con%20Messa'
const SIDE_NAV = [
  { id: 'home', label: 'Inicio', Icon: Home },
  { id: 'dishes', label: 'Mi carta', Icon: UtensilsCrossed },
  { id: 'customize', label: 'Personalizar', Icon: Brush },
  { id: 'slides', label: 'Destacado', Icon: Tags },
  { id: 'reservations', label: 'Reservas y redes', Icon: CalendarDays },
  { id: 'stats', label: 'Estadísticas', Icon: BarChart3 },
  { id: 'restaurant', label: 'Ajustes', Icon: Settings },
]
const MOBILE_NAV = [
  { id: 'home', label: 'Inicio', Icon: Home },
  { id: 'dishes', label: 'Carta', Icon: UtensilsCrossed },
  { id: 'slides', label: 'Destacado', Icon: Tags },
  { id: 'account', label: 'Perfil', Icon: User },
]
const TITLES = { home: 'Panel de control', dishes: 'Mi carta', categories: 'Mi carta', slides: 'Destacado', reservations: 'Reservas y redes', socials: 'Redes sociales', stats: 'Estadísticas', restaurant: 'Ajustes del restaurante', account: 'Mi cuenta' }

export function RestaurantAvatar({ restaurant }) {
  const [failed, setFailed] = useState(null)
  return <span className="md-avatar">{restaurant?.logo_url && restaurant.logo_url !== failed ? <img src={restaurant.logo_url} alt="" onError={() => setFailed(restaurant.logo_url)} /> : (restaurant?.name || 'M')[0].toUpperCase()}</span>
}

export default function DashboardLayout({ restaurant, activeTab, onNavigate, onShowCustomize, children }) {
  const current = activeTab === 'categories' ? 'dishes' : activeTab
  function go(id) { id === 'customize' ? onShowCustomize() : onNavigate(id) }
  return (
    <div className="messa-dashboard">
      <div className="md-shell">
        <aside className="md-sidebar"><a className="md-wordmark" href="/">Messa<span>.</span></a><nav aria-label="Menú del panel">{SIDE_NAV.map(({ id, label, Icon }) => <button type="button" key={id} onClick={() => go(id)} className={current === id ? 'is-active' : ''} aria-current={current === id ? 'page' : undefined}><Icon size={19} /><span>{label}</span></button>)}</nav><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="md-help"><HelpCircle size={17} /><span>¿Necesitas ayuda?</span></a></aside>
        <div className="md-workspace">
          <header className="md-toolbar"><div><span className="md-mobile-wordmark">Messa<span>.</span></span><h1>{TITLES[activeTab] || 'Panel de control'}</h1></div><button type="button" className="md-user" onClick={() => onNavigate('account')} aria-label="Abrir mi cuenta"><RestaurantAvatar restaurant={restaurant} /><span>{restaurant?.name || 'Mi restaurante'}</span><ChevronRight size={15} /></button></header>
          <main className="md-main" id="dashboard-content">
            {(activeTab === 'dishes' || activeTab === 'categories') && <nav className="md-segments" aria-label="Gestionar carta"><button type="button" onClick={() => onNavigate('dishes')} aria-pressed={activeTab === 'dishes'}>Platos</button><button type="button" onClick={() => onNavigate('categories')} aria-pressed={activeTab === 'categories'}>Categorías</button></nav>}
            {children}
          </main>
          <footer className="md-footer"><span>Messa · Tu restaurante, bajo control.</span><a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer"><HelpCircle size={15} />¿Necesitas ayuda?</a></footer>
        </div>
      </div>
      <nav className="md-bottom-nav" aria-label="Navegación del panel">{MOBILE_NAV.map(({ id, label, Icon }) => <button type="button" key={id} onClick={() => onNavigate(id)} className={current === id ? 'is-active' : ''} aria-current={current === id ? 'page' : undefined}><Icon size={21} /><span>{label}</span></button>)}</nav>
    </div>
  )
}
