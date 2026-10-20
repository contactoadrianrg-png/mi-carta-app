import { useState } from 'react'
import { ArrowUpRight, ChevronRight, UtensilsCrossed, LayoutGrid, Brush, Tags, Share2, QrCode, Lock } from 'lucide-react'

const PLAN_LABELS = { free: 'Plan Gratuito', pro: 'Plan Pro' }
export default function DashboardHome({ restaurant, dishCount, categoryCount, plan, onNavigate, onShowQR, onShowCustomize, menuUrl }) {
  const [failedBanner, setFailedBanner] = useState(null)
  if (!restaurant) return <section className="md-empty"><span className="md-action-icon"><UtensilsCrossed size={28} /></span><h2>Tu restaurante empieza aquí</h2><p>Añade su nombre y crea una carta con tu propia identidad.</p><button type="button" className="md-primary" onClick={() => onNavigate('restaurant')}>Crear mi restaurante <ArrowUpRight size={17} /></button></section>
  const banner = restaurant.banner_url && restaurant.banner_url !== failedBanner ? restaurant.banner_url : null
  const actions = [
    { id: 'dishes', title: 'Platos y categorías', detail: 'Edita tu carta', Icon: UtensilsCrossed, onClick: () => onNavigate('dishes') },
    { id: 'daily-menu', title: 'Menú del día', detail: 'Platos a elegir y precio', Icon: UtensilsCrossed, onClick: () => onNavigate('daily-menu') },
    { id: 'customize', title: 'Nombre y logo', detail: 'Tu identidad', Icon: Brush, onClick: onShowCustomize },
    { id: 'slides', title: 'Destacado', detail: 'Imágenes y promociones', Icon: Tags, onClick: () => onNavigate('slides'), featured: true },
    { id: 'reservations', title: 'Reservas y redes', detail: 'Conecta con tus clientes', Icon: Share2, onClick: () => onNavigate('reservations') },
    { id: 'qr', title: 'Mi QR', detail: 'Mesas y enlace para redes', Icon: QrCode, onClick: onShowQR },
    { id: 'public', title: 'Ver mi carta', detail: 'Vista del cliente', Icon: ArrowUpRight, href: menuUrl },
  ]
  return <>
    <section className="md-welcome" aria-label="Tu restaurante">
      {banner && <img className="md-welcome-photo" src={banner} alt="" onError={() => setFailedBanner(banner)} />}
      <div className="md-welcome-overlay" />
      <div className="md-welcome-copy"><p>Hola,</p><h2>{restaurant.name}</h2><div className="md-badges"><span className={restaurant.active === false ? 'is-paused' : ''}><i />{restaurant.active === false ? 'Carta pausada' : 'Carta publicada'}</span><span>{PLAN_LABELS[plan] || PLAN_LABELS.free} · activo</span></div></div>
      <a className="md-primary" href={menuUrl} target="_blank" rel="noopener noreferrer">Ver mi carta <ArrowUpRight size={17} /></a>
    </section>
    <section className="md-metrics" aria-label="Resumen de tu carta"><button type="button" onClick={() => onNavigate('dishes')}><UtensilsCrossed size={26} /><div><strong>{dishCount ?? '—'}</strong><span>Platos activos</span></div><ChevronRight size={16} /></button><button type="button" onClick={() => onNavigate('categories')}><LayoutGrid size={26} /><div><strong>{categoryCount ?? '—'}</strong><span>Categorías</span></div><ChevronRight size={16} /></button></section>
    <section className="md-actions-section" aria-labelledby="md-actions-heading"><div className="md-section-heading"><h2 id="md-actions-heading">Gestiona tu restaurante</h2><button type="button" onClick={() => onNavigate('stats')}>Ver estadísticas <ArrowUpRight size={14} /></button></div><div className="md-actions-grid">{actions.map(({ id, title, detail, Icon, onClick, href, featured }) => { const Tag = href ? 'a' : 'button'; return <Tag key={id} type={href ? undefined : 'button'} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} onClick={onClick} className={`md-action-card ${featured ? 'md-action-featured' : ''}`}><span className="md-action-icon"><Icon size={23} /></span><ChevronRight className="md-action-arrow" size={17} /><strong>{title}</strong><span className="md-action-detail">{detail}</span></Tag> })}</div></section>
    {plan === 'free' && <div className="md-plan-note"><span><Lock size={17} />Más posibilidades para tu carta con el Plan Pro.</span><a href="https://wa.me/34674460692?text=Hola%2C%20quiero%20mejorar%20mi%20plan%20de%20Messa" target="_blank" rel="noopener noreferrer">Consultar planes <ArrowUpRight size={15} /></a></div>}
  </>
}
