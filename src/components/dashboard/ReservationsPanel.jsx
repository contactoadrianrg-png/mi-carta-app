import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

export default function ReservationsPanel({ restaurant, onUpdate }) {
  const [url, setUrl] = useState(restaurant.reservation_url || '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setUrl(restaurant.reservation_url || '') }, [restaurant.id, restaurant.reservation_url])
  async function save(event) {
    event.preventDefault()
    const value = url.trim()
    if (value) {
      try { if (!['http:', 'https:'].includes(new URL(value).protocol)) throw Error() }
      catch { toast.error('Añade un enlace completo que empiece por https://'); return }
    }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('restaurants').update({ reservation_url: value || null }).eq('id', restaurant.id).select().single()
      if (error) throw error
      onUpdate(data)
      toast.success('Enlace de reservas actualizado')
    } catch { toast.error('No se ha podido guardar el enlace. Inténtalo de nuevo.') }
    finally { setSaving(false) }
  }
  return <section className="md-reservations-card"><span className="md-action-icon"><CalendarDays size={22} /></span><h2>Reservas</h2><p>Conecta el botón de reservas de tu carta con WhatsApp o con tu página de reservas.</p><form onSubmit={save}><label htmlFor="md-reservation-url">Enlace de reservas</label><input id="md-reservation-url" type="url" placeholder="https://wa.me/..." value={url} disabled={saving} onChange={event => setUrl(event.target.value)} /><small>Déjalo vacío y guarda para quitar el enlace de reservas.</small><button type="submit" className="md-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar reservas'}</button></form></section>
}
