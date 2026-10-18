import { useState, useEffect, useRef } from 'react'
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
import {
  IconHome, IconToolsKitchen2, IconLayoutGrid,
  IconChartBar, IconUser, IconBolt, IconExternalLink,
  IconEdit, IconShare, IconQrcode, IconX,
  IconBrush, IconCamera,
} from '@tabler/icons-react'

const ORANGE       = '#E65100'
const ORANGE_LIGHT = '#FFF3E0'
const PURPLE_LIGHT = '#EDE7F6'
const PURPLE       = '#6A1B9A'
const PLAN_LABEL   = { free: 'Plan Free', pro: 'Plan Pro', premium: 'Plan Premium' }
const WA_SUPPORT   = 'https://wa.me/34674460692?text=Hola,%20necesito%20ayuda%20con%20Messa'
const WA_UPGRADE   = `https://wa.me/34674460692?text=${encodeURIComponent('Hola, quiero mejorar mi plan de Messa al plan Pro')}`

const BOTTOM_NAV = [
  { id: 'home',       label: 'Inicio',     Icon: IconHome },
  { id: 'dishes',     label: 'Platos',     Icon: IconToolsKitchen2 },
  { id: 'categories', label: 'Categorías', Icon: IconLayoutGrid },
  { id: 'stats',      label: 'Stats',      Icon: IconChartBar },
  { id: 'account',    label: 'Mi cuenta',  Icon: IconUser },
]

const INPUT_STYLE = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #E5E7EB', borderRadius: 12,
  padding: '12px 14px', fontSize: 14, fontWeight: 600,
  fontFamily: 'inherit', color: '#1A1A1A',
  background: '#FFF', outline: 'none',
  transition: 'border-color 0.15s',
}

