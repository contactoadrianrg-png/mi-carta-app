import { useState, useEffect, useRef } from 'react'
import { useScreenNavigation } from '../hooks/useScreenNavigation'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { restaurantProfileUpdates } from '../lib/restaurantProfile'
import RestaurantEditor from '../components/dashboard/RestaurantEditor'
import CategoryManager from '../components/dashboard/CategoryManager'
import DishManager from '../components/dashboard/DishManager'
import AccountPanel from '../components/dashboard/AccountPanel'
import SocialsPanel from '../components/dashboard/SocialsPanel'
import StatsPanel from '../components/dashboard/StatsPanel'
import toast from 'react-hot-toast'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import DashboardHome from '../components/dashboard/DashboardHome'
import MenuSlidesEditor from '../components/dashboard/MenuSlidesEditor'
import DailyMenuEditor from '../components/dashboard/DailyMenuEditor'
import ReservationsPanel from '../components/dashboard/ReservationsPanel'
import { IconBolt, IconExternalLink, IconX, IconCamera } from '@tabler/icons-react'

const DASHBOARD_SCREEN = { tab: 'home', dialog: null }
const DASHBOARD_TABS = ['home', 'restaurant', 'categories', 'dishes', 'daily-menu', 'slides', 'reservations', 'socials', 'stats', 'account']

const ORANGE       = '#E65100'
const ORANGE_LIGHT = '#FFF3E0'
const WA_UPGRADE   = `https://wa.me/34674460692?text=${encodeURIComponent('Hola, quiero mejorar mi plan de Messa al plan Pro')}`

const INPUT_STYLE = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #E5E7EB', borderRadius: 12,
  padding: '12px 14px', fontSize: 14, fontWeight: 600,
  fontFamily: 'inherit', color: '#1A1A1A',
  background: '#FFF', outline: 'none',
  transition: 'border-color 0.15s',
}

