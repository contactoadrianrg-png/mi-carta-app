import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, Check, ChevronLeft, Heart, Menu, QrCode, RefreshCw, Smartphone, Wifi, BatteryFull, Signal } from 'lucide-react'
import './LandingPage.css'

const EXAMPLE = '/carta/comeycalla-mp3s28ri'

function MenuPhone({ detail = false }) {
  return (
    <div className={`messa-device ${detail ? 'messa-device-front' : 'messa-device-back'}`}>
      <div className="messa-device-screen">
        <div className="messa-status"><span>9:41</span><span className="messa-island" /><span className="messa-status-icons"><Signal /><Wifi /><BatteryFull /></span></div>
        {detail ? (
          <>
            <div className="messa-detail-photo"><span className="messa-photo-control"><ChevronLeft /></span><span className="messa-photo-control"><Heart /></span></div>
            <div className="messa-detail-copy"><span className="messa-phone-kicker">DE NUESTRA COCINA</span><h3>Pollo al curry</h3><p>Cocinado a fuego lento, con especias y un toque de cilantro fresco.</p><div className="messa-ingredients"><span>Hecho en casa</span><span>Sin gluten</span></div><div className="messa-detail-rule" /><p className="messa-detail-note">Los pequeños detalles.<br />El sabor de siempre.</p></div>
          </>
        ) : (
          <>
            <div className="messa-menu-top"><Menu size={15} /><span>la mesa.</span><Heart size={15} /></div>
            <div className="messa-menu-title"><span className="messa-phone-kicker">BUEN PROVECHO</span><h3>Nuestra carta</h3><p>Para compartir. Para disfrutar.</p></div>
            <div className="messa-menu-tabs"><span>Todos</span><span>Entrantes</span><span>Principales</span></div>
            <div className="messa-menu-cards"><div className="messa-dish-photo"><span>El favorito de la casa</span></div><div className="messa-dish-name"><h4>Pollo al curry</h4><Heart size={13} /></div><p>Especias, calma y mucho sabor.</p><div className="messa-small-dish"><div className="messa-small-photo" /><div><h4>Curry de la casa</h4><p>Un clásico para volver.</p></div></div></div>
          </>
        )}
        <div className="messa-phone-footer">Carta de ejemplo · Messa</div><span className="messa-home-indicator" />
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="messa-landing">
      <header className="messa-header">
        <Link to="/" className="messa-wordmark" aria-label="Messa, inicio"><span className="messa-brand-symbol" aria-hidden="true"><img src="/logo.png" alt="" /></span>Messa<span className="messa-brand-dot">.</span></Link>
        <span className="messa-header-note">Buena comida. Una buena primera impresión.</span>
        <span className="messa-header-tag">CARTAS DIGITALES</span>
      </header>
      <main>
        <section className="messa-hero" aria-labelledby="messa-heading">
          <div className="messa-hero-copy">
            <p className="messa-eyebrow"><span />TU RESTAURANTE, BIEN PRESENTADO</p>
            <h1 id="messa-heading">La carta de tu restaurante,<br /><em>en el móvil.</em></h1>
            <p className="messa-hero-description">Que el primer vistazo abra el apetito. Tus platos, tus fotos y tus precios en una carta digital que invita a descubrir más.</p>
            <div className="messa-hero-actions"><a href={EXAMPLE} target="_blank" rel="noopener noreferrer" className="messa-button messa-button-primary">Ver carta de ejemplo <ArrowUpRight size={19} /></a><Link to="/register" className="messa-button messa-button-secondary">Crear mi carta <ArrowRight size={18} /></Link></div>
            <p className="messa-no-app"><Check size={15} />Tus clientes escanean. La carta se abre. Sin descargar apps.</p>
            <p className="messa-login">¿Ya formas parte de Messa? <Link to="/login">Entra a tu cuenta <ArrowUpRight size={13} /></Link></p>
          </div>
          <div className="messa-showcase" role="img" aria-label="Dos maquetas frontales de iPhone 17 Pro Max con una carta digital de restaurante y el detalle de un plato">
            <div className="messa-orbit messa-orbit-one" /><div className="messa-orbit messa-orbit-two" />
            <span className="messa-showcase-label">ASÍ DE BIEN PUEDE VERSE TU CARTA</span>
            <div className="messa-phones" aria-hidden="true"><MenuPhone /><MenuPhone detail /></div>
            <div className="messa-qr-note"><span><QrCode size={23} /></span><div>De tu mesa a su móvil.<small>Un QR. Toda tu carta.</small></div></div>
            <span className="messa-demo-caption">Diseño ilustrativo · Descubre una carta real en la demo</span>
          </div>
        </section>
        <section className="messa-benefits" aria-label="Tu carta con Messa">
          <div><span className="messa-benefit-icon"><QrCode /></span><p><strong>Escanea y descubre</strong><span>Tu carta, a un QR de distancia.</span></p></div>
          <div><span className="messa-benefit-icon"><RefreshCw /></span><p><strong>Siempre al día</strong><span>Cambia tus platos y precios cuando quieras.</span></p></div>
          <div><span className="messa-benefit-icon"><Smartphone /></span><p><strong>Hecha para el móvil</strong><span>Una experiencia que entra por los ojos.</span></p></div>
        </section>
      </main>
      <footer className="messa-landing-footer"><span>Messa. El buen gusto empieza en la carta.</span><span>Creada para restaurantes.</span></footer>
    </div>
  )
}
