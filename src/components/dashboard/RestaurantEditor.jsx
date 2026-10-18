import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Globe, ChefHat, Upload, X, Image, Calendar, Lock,
  Copy, ExternalLink, ChevronRight,
  Eye, EyeOff, KeyRound, Mail, LogOut, HelpCircle,
  Check, Pencil, MessageCircle, Building2,
} from 'lucide-react'
import { SOCIALS } from '../../lib/socials'
import MenuSlidesEditor from './MenuSlidesEditor'

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const RED = '#EF4444'

const PLAN_INFO = {
  free:    { bg: '#F3F4F6', text: '#6B7280', label: 'Plan Gratuito' },
  pro:     { bg: '#DBEAFE', text: '#1D4ED8', label: 'Plan Pro' },
  premium: { bg: '#FEF3C7', text: '#B45309', label: 'Plan Premium' },
}

const cardStyle = {
  background: '#FFF',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  marginBottom: 12,
}

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#9CA3AF',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '14px 16px 0',
  display: 'block',
}

const iconBox = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: '#F9FAFB',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

function Row({ icon, label, sublabel, onClick, rightEl, noBorder }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: noBorder ? 'none' : '1px solid #F3F4F6',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={iconBox}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>{label}</p>
        {sublabel && <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: '#9CA3AF' }}>{sublabel}</p>}
      </div>
      {rightEl}
    </div>
  )
}

function ExpandBox({ children }) {
  return (
    <div style={{ padding: '4px 16px 16px', borderBottom: '1px solid #F3F4F6' }}>
      {children}
    </div>
  )
}

function RedBtn({ onClick, disabled, children, fullWidth }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: RED, color: '#FFF', border: 'none', borderRadius: 8,
        padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {children}
    </button>
  )
}

