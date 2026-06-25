import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { UtensilsCrossed } from 'lucide-react'
import { getTheme } from '../lib/themes'

export default function WelcomePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setRestaurant(data)
        setLoading(false)
      })
  }, [slug])

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
      <UtensilsCrossed size={52} className="text-gray-300 mb-4" />
      <h1 className="text-xl font-bold text-gray-900">Carta no encontrada</h1>
      <p className="text-gray-400 text-sm mt-1">No existe ningún restaurante con esta URL.</p>
    </div>
  )

  if (restaurant.active === false) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
      <UtensilsCrossed size={52} className="text-gray-300 mb-4" />
      <h1 className="text-xl font-bold text-gray-900">Carta no disponible</h1>
      <p className="text-gray-400 text-sm mt-1">Este restaurante no está disponible en este momento.</p>
    </div>
  )

  const plan    = restaurant.plan || 'free'
  const isFree  = plan === 'free'
  const theme   = getTheme(restaurant.color_theme)
  const initial = (restaurant.name || '?')[0].toUpperCase()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg }}>

      {/* ── HERO 55vh ──────────────────────────────────── */}
      <div style={{
        minHeight: '55vh', position: 'relative', flexShrink: 0,
        backgroundColor: theme.primary,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        overflow: 'hidden',
      }}>
        {/* Banner como fondo (siempre, sin restricción de plan) */}
        {restaurant.banner_url && (
          <img
            src={restaurant.banner_url}
            alt={restaurant.name}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              zIndex: 0,
            }}
            draggable={false}
          />
        )}

        {/* Overlay degradado de abajo hacia arriba */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: restaurant.banner_url
            ? 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.20) 55%, transparent 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)',
        }} />

        {/* Contenido sobre el hero — nombre siempre visible */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '0 24px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
        }}>
          {/* Logo circular si existe */}
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt="Logo"
              style={{
                width: 60, height: 60, borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.85)',
                marginBottom: 14, display: 'block',
                boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
              }}
            />
          ) : (
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              border: '2px solid rgba(255,255,255,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#FFF' }}>{initial}</span>
            </div>
          )}

          {/* Nombre — siempre visible */}
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 800,
            color: '#FFF', lineHeight: 1.2,
            textShadow: '0 1px 6px rgba(0,0,0,0.3)',
          }}>
            {restaurant.name}
          </h1>

          {/* Descripción */}
          {restaurant.description && (
            <p style={{
              margin: '8px 0 0', fontSize: 14,
              color: 'rgba(255,255,255,0.82)', lineHeight: 1.55,
              maxWidth: 280,
            }}>
              {restaurant.description}
            </p>
          )}
        </div>
      </div>

      {/* ── PARTE INFERIOR 45% ─────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: '28px 24px 32px',
      }}>

        {/* Botones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Carta */}
          <button
            onClick={() => navigate(`/carta/${slug}/menu`)}
            style={{
              height: 56, borderRadius: 99, fontSize: 18, fontWeight: 700,
              background: theme.primary, color: '#FFF',
              border: 'none', cursor: 'pointer', width: '100%',
              boxShadow: `0 4px 16px ${theme.primary}55`,
              fontFamily: 'inherit',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Carta
          </button>

          {/* Reservas */}
          {restaurant.reservation_url ? (
            <a
              href={restaurant.reservation_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: 56, borderRadius: 99, fontSize: 18, fontWeight: 700,
                border: `2px solid ${theme.primary}`, color: theme.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none', backgroundColor: 'transparent',
                transition: 'transform 0.15s',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Reservas
            </a>
          ) : (
            <div style={{
              height: 56, borderRadius: 99, fontSize: 15, fontWeight: 600,
              border: '2px solid #E5E7EB', color: '#D1D5DB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'not-allowed', userSelect: 'none',
            }}>
              Reservas no disponibles
            </div>
          )}
        </div>

        {/* Footer Messa — solo plan free */}
        {isFree && (
          <p style={{
            marginTop: 'auto', paddingTop: 28,
            textAlign: 'center', fontSize: 12, color: '#9CA3AF',
          }}>
            Carta digital por{' '}
            <span style={{ fontWeight: 600, color: '#6B7280' }}>Messa</span>
          </p>
        )}
      </div>
    </div>
  )
}
