import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, UtensilsCrossed } from 'lucide-react'
import { getTheme } from '../../lib/themes'
import { accentOnWhite } from '../../lib/menuContrast'

function reservationLink(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null }
  catch { return null }
}

export default function RestaurantWelcome({ restaurant }) {
  const [failedImages, setFailedImages] = useState([])
  const [failedLogo, setFailedLogo] = useState(null)
  const theme = getTheme(restaurant.color_theme)
  const image = [restaurant.welcome_image_url, restaurant.banner_url].find(url => url && !failedImages.includes(url))
  const reservation = reservationLink(restaurant.reservation_url)
  return <main className="restaurant-entry" style={{ '--entry-accent': accentOnWhite(theme.primary) }}>
    <article className="restaurant-entry-card">
      <section className={`restaurant-entry-hero ${!image ? 'without-image' : ''}`} aria-label={restaurant.name}>
        {image && <img className="restaurant-entry-photo" src={image} alt="" onError={() => setFailedImages(previous => [...previous, image])} />}
        <div className="restaurant-entry-shade" />
        <span className="restaurant-entry-tag"><span />Bienvenidos</span>
        <div className="restaurant-entry-identity">
          {restaurant.logo_url && restaurant.logo_url !== failedLogo ? <img className="restaurant-entry-logo" src={restaurant.logo_url} alt={`Logo de ${restaurant.name}`} onError={() => setFailedLogo(restaurant.logo_url)} /> : <span className="restaurant-entry-initial" aria-hidden="true">{(restaurant.name || '?')[0].toUpperCase()}</span>}
          <h1>{restaurant.name}</h1>
          {restaurant.description && <p>{restaurant.description}</p>}
        </div>
      </section>
      <section className="restaurant-entry-content" aria-labelledby="restaurant-entry-heading">
        <div className="restaurant-entry-intro"><h2 id="restaurant-entry-heading">Tu mesa te espera.</h2><p>Descubre nuestra carta o reserva tu próxima visita.</p></div>
        <nav className="restaurant-entry-actions" aria-label="Carta y reservas">
          <Link to={`/carta/${restaurant.slug}/menu`} className="restaurant-entry-action primary"><span className="restaurant-entry-action-icon"><UtensilsCrossed size={25} /></span><span><strong>Ver la carta</strong><small>Platos, sabores y favoritos</small></span><ArrowUpRight size={22} /></Link>
          {reservation ? <a href={reservation} target="_blank" rel="noopener noreferrer" className="restaurant-entry-action secondary"><span className="restaurant-entry-action-icon"><CalendarDays size={25} /></span><span><strong>Reservar mesa</strong><small>Elige tu próximo momento</small></span><ArrowUpRight size={22} /></a> : <div className="restaurant-entry-action unavailable" aria-disabled="true"><span className="restaurant-entry-action-icon"><CalendarDays size={25} /></span><span><strong>Reservar mesa</strong><small>Reservas online no disponibles</small></span></div>}
        </nav>
        {(restaurant.plan || 'free') === 'free' && <footer className="restaurant-entry-footer"><span /> <span>Messa</span> <span /></footer>}
      </section>
    </article>
  </main>
}
