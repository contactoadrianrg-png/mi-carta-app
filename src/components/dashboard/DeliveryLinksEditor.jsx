import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { DELIVERY_PLATFORMS, deliveryUrl } from '../../lib/deliveryLinks'

export default function DeliveryLinksEditor({ restaurant, onUpdate }) {
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setValues(Object.fromEntries(DELIVERY_PLATFORMS.map(({ key }) => [key, restaurant[key] || ''])))
  }, [restaurant])

  async function save(event) {
    event.preventDefault()
    const updates = {}
    for (const { key, label } of DELIVERY_PLATFORMS) {
      const value = (values[key] || '').trim()
      const url = deliveryUrl(value)
      if (value && !url) {
        toast.error(`Introduce un enlace válido de ${label} que empiece por https://`)
        return
      }
      updates[key] = url
    }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('restaurants').update(updates).eq('id', restaurant.id).select().single()
      if (error) throw error
      onUpdate(data)
      toast.success('Enlaces de delivery actualizados')
    } catch (error) {
      toast.error(error.message || 'No se han podido guardar los enlaces')
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={save}>
    <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: '8px 0 16px' }}>Pega el enlace de tu restaurante en cada plataforma. Los botones aparecerán en la pantalla de entrada. Deja un campo vacío para ocultarlo.</p>
    {DELIVERY_PLATFORMS.map(({ key, label, placeholder }) => <label key={key} htmlFor={key} style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 14 }}>
      {label}
      <input id={key} type="url" inputMode="url" autoComplete="off" placeholder={placeholder} value={values[key] || ''} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} style={{ display: 'block', width: '100%', minHeight: 44, marginTop: 7, border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 12px', fontSize: 16, fontWeight: 400 }} />
    </label>)}
    <button type="submit" disabled={saving} style={{ minHeight: 44, background: '#EF4444', color: '#FFF', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, opacity: saving ? 0.55 : 1 }}>{saving ? 'Guardando…' : 'Guardar enlaces'}</button>
  </form>
}
