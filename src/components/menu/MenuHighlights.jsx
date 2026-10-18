import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

function Banner({ slide, index }) {
  const [failed, setFailed] = useState(false)
  return <li className="messa-banner-slide">{failed ? <div className="messa-banner-error">{slide.title || 'No se ha podido cargar esta imagen'}</div> : <img src={slide.image_url} alt={slide.title || `Promoción del restaurante ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} onError={() => setFailed(true)} />}</li>
}
export default function MenuHighlights({ slides = [] }) {
  const rail = useRef(null)
  if (!slides.length) return null
  function move(direction) {
    const element = rail.current
    if (!element) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    element.scrollBy({ left: direction * element.clientWidth, behavior: reduced ? 'instant' : 'smooth' })
  }
  return <section className="messa-highlights messa-banner-carousel" aria-label="Imágenes, ofertas y novedades del restaurante"><ul className="messa-highlight-rail" ref={rail}>{slides.map((slide, index) => <Banner key={`${slide.id}-${slide.image_url}`} slide={slide} index={index} />)}</ul>{slides.length > 1 && <div className="messa-banner-navigation"><span>Desliza para descubrir más</span><div className="messa-highlight-controls"><button type="button" aria-label="Ver imágenes anteriores" onClick={() => move(-1)}><ArrowLeft size={17} /></button><button type="button" aria-label="Ver más imágenes" onClick={() => move(1)}><ArrowRight size={17} /></button></div></div>}</section>
}