/* ── QR Modal ────────────────────────────────────────── */
function QRModal({ url, socialUrl, onClose }) {
  const [copied, setCopied] = useState(false)
  async function copySocialLink() {
    try {
      await navigator.clipboard.writeText(socialUrl)
      setCopied(true)
    } catch { toast.error('No se ha podido copiar. Puedes seleccionar el enlace y copiarlo.') }
  }
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&format=png`
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFF', borderRadius: '20px 20px 0 0',
          padding: '24px 24px 40px', width: '100%', maxWidth: 480, maxHeight: '90svh', overflowY: 'auto',
          textAlign: 'center', boxSizing: 'border-box',
        }}
        role="dialog" aria-modal="true" aria-label="Mi QR"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>QR para las mesas</p>
          <button type="button" aria-label="Cerrar QR" onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={18} color="#374151" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 18px' }}>Abre directamente los platos, sin pantalla de bienvenida.</p>
        <img src={qrSrc} alt="QR de mi carta" style={{ width: 210, height: 210, borderRadius: 12, display: 'block', margin: '0 auto' }} />
        <p style={{ margin: '14px 0 0', fontSize: 12, color: '#9CA3AF', wordBreak: 'break-all' }}>{url}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 20, padding: '13px 0', borderRadius: 12, background: ORANGE, color: '#FFF', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
          Abrir carta →
        </a>
        <section style={{ textAlign: 'left', borderTop: '1px solid #E5E7EB', marginTop: 24, paddingTop: 20 }} aria-label="Enlace para redes">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Enlace para la bio de tus redes</h2>
          <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: '8px 0 12px' }}>Muestra la bienvenida con «Ver la carta» y «Reservar mesa».</p>
          <input aria-label="Enlace para redes" value={socialUrl} readOnly onFocus={event => event.target.select()} style={{ width: '100%', minHeight: 44, padding: 10, border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}><button type="button" onClick={copySocialLink} style={{ minHeight: 44, padding: '10px 16px', background: ORANGE_LIGHT, color: ORANGE, border: 0, borderRadius: 10, fontWeight: 600 }} aria-live="polite">{copied ? 'Enlace copiado' : 'Copiar enlace para redes'}</button><a href={socialUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#4B5563', fontSize: 13, padding: '12px 0' }}>Ver bienvenida ↗</a></div>
        </section>
      </div>
    </div>
  )
}

/* ── Customize Modal ─────────────────────────────────── */
function CustomizeModal({ restaurant, user, onClose, onUpdate }) {
  const [name,        setName]        = useState(restaurant?.name        || '')
  const [description, setDescription] = useState(restaurant?.description || '')
  const [phone,       setPhone]       = useState(restaurant?.social_phone || '')
  const [address,     setAddress]     = useState(restaurant?.address     || '')

  const [logoFile,      setLogoFile]      = useState(null)
  const [logoPreview,   setLogoPreview]   = useState(restaurant?.logo_url   || null)
  const [bannerFile,    setBannerFile]    = useState(null)
  const [bannerPreview, setBannerPreview] = useState(restaurant?.banner_url || null)

  const [saving,      setSaving]      = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const logoRef   = useRef(null)
  const bannerRef = useRef(null)

  function pickFile(ref) { ref.current?.click() }

  function onLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('El logo no puede superar 2 MB'); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function onBannerChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('La portada no puede superar 5 MB'); return }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function uploadImg(file, prefix) {
    const ext  = file.name.split('.').pop().toLowerCase()
    const path = `${user.id}/${prefix}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('dish-images').upload(path, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from('dish-images').getPublicUrl(path).data.publicUrl
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setSaving(true)
    try {
      const updates = restaurantProfileUpdates({ name, description, phone, address })
      if (logoFile)   updates.logo_url   = await uploadImg(logoFile,   'logo')
      if (bannerFile) updates.banner_url = await uploadImg(bannerFile, 'banner')

      const { data, error } = await supabase
        .from('restaurants').update(updates)
        .eq('id', restaurant.id).select().single()
      if (error) throw error
      onUpdate(data)
      toast.success('¡Cambios guardados!')
      onClose()
    } catch (err) {
      toast.error('Error: ' + (err.message || 'Inténtalo de nuevo'))
    }
    setSaving(false)
  }

  const SectionLabel = ({ children }) => (
    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </p>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#FFF', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' }}
        role="dialog" aria-modal="true" aria-label="Personalizar mi restaurante"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#FFF', zIndex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>Personalizar mi restaurante</p>
          <button type="button" aria-label="Cerrar personalización" onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={18} color="#374151" />
          </button>
        </div>

        <div style={{ padding: '20px 20px 32px' }}>

          {/* ── Sección Logo */}
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Logo</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Preview circular */}
              <button
                onClick={() => pickFile(logoRef)}
                style={{
                  width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                  background: logoPreview ? 'transparent' : '#F3F4F6',
                  border: '2px dashed #E5E7EB', cursor: 'pointer',
                  overflow: 'hidden', position: 'relative', padding: 0,
                }}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <IconCamera size={24} color="#9CA3AF" />
                }
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: logoPreview ? 0.7 : 0 }}>
                  <IconCamera size={18} color="#FFF" />
                </div>
              </button>
              <div>
                <button
                  onClick={() => pickFile(logoRef)}
                  style={{ background: ORANGE_LIGHT, color: ORANGE, border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cambiar logo
                </button>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9CA3AF' }}>JPG, PNG o WebP · máx. 2 MB</p>
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onLogoChange} />
          </div>

          {/* ── Sección Portada */}
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Foto de portada</SectionLabel>
            <button
              onClick={() => pickFile(bannerRef)}
              style={{
                width: '100%', height: 110, borderRadius: 14,
                border: '2px dashed #E5E7EB', background: bannerPreview ? 'transparent' : '#F9FAFB',
                cursor: 'pointer', overflow: 'hidden', position: 'relative', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {bannerPreview
                ? <img src={bannerPreview} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <IconCamera size={26} color="#9CA3AF" />
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>Añadir foto de portada</span>
                  </div>
              }
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: bannerPreview ? 1 : 0,
              }}>
                <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconCamera size={15} color="#1A1A1A" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>Cambiar portada</span>
                </div>
              </div>
            </button>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9CA3AF' }}>JPG, PNG o WebP · máx. 5 MB</p>
            <input ref={bannerRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onBannerChange} />
          </div>

          {/* ── Sección Información básica */}
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Información básica</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Nombre del restaurante</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  placeholder="Nombre del restaurante"
                  style={{ ...INPUT_STYLE, borderColor: focusedField === 'name' ? ORANGE : '#E5E7EB' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                  Descripción <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({description.length}/120)</span>
                </label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value.slice(0, 120))}
                  onFocus={() => setFocusedField('desc')} onBlur={() => setFocusedField(null)}
                  placeholder="Una descripción breve de tu restaurante…"
                  rows={3}
                  style={{ ...INPUT_STYLE, resize: 'none', lineHeight: 1.5, borderColor: focusedField === 'desc' ? ORANGE : '#E5E7EB' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Teléfono</label>
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
                  placeholder="+34 600 000 000"
                  style={{ ...INPUT_STYLE, borderColor: focusedField === 'phone' ? ORANGE : '#E5E7EB' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Dirección</label>
                <input
                  type="text" value={address} onChange={e => setAddress(e.target.value)}
                  onFocus={() => setFocusedField('address')} onBlur={() => setFocusedField(null)}
                  placeholder="Calle, número, ciudad…"
                  style={{ ...INPUT_STYLE, borderColor: focusedField === 'address' ? ORANGE : '#E5E7EB' }}
                />
              </div>
            </div>
          </div>

          {/* ── Botón guardar */}
          <button
            onClick={handleSave} disabled={saving}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 99,
              background: saving ? '#D1D5DB' : ORANGE,
              color: '#FFF', fontSize: 16, fontWeight: 700,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth()
  const [restaurant,     setRestaurant]     = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [screen, openScreen, backScreen] = useScreenNavigation('dashboardScreen', DASHBOARD_SCREEN)
  const activeTab = DASHBOARD_TABS.includes(screen.tab) ? screen.tab : 'home'
  const setActiveTab = tab => openScreen({ tab, dialog: null })
  const [dishCount,      setDishCount]      = useState(null)
  const [categoryCount,  setCategoryCount]  = useState(null)
  const showQR = screen.dialog === 'qr'
  const showCustomize = screen.dialog === 'customize'
  const setShowQR = open => open ? openScreen({ dialog: 'qr' }) : backScreen({ dialog: null })
  const setShowCustomize = open => open ? openScreen({ dialog: 'customize' }) : backScreen({ dialog: null })
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!user) return
    let alive = true
    setLoading(true)
    setLoadError(false)
    Promise.resolve().then(() => supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle())
      .then(({ data, error }) => {
        if (!alive) return
        if (error) throw error
        setRestaurant(data)
      })
      .catch(() => { if (alive) setLoadError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [user?.id, retry])

  useEffect(() => {
    if (!restaurant || activeTab !== 'home') return
    let alive = true
    supabase.from('dishes').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).eq('available', true)
      .then(({ count, error }) => { if (alive) setDishCount(error ? null : count ?? 0) })
    supabase.from('categories').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id)
      .then(({ count, error }) => { if (alive) setCategoryCount(error ? null : count ?? 0) })
    return () => { alive = false }
  }, [restaurant?.id, activeTab])

  const plan    = restaurant?.plan || 'free'
  const socialUrl = restaurant ? `${window.location.origin}/carta/${restaurant.slug}` : ''
  const menuUrl = socialUrl ? `${socialUrl}/menu` : ''

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    )
  }

  if (loadError) return <main className="md-empty" role="alert"><h1>No se ha podido cargar el restaurante</h1><p>Comprueba tu conexión y vuelve a intentarlo.</p><button type="button" className="md-primary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></main>

  function customize() {
    if (restaurant) setShowCustomize(true)
    else setActiveTab('restaurant')
  }
  const gate = <section className="md-empty"><IconBolt size={30} color={ORANGE} /><h2>Disponible en el Plan Pro</h2><p>Amplía tu plan para añadir imágenes y ofertas y conectar las reservas y redes de tu restaurante.</p><a href={WA_UPGRADE} target="_blank" rel="noopener noreferrer" className="md-primary">Consultar planes <IconExternalLink size={17} /></a></section>

  return (
    <DashboardLayout restaurant={restaurant} activeTab={activeTab} onNavigate={setActiveTab} onShowCustomize={customize}>
      {activeTab === 'home' && <DashboardHome restaurant={restaurant} dishCount={dishCount} categoryCount={categoryCount} plan={plan} menuUrl={menuUrl} onNavigate={setActiveTab} onShowQR={() => setShowQR(true)} onShowCustomize={customize} />}
      {activeTab === 'restaurant' && <RestaurantEditor restaurant={restaurant} onUpdate={setRestaurant} />}
      {activeTab === 'categories' && restaurant && <div className="md-content-card"><CategoryManager restaurantId={restaurant.id} /></div>}
      {activeTab === 'dishes' && restaurant && <div className="md-content-card"><DishManager restaurantId={restaurant.id} plan={plan} /></div>}
      {activeTab === 'daily-menu' && restaurant && <div className="md-content-card"><DailyMenuEditor restaurant={restaurant} userId={user?.id} onUpdate={setRestaurant} /></div>}
      {activeTab === 'slides' && restaurant && (plan === 'free' ? gate : <div className="md-content-card md-slides-content"><h2>Imágenes y ofertas de tu carta</h2><p>Tu próxima oferta, justo donde tus clientes la ven.</p><MenuSlidesEditor restaurant={restaurant} userId={user?.id} onUpdate={setRestaurant} /></div>)}
      {activeTab === 'reservations' && restaurant && (plan === 'free' ? gate : <div className="md-connections"><ReservationsPanel restaurant={restaurant} onUpdate={setRestaurant} /><SocialsPanel restaurant={restaurant} onUpdate={setRestaurant} /></div>)}
      {activeTab === 'socials' && <SocialsPanel restaurant={restaurant} onUpdate={setRestaurant} />}
      {activeTab === 'stats' && <StatsPanel restaurantId={restaurant?.id} />}
      {activeTab === 'account' && <div className="md-content-card"><AccountPanel /></div>}
      {!restaurant && ['categories', 'dishes', 'daily-menu', 'slides', 'reservations'].includes(activeTab) && <section className="md-empty"><h2>Primero crea tu restaurante</h2><p>Después podrás gestionar todos los detalles de tu carta.</p><button type="button" className="md-primary" onClick={() => setActiveTab('restaurant')}>Configurar restaurante</button></section>}
      {showQR && menuUrl && <QRModal url={menuUrl} socialUrl={socialUrl} onClose={() => setShowQR(false)} />}
      {showCustomize && restaurant && <CustomizeModal restaurant={restaurant} user={user} onClose={() => setShowCustomize(false)} onUpdate={setRestaurant} />}
    </DashboardLayout>
  )
}
