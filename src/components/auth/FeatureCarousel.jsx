import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'

const features = [
  { image: '/onboarding/carta-oscura.webp', title: 'Tu carta entra por los ojos', detail: 'Fotos que dan ganas de pedir.', alt: 'Vista ilustrativa de una carta digital con fotos de platos en un móvil', style: 'food' },
  { image: '/onboarding/promociones-oscuras.webp', title: 'Tus promociones, a la vista', detail: 'Destaca ofertas y menús del día.', alt: 'Vista ilustrativa de promociones y menú del día en un móvil', style: 'promotions' },
  { image: '/onboarding/panel-oscuro.webp', title: 'Actualiza desde tu móvil', detail: 'Cambia platos, fotos y precios al momento.', alt: 'Vista ilustrativa de la edición de un plato desde el móvil', style: 'panel' },
]

export default function FeatureCarousel() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const motion = () => setReduced(!!media?.matches)
    const visibility = () => setHidden(document.hidden)
    motion(); visibility()
    media?.addEventListener?.('change', motion)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      media?.removeEventListener?.('change', motion)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  useEffect(() => {
    if (paused || hovered || focused || hidden || reduced) return
    const timer = setTimeout(() => setActive(value => (value + 1) % features.length), 5000)
    return () => clearTimeout(timer)
  }, [active, paused, hovered, focused, hidden, reduced])

  return <section className="messa-feature-carousel" aria-label="Descubre MESSA" aria-roledescription="carrusel"
    onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true) }} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="messa-feature-stage" aria-live="off">
      {features.map((feature, index) => <figure key={feature.image} className={`messa-feature-slide ${feature.style} ${index === active ? 'is-active' : ''}`} aria-hidden={index !== active}>
        <div className="messa-feature-image"><img src={feature.image} alt={feature.alt} loading={index === 0 ? 'eager' : 'lazy'} width={1000} height={600} /></div>
        <figcaption><h2>{feature.title}</h2><p>{feature.detail}</p></figcaption>
      </figure>)}
    </div>
    <div className="messa-feature-navigation">
      <div className="messa-feature-dots" aria-label="Elegir imagen">
        {features.map((feature, index) => <button key={feature.image} type="button" aria-label={`Ver: ${feature.title}`} aria-current={index === active ? 'true' : undefined} onClick={() => { setActive(index); setPaused(true) }}><span /></button>)}
      </div>
      {!reduced && <button className="messa-feature-pause" type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Reanudar animación' : 'Pausar animación'} aria-pressed={paused}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}</button>}
    </div>
  </section>
}
