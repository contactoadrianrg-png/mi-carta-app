import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, UtensilsCrossed } from 'lucide-react'
import { getTheme } from '../../lib/themes'
import { accentOnWhite } from '../../lib/menuContrast'
import { getDeliveryLinks } from '../../lib/deliveryLinks'

function reservationLink(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null }
  catch { return null }
}

export default function RestaurantWelcome({ restaurant }) {
  const [failedLogo, setFailedLogo] = useState(null)
  const theme = getTheme(restaurant.color_theme)
  const reservation = reservationLink(restaurant.reservation_url)
  const deliveryLinks = getDeliveryLinks(restaurant)
  return <main className="restaurant-entry" style={{ '--entry-accent': accentOnWhite(theme.primary) }}>
    <article className="restaurant-entry-card">
      <header className="restaurant-entry-hero">
        <div className="restaurant-entry-identity">
          {restaurant.logo_url && restaurant.logo_url !== failedLogo && <img className="restaurant-entry-logo" src={restaurant.logo_url} alt={`Logo de ${restaurant.name}`} onError={() => setFailedLogo(restaurant.logo_url)} />}
          <h1>{restaurant.name}</h1>
        </div>
      </header>
      <section className="restaurant-entry-content" aria-label="Acceso al restaurante">
        <nav className="restaurant-entry-actions" aria-label="Carta y reservas">
          <Link to={`/carta/${restaurant.slug}/menu`} className="restaurant-entry-action primary"><UtensilsCrossed size={22} aria-hidden="true" /><strong>Ver la carta</strong><ArrowRight size={21} aria-hidden="true" /></Link>
          {reservation ? <a href={reservation} target="_blank" rel="noopener noreferrer" className="restaurant-entry-action secondary"><CalendarDays size={22} aria-hidden="true" /><strong>Reservar mesa</strong><ArrowRight size={21} aria-hidden="true" /></a> : <div className="restaurant-entry-action unavailable" aria-disabled="true"><CalendarDays size={22} aria-hidden="true" /><strong>Reservar mesa</strong><span className="restaurant-entry-unavailable-label">No disponible</span></div>}
        </nav>
        {deliveryLinks.length > 0 && <section className="restaurant-entry-delivery" aria-labelledby="restaurant-entry-delivery-title">
          <h2 id="restaurant-entry-delivery-title">Pide a domicilio</h2>
          <nav className="restaurant-entry-platforms" aria-label="Plataformas de delivery">
            {deliveryLinks.map(({ key, label, href }) => <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Pedir en ${label} (se abre en otra pestaña)`}>{label}</a>)}
          </nav>
        </section>}
        {(restaurant.plan || 'free') === 'free' && <footer className="restaurant-entry-footer"><span /> <span>Messa</span> <span /></footer>}
      </section>
    </article>
  </main>
}
