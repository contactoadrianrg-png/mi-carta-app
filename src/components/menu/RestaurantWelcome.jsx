import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, UtensilsCrossed } from 'lucide-react'
import { getTheme } from '../../lib/themes'
import { accentOnWhite } from '../../lib/menuContrast'
import { getDeliveryLinks } from '../../lib/deliveryLinks'

function reservationLink(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null }
  catch { return null }
}

export default function RestaurantWelcome({ restaurant }) {
  const [failedImages, setFailedImages] = useState([])
  const theme = getTheme(restaurant.color_theme)
  const coverImage = [restaurant.welcome_image_url, restaurant.banner_url].find(url => url && !failedImages.includes(url))
  const reservation = reservationLink(restaurant.reservation_url)
  const deliveryLinks = getDeliveryLinks(restaurant)

  return <main className="restaurant-entry" style={{ '--entry-accent': accentOnWhite(theme.primary) }}>
    <article className="restaurant-entry-card">
      <section className={`restaurant-entry-hero ${!coverImage ? 'without-image' : ''}`} aria-label={restaurant.name}>
        {coverImage && <img className="restaurant-entry-photo" src={coverImage} alt="" onError={() => setFailedImages(previous => [...previous, coverImage])} />}
        <div className="restaurant-entry-shade" />
        <div className="restaurant-entry-identity">
          <h1>{restaurant.name}</h1>
          {restaurant.description && <p>{restaurant.description}</p>}
        </div>
      </section>
      <section className="restaurant-entry-content" aria-label="Acceso al restaurante">
        <nav className="restaurant-entry-actions" aria-label="Carta y reservas">
          <Link to={`/carta/${restaurant.slug}/menu`} className="restaurant-entry-action primary"><span className="restaurant-entry-action-icon"><UtensilsCrossed size={25} /></span><span><strong>Ver la carta</strong><small>Platos, sabores y favoritos</small></span><ArrowUpRight size={22} /></Link>
          {reservation ? <a href={reservation} target="_blank" rel="noopener noreferrer" className="restaurant-entry-action secondary"><span className="restaurant-entry-action-icon"><CalendarDays size={25} /></span><span><strong>Reservar mesa</strong><small>Elige tu próximo momento</small></span><ArrowUpRight size={22} /></a> : <div className="restaurant-entry-action unavailable" aria-disabled="true"><span className="restaurant-entry-action-icon"><CalendarDays size={25} /></span><span><strong>Reservar mesa</strong><small>Reservas online no disponibles</small></span></div>}
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
