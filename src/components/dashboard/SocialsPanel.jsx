import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'
import { SOCIALS } from '../../lib/socials'

const ORANGE = '#FF6B35'

export default function SocialsPanel({ restaurant, onUpdate }) {
  const [values, setValues] = useState({})
  const [toggled, setToggled] = useState({})
  const [saving, setSaving] = useState(false)

  const plan = restaurant?.plan || 'free'
  const isFree = plan === 'free'

  useEffect(() => {
    if (restaurant) {
      const initValues = {}
      const initToggled = {}
      SOCIALS.forEach(({ key }) => {
        const val = restaurant[`social_${key}`] || ''
        initValues[key] = val
        initToggled[key] = !!val
      })
      setValues(initValues)
      setToggled(initToggled)
    }
  }, [restaurant])

  const handleSave = async () => {
    if (!restaurant) return
    setSaving(true)
    try {
      const updates = {}
      SOCIALS.forEach(({ key }) => {
        const val = toggled[key] ? (values[key] || '').trim() : ''
        updates[`social_${key}`] = val || null
      })
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurant.id)
        .select()
        .single()
      if (error) throw error
      onUpdate(data)
      toast.success('Redes sociales actualizadas')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #E5E7EB', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: '#F9FAFB', fontFamily: 'inherit',
  }

  return (
    <div style={{ background: '#F5F5F5', minHeight: 'calc(100vh - 56px)', padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 4, marginTop: 4 }}>
        Redes sociales
      </h2>
      <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 16px' }}>
        Aparecen en la carta pública de tu restaurante
      </p>

      {isFree && (
        <div style={{
          background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12,
          padding: 16, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Lock size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#92400E' }}>
              Función disponible en Plan Pro
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#B45309' }}>
              Mejora tu plan para añadir redes sociales y contacto a tu carta pública.
            </p>
          </div>
        </div>
      )}

      {!restaurant && (
        <div style={{
          background: '#FFF', borderRadius: 12, padding: 24, textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: '#9CA3AF',
        }}>
          <p style={{ margin: 0, fontSize: 14 }}>Primero crea tu restaurante para gestionar las redes sociales.</p>
        </div>
      )}

      {restaurant && (
        <>
          <div style={{ background: '#FFF', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 16 }}>
            {SOCIALS.map(({ key, label, placeholder, path }, i) => (
              <div key={key} style={{ borderBottom: i < SOCIALS.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: '#F9FAFB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg viewBox="0 0 24 24" width={18} height={18} fill={isFree ? '#D1D5DB' : '#6B7280'}>
                      <path d={path} />
                    </svg>
                  </div>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: isFree ? '#9CA3AF' : '#1A1A1A' }}>
                    {label}
                  </span>
                  <button
                    disabled={isFree}
                    onClick={() => setToggled(t => ({ ...t, [key]: !t[key] }))}
                    style={{
                      position: 'relative', width: 40, height: 22, borderRadius: 99,
                      background: !isFree && toggled[key] ? ORANGE : '#E5E7EB',
                      border: 'none', cursor: isFree ? 'not-allowed' : 'pointer', flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 4,
                      left: !isFree && toggled[key] ? 20 : 4,
                      width: 14, height: 14, borderRadius: '50%', background: '#FFF',
                      transition: 'left 0.15s',
                    }} />
                  </button>
                </div>
                {!isFree && toggled[key] && (
                  <div style={{ padding: '0 16px 14px 64px' }}>
                    <input
                      type="text"
                      value={values[key] || ''}
                      onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {!isFree && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', background: ORANGE, color: '#FFF',
                border: 'none', borderRadius: 12, padding: 14,
                fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
              }}
            >
              {saving ? 'Guardando...' : 'Guardar redes sociales'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
