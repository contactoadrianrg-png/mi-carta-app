import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { supabase } from '../lib/supabase'
import RestaurantWelcome from '../components/menu/RestaurantWelcome'
import './WelcomePage.css'

export default function WelcomePage() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setStatus('loading')
    supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setStatus('error')
        else if (!data) setStatus('missing')
        else { setRestaurant(data); setStatus(data.active === false ? 'paused' : 'ready') }
      }).catch(() => { if (alive) setStatus('error') })
    return () => { alive = false }
  }, [slug, attempt])

  if (status === 'loading') return <main className="restaurant-entry-state" aria-busy="true"><span className="restaurant-entry-spinner" /><p>Cargando restaurante…</p></main>
  if (status !== 'ready') return <main className="restaurant-entry-state"><UtensilsCrossed size={42} /><h1>{status === 'error' ? 'No se ha podido cargar' : status === 'paused' ? 'Restaurante no disponible' : 'Restaurante no encontrado'}</h1><p>{status === 'error' ? 'Comprueba tu conexión y vuelve a intentarlo.' : status === 'paused' ? 'Este restaurante no está disponible en este momento.' : 'Comprueba que el enlace sea correcto.'}</p>{status === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)}>Reintentar</button>}</main>
  return <RestaurantWelcome key={restaurant.id || slug} restaurant={restaurant} />
}