export default function RestaurantEditor({ restaurant, onUpdate }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  // restaurant fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [reservationUrl, setReservationUrl] = useState('')
  const [savingReservation, setSavingReservation] = useState(false)

  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [savingBanner, setSavingBanner] = useState(false)

  const [welcomeFile, setWelcomeFile] = useState(null)
  const [welcomePreview, setWelcomePreview] = useState(null)
  const [savingWelcome, setSavingWelcome] = useState(false)

  const [values, setValues] = useState({})
  const [toggled, setToggled] = useState({})
  const [savingSocials, setSavingSocials] = useState(false)

  // account fields
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // ui
  const [expanded, setExpanded] = useState(null)
  const [copied, setCopied] = useState(false)

  const plan = restaurant?.plan || 'free'
  const planInfo = PLAN_INFO[plan]
  const isFree = plan === 'free'
  const menuUrl = restaurant ? `${window.location.origin}/carta/${restaurant.slug}` : ''

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '')
      setDescription(restaurant.description || '')
      setReservationUrl(restaurant.reservation_url || '')
      setBannerPreview(restaurant.banner_url || null)
      setWelcomePreview(restaurant.welcome_image_url || null)
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

  const toggle = (section) => setExpanded(prev => prev === section ? null : section)

  // ---- handlers (unchanged logic) ----

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (restaurant) {
        const { data, error } = await supabase
          .from('restaurants')
          .update({ name: name.trim(), description: description.trim() })
          .eq('id', restaurant.id)
          .select()
          .single()
        if (error) throw error
        onUpdate(data)
        toast.success('Restaurante actualizado')
        setExpanded(null)
      } else {
        const base = slugify(name.trim())
        const slug = `${base}-${Date.now().toString(36)}`
        const { data, error } = await supabase
          .from('restaurants')
          .insert({ owner_id: user.id, name: name.trim(), description: description.trim(), slug })
          .select()
          .single()
        if (error) throw error
        onUpdate(data)
        toast.success('¡Restaurante creado! Ya tienes tu carta pública.')
        setExpanded(null)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBannerFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  const handleSaveBanner = async () => {
    if (!restaurant) return
    setSavingBanner(true)
    try {
      let bannerUrl = restaurant.banner_url || null
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop()
        const path = `${user.id}/banner_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('dish-images')
          .upload(path, bannerFile, { upsert: true })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('dish-images').getPublicUrl(path)
        bannerUrl = publicUrl
      }
      const { data, error } = await supabase
        .from('restaurants')
        .update({ banner_url: bannerUrl })
        .eq('id', restaurant.id)
        .select()
        .single()
      if (error) throw error
      onUpdate(data)
      setBannerFile(null)
      toast.success('Banner actualizado')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingBanner(false)
    }
  }

  const handleRemoveBanner = async () => {
    if (!restaurant) return
    setSavingBanner(true)
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .update({ banner_url: null })
        .eq('id', restaurant.id)
        .select()
        .single()
      if (error) throw error
      onUpdate(data)
      setBannerPreview(null)
      setBannerFile(null)
      toast.success('Banner eliminado')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingBanner(false)
    }
  }

  const handleWelcomeFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return }
    setWelcomeFile(file)
    setWelcomePreview(URL.createObjectURL(file))
  }

  const handleSaveWelcome = async () => {
    if (!restaurant) return
    setSavingWelcome(true)
    try {
      let welcomeUrl = restaurant.welcome_image_url || null
      if (welcomeFile) {
        const ext = welcomeFile.name.split('.').pop()
        const path = `${user.id}/welcome_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('dish-images')
          .upload(path, welcomeFile, { upsert: true })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('dish-images').getPublicUrl(path)
        welcomeUrl = publicUrl
      }
      const { data, error } = await supabase
        .from('restaurants')
        .update({ welcome_image_url: welcomeUrl })
        .eq('id', restaurant.id)
        .select()
        .single()
      if (error) throw error
      onUpdate(data)
      setWelcomeFile(null)
      toast.success('Imagen de bienvenida actualizada')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingWelcome(false)
    }
  }

  const handleRemoveWelcome = async () => {
    if (!restaurant) return
    setSavingWelcome(true)
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .update({ welcome_image_url: null })
        .eq('id', restaurant.id)
        .select()
        .single()
      if (error) throw error
      onUpdate(data)
      setWelcomePreview(null)
      setWelcomeFile(null)
      toast.success('Imagen eliminada')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingWelcome(false)
    }
  }

  const handleSaveReservation = async () => {
    if (!restaurant) return
    setSavingReservation(true)
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .update({ reservation_url: reservationUrl.trim() || null })
        .eq('id', restaurant.id)
        .select()
        .single()
      if (error) throw error
      onUpdate(data)
      toast.success('Enlace de reservas actualizado')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingReservation(false)
    }
  }

  const handleSaveSocials = async () => {
    if (!restaurant) return
    setSavingSocials(true)
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
      setSavingSocials(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) { toast.error(error.message); return }
    toast.success('Contraseña actualizada')
    setNewPassword('')
    setExpanded(null)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleCopyUrl = () => {
    if (!restaurant) return
    navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const avatarLetter = (restaurant?.name || user?.email || '?')[0].toUpperCase()

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ background: '#F5F5F5', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* ---- Hero ---- */}
        <div style={{ background: RED, height: 160, position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)',
            width: 82, height: 82, borderRadius: '50%',
            background: '#FFF', border: '3px solid #FFF',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, fontWeight: 700, color: RED, userSelect: 'none',
          }}>
            {avatarLetter}
          </div>
        </div>

        {/* ---- Name + plan ---- */}
        <div style={{ paddingTop: 54, paddingBottom: 20, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0, padding: '0 20px' }}>
            {restaurant?.name || 'Mi Restaurante'}
          </h1>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            <span style={{
              background: planInfo.bg, color: planInfo.text,
              fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 99,
            }}>
              {planInfo.label} · Activo
            </span>
          </div>
        </div>

        <div style={{ padding: '0 16px 48px' }}>

          {/* ---- Información ---- */}
          <div style={cardStyle}>
            <span style={sectionLabelStyle}>Información</span>

            <Row
              icon={<Building2 size={18} color="#9CA3AF" />}
              label={name || 'Nombre del restaurante'}
              sublabel={description || 'Sin descripción'}
              onClick={() => toggle('info')}
              rightEl={<Pencil size={15} color="#9CA3AF" />}
            />

            {expanded === 'info' && (
              <ExpandBox>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej: La Trattoria"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Cocina italiana auténtica en el corazón de la ciudad..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
                <RedBtn onClick={handleSave} disabled={saving || !name.trim()}>
                  {saving ? 'Guardando...' : restaurant ? 'Guardar cambios' : 'Crear restaurante'}
                </RedBtn>
              </ExpandBox>
            )}

            {!restaurant && expanded !== 'info' && (
              <div style={{ padding: '0 16px 14px' }}>
                <div style={{
                  background: '#FEF3C7', border: '1px dashed #F59E0B', borderRadius: 8,
                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <ChefHat size={16} color="#D97706" />
                  <p style={{ margin: 0, fontSize: 13, color: '#92400E', fontWeight: 500 }}>
                    Toca el lápiz para crear tu restaurante
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ---- Mi carta ---- */}
          {restaurant && (
            <div style={cardStyle}>
              <span style={sectionLabelStyle}>Enlace para la bio de tus redes</span>

              <div style={{ padding: '12px 16px 0' }}>
                <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>Abre la bienvenida con los botones «Ver la carta» y «Reservar mesa». El QR de las mesas abre directamente los platos.</p>
                <div style={{
                  background: '#F9FAFB', borderRadius: 8, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                }}>
                  <Globe size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, color: '#6B7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {menuUrl}
                  </p>
                  <button
                    onClick={handleCopyUrl}
                    aria-label="Copiar enlace para redes"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}
                  >
                    {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} color="#9CA3AF" />}
                  </button>
                </div>

                <a
                  href={`/carta/${restaurant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: RED, color: '#FFF', borderRadius: 99,
                    padding: '12px 20px', fontSize: 15, fontWeight: 600,
                    textDecoration: 'none', marginBottom: 14,
                  }}
                >
                  <ExternalLink size={17} />
                  Ver bienvenida
                </a>
              </div>
            </div>
          )}

          {/* ---- Imágenes de la carta ---- */}
          {restaurant && (
            <div style={cardStyle}>
              <span style={sectionLabelStyle}>Imágenes de la carta</span>

              {/* Carrusel de imágenes independiente de los platos */}
              <Row icon={<Image size={18} color="#9CA3AF" />} label="Destacado" sublabel="Sube, ordena y cambia tus promociones" onClick={() => !isFree && toggle('slides')} rightEl={isFree ? <Lock size={15} color="#9CA3AF" /> : <ChevronRight size={15} color="#9CA3AF" />} />
              {expanded === 'slides' && !isFree && restaurant && <MenuSlidesEditor restaurant={restaurant} userId={user?.id} onUpdate={onUpdate} />}
              {/* Banner */}
              <Row
                icon={<Image size={18} color="#9CA3AF" />}
                label="Banner de la carta"
                sublabel={isFree ? 'Requiere Plan Pro' : (bannerPreview ? 'Imagen configurada' : 'Sin imagen')}
                onClick={() => !isFree && toggle('banner')}
                rightEl={isFree ? <Lock size={15} color="#D1D5DB" /> : <ChevronRight size={16} color="#9CA3AF" />}
              />

              {expanded === 'banner' && !isFree && (
                <ExpandBox>
                  {bannerPreview ? (
                    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                      <img src={bannerPreview} alt="Banner" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                      <button
                        onClick={handleRemoveBanner}
                        disabled={savingBanner}
                        style={{
                          position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)',
                          border: 'none', borderRadius: '50%', width: 28, height: 28,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={14} color="#FFF" />
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: '2px dashed #E5E7EB', borderRadius: 8, padding: '24px 16px',
                      cursor: 'pointer', marginBottom: 10,
                    }}>
                      <Upload size={24} color="#D1D5DB" />
                      <p style={{ margin: '8px 0 2px', fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Subir banner</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>16:9 recomendado · máx. 5 MB</p>
                      <input type="file" accept="image/*" onChange={handleBannerFile} style={{ display: 'none' }} />
                    </label>
                  )}
                  {bannerPreview && !bannerFile && (
                    <label style={{ cursor: 'pointer' }}>
                      <span style={{ fontSize: 13, color: RED, fontWeight: 600 }}>Cambiar imagen</span>
                      <input type="file" accept="image/*" onChange={handleBannerFile} style={{ display: 'none' }} />
                    </label>
                  )}
                  {bannerFile && (
                    <RedBtn onClick={handleSaveBanner} disabled={savingBanner}>
                      {savingBanner ? 'Guardando...' : 'Guardar banner'}
                    </RedBtn>
                  )}
                </ExpandBox>
              )}

              {/* Imagen de bienvenida */}
              <Row
                icon={<Globe size={18} color="#9CA3AF" />}
                label="Imagen de bienvenida"
                sublabel={isFree ? 'Requiere Plan Pro' : (welcomePreview ? 'Imagen configurada' : 'Sin imagen')}
                onClick={() => !isFree && toggle('welcome')}
                rightEl={isFree ? <Lock size={15} color="#D1D5DB" /> : <ChevronRight size={16} color="#9CA3AF" />}
                noBorder
              />

              {expanded === 'welcome' && !isFree && (
                <ExpandBox>
                  {welcomePreview ? (
                    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                      <img src={welcomePreview} alt="Bienvenida" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                      <button
                        onClick={handleRemoveWelcome}
                        disabled={savingWelcome}
                        style={{
                          position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)',
                          border: 'none', borderRadius: '50%', width: 28, height: 28,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={14} color="#FFF" />
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: '2px dashed #E5E7EB', borderRadius: 8, padding: '24px 16px',
                      cursor: 'pointer', marginBottom: 10,
                    }}>
                      <Upload size={24} color="#D1D5DB" />
                      <p style={{ margin: '8px 0 2px', fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Subir imagen</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>máx. 5 MB</p>
                      <input type="file" accept="image/*" onChange={handleWelcomeFile} style={{ display: 'none' }} />
                    </label>
                  )}
                  {welcomePreview && !welcomeFile && (
                    <label style={{ cursor: 'pointer' }}>
                      <span style={{ fontSize: 13, color: RED, fontWeight: 600 }}>Cambiar imagen</span>
                      <input type="file" accept="image/*" onChange={handleWelcomeFile} style={{ display: 'none' }} />
                    </label>
                  )}
                  {welcomeFile && (
                    <RedBtn onClick={handleSaveWelcome} disabled={savingWelcome}>
                      {savingWelcome ? 'Guardando...' : 'Guardar imagen'}
                    </RedBtn>
                  )}
                </ExpandBox>
              )}
            </div>
          )}

          {/* ---- Reservas ---- */}
          {restaurant && (
            <div style={cardStyle}>
              <span style={sectionLabelStyle}>Reservas</span>

              <Row
                icon={<Calendar size={18} color="#9CA3AF" />}
                label="Enlace de reservas"
                sublabel={reservationUrl ? 'Configurado' : 'Sin enlace configurado'}
                onClick={() => toggle('reservation')}
                rightEl={<ChevronRight size={16} color="#9CA3AF" />}
                noBorder
              />

              {expanded === 'reservation' && (
                <ExpandBox>
                  <input
                    type="url"
                    value={reservationUrl}
                    onChange={e => setReservationUrl(e.target.value)}
                    placeholder="https://www.covermanager.com/mi-restaurante"
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                  <RedBtn onClick={handleSaveReservation} disabled={savingReservation}>
                    {savingReservation ? 'Guardando...' : 'Guardar enlace'}
                  </RedBtn>
                </ExpandBox>
              )}
            </div>
          )}

          {/* ---- Redes sociales ---- */}
          {restaurant && (
            <div style={cardStyle}>
              <span style={sectionLabelStyle}>Redes sociales y contacto</span>

              <Row
                icon={
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="#9CA3AF">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.7 5.5 4.3 9 4.5-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.7z" />
                  </svg>
                }
                label="Contacto y redes sociales"
                sublabel={
                  isFree
                    ? 'Requiere Plan Pro'
                    : `${Object.values(toggled).filter(Boolean).length} ${Object.values(toggled).filter(Boolean).length === 1 ? 'red activa' : 'redes activas'}`
                }
                onClick={() => !isFree && toggle('socials')}
                rightEl={isFree ? <Lock size={15} color="#D1D5DB" /> : <ChevronRight size={16} color="#9CA3AF" />}
                noBorder
              />

              {expanded === 'socials' && !isFree && (
                <ExpandBox>
                  <div style={{ marginBottom: 12 }}>
                    {SOCIALS.map(({ key, label, placeholder, path }) => (
                      <div key={key} style={{ borderRadius: 8, border: '1px solid #F3F4F6', marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                          <svg viewBox="0 0 24 24" width={16} height={16} fill="#9CA3AF"><path d={path} /></svg>
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#374151' }}>{label}</span>
                          <button
                            onClick={() => setToggled(t => ({ ...t, [key]: !t[key] }))}
                            style={{
                              position: 'relative', width: 36, height: 20, borderRadius: 99,
                              background: toggled[key] ? RED : '#E5E7EB',
                              border: 'none', cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            <span style={{
                              position: 'absolute', top: 3,
                              left: toggled[key] ? 17 : 3,
                              width: 14, height: 14, borderRadius: '50%', background: '#FFF',
                              transition: 'left 0.15s',
                            }} />
                          </button>
                        </div>
                        {toggled[key] && (
                          <div style={{ padding: '0 12px 10px' }}>
                            <input
                              type="text"
                              value={values[key] || ''}
                              onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                              placeholder={placeholder}
                              style={{ ...inputStyle, background: '#F9FAFB', fontSize: 13 }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <RedBtn onClick={handleSaveSocials} disabled={savingSocials}>
                    {savingSocials ? 'Guardando...' : 'Guardar redes sociales'}
                  </RedBtn>
                </ExpandBox>
              )}
            </div>
          )}

          {/* ---- Cuenta ---- */}
          <div style={cardStyle}>
            <span style={sectionLabelStyle}>Cuenta</span>

            <Row
              icon={<Mail size={18} color="#9CA3AF" />}
              label={user?.email || '—'}
              sublabel="Email de la cuenta"
            />

            <Row
              icon={<KeyRound size={18} color="#9CA3AF" />}
              label="Cambiar contraseña"
              onClick={() => toggle('password')}
              rightEl={<ChevronRight size={16} color="#9CA3AF" />}
            />

            {expanded === 'password' && (
              <ExpandBox>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                  </button>
                </div>
                <RedBtn onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
                  {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
                </RedBtn>
              </ExpandBox>
            )}

            <Row
              icon={
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
              label={planInfo.label}
              sublabel="Tu plan actual · Activo"
              rightEl={
                <span style={{ background: planInfo.bg, color: planInfo.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                  Activo
                </span>
              }
              noBorder
            />
          </div>

          {/* ---- Soporte ---- */}
          <div style={cardStyle}>
            <span style={sectionLabelStyle}>Soporte</span>

            <Row
              icon={<HelpCircle size={18} color="#9CA3AF" />}
              label="Centro de ayuda"
              sublabel="Resuelve tus dudas rápido"
              onClick={() => window.open('https://wa.me/34674460692?text=Hola,%20necesito%20ayuda%20con%20Messa', '_blank')}
              rightEl={<ChevronRight size={16} color="#9CA3AF" />}
            />

            <Row
              icon={<MessageCircle size={18} color="#9CA3AF" />}
              label="Contactar con nosotros"
              sublabel="Respuesta en menos de 24h"
              onClick={() => window.open('https://wa.me/34674460692?text=Hola,%20quiero%20contactar%20con%20Messa', '_blank')}
              rightEl={<ChevronRight size={16} color="#9CA3AF" />}
              noBorder
            />
          </div>

          {/* ---- Cerrar sesión ---- */}
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              background: 'transparent',
              border: `2px solid ${RED}`,
              color: RED,
              borderRadius: 99,
              padding: '14px 20px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 4,
              fontFamily: 'inherit',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
