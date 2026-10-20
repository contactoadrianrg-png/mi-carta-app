import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'

function Banner({ slide, index, active }) {
  const [failed, setFailed] = useState(false)
  return <li className={`messa-banner-slide ${active ? 'is-active' : ''}`} aria-hidden={!active} aria-label={`Imagen ${index + 1}`}>
    {failed ? <div className="messa-banner-error">{slide.title || 'No se ha podido cargar esta imagen'}</div> : <img src={slide.image_url} alt={slide.title || `Promoción del restaurante ${index + 1}`} loading={index < 2 || active ? 'eager' : 'lazy'} draggable={false} onError={() => setFailed(true)} />}
  </li>
}

export default function MenuHighlights({ slides = [] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [announcement, setAnnouncement] = useState('')
  const pointer = useRef(null)
  const count = slides.length
  const active = count ? index % count : 0

  useEffect(() => {
    if (count < 2) return
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const onMotion = () => setReducedMotion(!!media?.matches)
    const onVisibility = () => setHidden(document.hidden)
    onMotion()
    onVisibility()
    media?.addEventListener?.('change', onMotion)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      media?.removeEventListener?.('change', onMotion)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [count])

  useEffect(() => {
    if (count < 2 || paused || hovered || focused || interacting || hidden || reducedMotion) return
    const timer = setTimeout(() => setIndex(current => (current + 1) % count), 5000)
    return () => clearTimeout(timer)
  }, [active, count, paused, hovered, focused, interacting, hidden, reducedMotion])

  function move(direction) {
    const next = (active + direction + count) % count
    setIndex(next)
    setAnnouncement(`Imagen ${next + 1} de ${count}`)
  }
  function finishSwipe(event) {
    const start = pointer.current
    pointer.current = null
    setInteracting(false)
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) move(dx < 0 ? 1 : -1)
  }
  if (!count) return null
  return <section className="messa-highlights messa-banner-carousel" aria-label="Destacado: imágenes, ofertas y novedades del restaurante" aria-roledescription="presentación"
    onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true) }} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <ul className="messa-highlight-rail messa-banner-loop" aria-live="off"
      onPointerDown={event => {
        if (count < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return
        pointer.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
        setInteracting(true)
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }} onPointerUp={finishSwipe} onPointerCancel={() => { pointer.current = null; setInteracting(false) }}>
      {slides.map((slide, position) => <Banner key={`${slide.id}-${slide.image_url}`} slide={slide} index={position} active={position === active} />)}
    </ul>
    {count > 1 && <div className="messa-banner-navigation"><span aria-label={`Imagen ${active + 1} de ${count}`}>{active + 1} / {count}</span><div className="messa-highlight-controls">
      {!reducedMotion && <button type="button" aria-label={paused ? 'Reanudar presentación' : 'Pausar presentación'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>}
      <button type="button" aria-label="Ver imágenes anteriores" onClick={() => move(-1)}><ArrowLeft size={17} /></button><button type="button" aria-label="Ver más imágenes" onClick={() => move(1)}><ArrowRight size={17} /></button>
    </div></div>}
    <p className="sr-only" role="status">{announcement}</p>
  </section>
}