/* ── QR Modal ────────────────────────────────────────── */
function QRModal({ url, onClose }) {
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
          padding: '24px 24px 40px', width: '100%', maxWidth: 480,
          textAlign: 'center', boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>Mi QR</p>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={18} color="#374151" />
          </button>
        </div>
        <img src={qrSrc} alt="QR de mi carta" style={{ width: 210, height: 210, borderRadius: 12, display: 'block', margin: '0 auto' }} />
        <p style={{ margin: '14px 0 0', fontSize: 12, color: '#9CA3AF', wordBreak: 'break-all' }}>{url}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 20, padding: '13px 0', borderRadius: 12, background: ORANGE, color: '#FFF', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
          Abrir carta →
        </a>
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
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#FFF', zIndex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>Personalizar mi restaurante</p>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

/* ── Home Screen ─────────────────────────────────────── */
function HomeScreen({ restaurant, dishCount, categoryCount, plan, onNavigate, onShowQR, onShowCustomize }) {
  const isFree  = plan === 'free'
  const menuUrl = restaurant ? `${window.location.origin}/carta/${restaurant.slug}` : ''
  const name    = restaurant?.name || 'Mi restaurante'
  const hasBanner = !!restaurant?.banner_url

  if (!restaurant) {
    return (
      <div style={{ padding: 24, paddingTop: 60, textAlign: 'center' }}>
        <div style={{ background: '#FFF', borderRadius: 16, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>Configura tu restaurante</p>
          <p style={{ margin: '8px 0 20px', fontSize: 14, color: '#9CA3AF' }}>
            Empieza añadiendo el nombre y descripción de tu restaurante para activar tu carta pública.
          </p>
          <button
            onClick={() => onNavigate('restaurant')}
            style={{ background: ORANGE, color: '#FFF', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Crear mi restaurante →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header: banner o naranja sólido */}
      <div style={{
        position: 'relative',
        background: hasBanner ? `url(${restaurant.banner_url}) center/cover no-repeat` : ORANGE,
        padding: '28px 20px 48px',
        overflow: 'hidden',
      }}>
        {/* Overlay oscuro sobre el banner */}
        {hasBanner && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.48)' }} />
        )}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 400 }}>Hola,</p>
            <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: '#FFF', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </h1>
            <span style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.82)', background: 'rgba(255,255,255,0.18)', padding: '3px 12px', borderRadius: 99, fontWeight: 500 }}>
              {PLAN_LABEL[plan]} · activo
            </span>
          </div>
          <button
            onClick={() => onNavigate('account')}
            style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.22)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Mi cuenta"
          >
            <IconUser size={22} color="#FFF" />
          </button>
        </div>
      </div>

      {/* ── Contenido scrolleable */}
      <div style={{ padding: '0 16px' }}>

        {/* Banner "Mejora tu plan" */}
        {isFree && (
          <button
            onClick={() => window.open(WA_UPGRADE, '_blank')}
            style={{ width: '100%', marginTop: -28, marginBottom: 20, background: '#FFF', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: 'none', textAlign: 'left', boxSizing: 'border-box' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: ORANGE_LIGHT, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconBolt size={22} color={ORANGE} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>¡Pasa al Plan Pro!</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>Más platos, carta personalizada y sin límites.</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: ORANGE, flexShrink: 0 }}>Ver planes →</span>
          </button>
        )}

        {/* ── Mi carta — métricas */}
        <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Mi carta</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <div style={{ background: '#FFF', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: 16 }}>
            <IconToolsKitchen2 size={22} color={ORANGE} />
            <p style={{ margin: '10px 0 2px', fontSize: 28, fontWeight: 700, color: '#1A1A1A', lineHeight: 1 }}>{dishCount ?? '—'}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Platos activos</p>
          </div>
          <div style={{ background: '#FFF', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: 16 }}>
            <IconLayoutGrid size={22} color={ORANGE} />
            <p style={{ margin: '10px 0 2px', fontSize: 28, fontWeight: 700, color: '#1A1A1A', lineHeight: 1 }}>{categoryCount ?? '—'}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Categorías</p>
          </div>
        </div>

        {/* ── Accesos rápidos */}
        <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Accesos rápidos</p>
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 10, overflowX: 'auto', marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16, paddingBottom: 8 }}>

          {/* Ver mi carta */}
          <a href={menuUrl} target="_blank" rel="noopener noreferrer"
            style={{ minWidth: 130, background: '#FFF', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, cursor: 'pointer', flexShrink: 0, textDecoration: 'none' }}
          >
            <IconExternalLink size={22} color="#888" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Ver mi carta</span>
          </a>

          {/* Editar carta */}
          <button onClick={() => onNavigate('dishes')}
            style={{ minWidth: 130, background: '#FFF', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', textAlign: 'left' }}
          >
            <IconEdit size={22} color="#888" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Editar carta</span>
          </button>

          {/* Personalizar */}
          <button onClick={onShowCustomize}
            style={{ minWidth: 130, background: '#FFF', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', textAlign: 'left' }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: PURPLE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconBrush size={18} color={PURPLE} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Personalizar</span>
          </button>

          {/* Redes sociales */}
          <button onClick={() => onNavigate('socials')}
            style={{ minWidth: 130, background: '#FFF', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', textAlign: 'left' }}
          >
            <IconShare size={22} color="#888" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Redes sociales</span>
          </button>

          {/* Mi QR */}
          <button onClick={onShowQR}
            style={{ minWidth: 130, background: '#FFF', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', textAlign: 'left' }}
          >
            <IconQrcode size={22} color="#888" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Mi QR</span>
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
  const [activeTab,      setActiveTab]      = useState('home')
  const [dishCount,      setDishCount]      = useState(null)
  const [categoryCount,  setCategoryCount]  = useState(null)
  const [showQR,         setShowQR]         = useState(false)
  const [showCustomize,  setShowCustomize]  = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error('Error al cargar el restaurante')
        else setRestaurant(data)
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    if (!restaurant) return
    supabase.from('dishes').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id)
      .then(({ count }) => setDishCount(count ?? 0))
    supabase.from('categories').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id)
      .then(({ count }) => setCategoryCount(count ?? 0))
  }, [restaurant])

  const plan    = restaurant?.plan || 'free'
  const menuUrl = restaurant ? `${window.location.origin}/carta/${restaurant.slug}` : ''

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div style={{ background: '#F5F5F5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>

        {/* ── Contenido principal */}
        <main style={{ paddingBottom: 88 }}>

          {activeTab === 'home' && (
            <HomeScreen
              restaurant={restaurant}
              dishCount={dishCount}
              categoryCount={categoryCount}
              plan={plan}
              onNavigate={setActiveTab}
              onShowQR={() => setShowQR(true)}
              onShowCustomize={() => setShowCustomize(true)}
            />
          )}

          {activeTab === 'restaurant' && (
            <RestaurantEditor restaurant={restaurant} onUpdate={setRestaurant} />
          )}

          {activeTab === 'categories' && restaurant && (
            <div style={{ padding: 16, paddingTop: 20 }}>
              <CategoryManager restaurantId={restaurant.id} />
            </div>
          )}

          {activeTab === 'dishes' && restaurant && (
            <div style={{ padding: 16, paddingTop: 20 }}>
              <DishManager restaurantId={restaurant.id} plan={plan} />
            </div>
          )}

          {activeTab === 'socials' && (
            <SocialsPanel restaurant={restaurant} onUpdate={setRestaurant} />
          )}

          {activeTab === 'stats' && (
            <StatsPanel restaurantId={restaurant?.id} />
          )}

          {activeTab === 'account' && (
            <div style={{ padding: 16, paddingTop: 20 }}>
              <AccountPanel />
            </div>
          )}

          {!restaurant && (activeTab === 'categories' || activeTab === 'dishes') && (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
              <p style={{ margin: '0 0 12px', fontSize: 15 }}>Primero configura tu restaurante</p>
              <button
                onClick={() => setActiveTab('restaurant')}
                style={{ color: ORANGE, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Ir a configuración →
              </button>
            </div>
          )}
        </main>

        {/* ── Bottom Navbar */}
        <nav style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, background: '#FFF',
          borderTop: '0.5px solid #e5e7eb', padding: '8px 0 12px',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 40,
        }}>
          {BOTTOM_NAV.map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: active ? ORANGE : '#888', flex: 1, fontFamily: 'inherit' }}
              >
                <div style={{ padding: '4px 14px', borderRadius: 99, background: active ? ORANGE_LIGHT : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
                  <Icon size={22} />
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* ── WhatsApp support */}
        <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer" aria-label="Soporte por WhatsApp"
          style={{ position: 'fixed', bottom: 92, right: 20, zIndex: 30, width: 52, height: 52, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
        >
          <svg viewBox="0 0 24 24" width={26} height={26} fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>

        {/* ── QR Modal */}
        {showQR && menuUrl && (
          <QRModal url={menuUrl} onClose={() => setShowQR(false)} />
        )}

        {/* ── Customize Modal */}
        {showCustomize && restaurant && (
          <CustomizeModal
            restaurant={restaurant}
            user={user}
            onClose={() => setShowCustomize(false)}
            onUpdate={(updated) => { setRestaurant(updated); setShowCustomize(false) }}
          />
        )}
      </div>
    </div>
  )
}
