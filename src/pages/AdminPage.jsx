import { Fragment, useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Store, Users, BarChart2, Settings, LogOut,
  X, Mail, Eye, EyeOff, Check, Crown, Search,
  TrendingUp, ArrowUpRight, ArrowLeftRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

// ─── Design tokens (reference app palette) ────────────────────────────────────
const CREAM       = '#fbf9f8'
const CREAM_DARK  = '#efeded'
const CREAM_LIGHT = '#ffffff'
const CHARCOAL    = '#1b1c1c'
const CHARCOAL_L  = '#5f5e5e'

// ─── Theme system ──────────────────────────────────────────────────────────────
const ADMIN_THEMES = [
  {
    id: 'terracotta',
    name: 'Terracotta',
    accent: '#a03b13',
    accentLight: '#c0532a',
    sidebarBg: CHARCOAL,
    swatches: ['#a03b13', '#fbf9f8'],
  },
  {
    id: 'ocean',
    name: 'Azul Océano',
    accent: '#1d4ed8',
    accentLight: '#3b82f6',
    sidebarBg: '#0f172a',
    swatches: ['#1d4ed8', '#eff6ff'],
  },
  {
    id: 'forest',
    name: 'Bosque',
    accent: '#166534',
    accentLight: '#16a34a',
    sidebarBg: '#052e16',
    swatches: ['#166534', '#f0fdf4'],
  },
]

function loadTheme() {
  try {
    return ADMIN_THEMES.find(t => t.id === localStorage.getItem('admin_theme')) ?? ADMIN_THEMES[0]
  } catch { return ADMIN_THEMES[0] }
}
function persistTheme(id) {
  try { localStorage.setItem('admin_theme', id) } catch {}
}

// ─── Plan helpers ──────────────────────────────────────────────────────────────
const PLAN_LABEL = { free: 'Free', pro: 'Pro' }
const PLAN_BADGE = {
  free:    { bg: CREAM_DARK,  color: CHARCOAL_L },
  pro:     { bg: '#dbeafe',   color: '#1d4ed8' },
}

const setupItems = (restaurant) => [
  { label: 'Logo', ready: restaurant.has_logo },
  { label: 'Platos', ready: Number(restaurant.dish_count) > 0 },
  { label: 'Destacado', ready: restaurant.has_highlight },
  { label: 'Reservas', ready: restaurant.has_reservations },
]

function SetupStatus({ restaurant, accent }) {
  const items = setupItems(restaurant)
  const ready = items.filter(item => item.ready).length
  return (
    <div aria-label={`${ready} de ${items.length} elementos configurados`} style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minWidth: 170 }}>
      {items.map(item => <span key={item.label} title={item.ready ? `${item.label}: configurado` : `${item.label}: pendiente`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px', borderRadius: 7, fontSize: 10, fontWeight: 700, color: item.ready ? accent : CHARCOAL_L, background: item.ready ? `${accent}12` : CREAM, border: `1px solid ${item.ready ? `${accent}28` : CREAM_DARK}` }}><Check size={11} strokeWidth={item.ready ? 3 : 2} />{item.label}</span>)}
    </div>
  )
}

// ─── Chart data builder ────────────────────────────────────────────────────────
function buildChartData(restaurants, period) {
  const now = new Date()
  if (period === 'DIARIO') {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (13 - i))
      return {
        name: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        Registros: restaurants.filter(r => new Date(r.created_at).toDateString() === d.toDateString()).length,
      }
    })
  }
  if (period === 'SEMANAL') {
    return Array.from({ length: 8 }, (_, i) => {
      const start = new Date(now)
      start.setDate(start.getDate() - (7 - i) * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return {
        name: start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        Registros: restaurants.filter(r => { const d = new Date(r.created_at); return d >= start && d < end }).length,
      }
    })
  }
  if (period === 'ANUAL') {
    return Array.from({ length: 4 }, (_, i) => {
      const year = now.getFullYear() - (3 - i)
      return {
        name: String(year),
        Registros: restaurants.filter(r => new Date(r.created_at).getFullYear() === year).length,
      }
    })
  }
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now)
    d.setDate(1)
    d.setMonth(d.getMonth() - (11 - i))
    const m = d.getMonth(), y = d.getFullYear()
    return {
      name: d.toLocaleDateString('es-ES', { month: 'short' }),
      Registros: restaurants.filter(r => {
        const rd = new Date(r.created_at)
        return rd.getMonth() === m && rd.getFullYear() === y
      }).length,
    }
  })
}

// ─── Custom chart tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, accent }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: CREAM_LIGHT, border: `1px solid ${CREAM_DARK}`, borderRadius: 12, padding: '10px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ color: CHARCOAL_L, fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: accent, fontWeight: 700, fontSize: 13 }}>{payload[0].value} registros</p>
    </div>
  )
}

// ─── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ user, onClose, onSignOut, theme, onThemeChange }) {
  const [newEmail, setNewEmail]     = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPwd, setSavingPwd]   = useState(false)

  const inputStyle = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    border: `1px solid ${CREAM_DARK}`,
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    color: CHARCOAL,
    background: CREAM_LIGHT,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  const handleSaveEmail = async () => {
    if (!newEmail.trim()) return
    setSavingEmail(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setSavingEmail(false)
    if (error) { toast.error(error.message); return }
    toast.success('Revisa tu nuevo email para confirmar el cambio')
    setNewEmail('')
  }

  const handleSavePassword = async () => {
    if (newPassword.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    if (newPassword !== confirmPwd) { toast.error('Las contraseñas no coinciden'); return }
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPwd(false)
    if (error) { toast.error(error.message); return }
    toast.success('Contraseña actualizada')
    setNewPassword(''); setConfirmPwd('')
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(27,28,28,0.45)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <div
          style={{
            width: '100%', maxWidth: 440, background: CREAM, borderRadius: 24,
            boxShadow: '0 24px 64px rgba(27,28,28,0.14)', pointerEvents: 'auto',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            maxHeight: '92vh', border: `1px solid ${CREAM_DARK}`,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${CREAM_DARK}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${theme.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={14} style={{ color: theme.accent }} />
              </div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: CHARCOAL, margin: 0 }}>Configuración</h2>
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: CHARCOAL_L }}
              onMouseEnter={e => e.currentTarget.style.background = CREAM_DARK}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Email actual */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: CHARCOAL_L, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Email actual</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: CREAM_LIGHT, border: `1px solid ${CREAM_DARK}` }}>
                <Mail size={13} style={{ color: CHARCOAL_L, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: CHARCOAL, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
              </div>
            </div>

            {/* Cambiar email */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: CHARCOAL_L, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Cambiar email</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}18` }}
                  onBlur={e => { e.target.style.borderColor = CREAM_DARK; e.target.style.boxShadow = 'none' }}
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={savingEmail || !newEmail.trim()}
                  style={{ padding: '10px 16px', borderRadius: 12, background: theme.accent, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: savingEmail || !newEmail.trim() ? 0.45 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {savingEmail ? '…' : 'Guardar'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: CHARCOAL_L, marginTop: 6 }}>Se enviará confirmación a la nueva dirección.</p>
            </div>

            {/* Cambiar contraseña */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: CHARCOAL_L, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Cambiar contraseña</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                    style={{ ...inputStyle, paddingRight: 40 }}
                    onFocus={e => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}18` }}
                    onBlur={e => { e.target.style.borderColor = CREAM_DARK; e.target.style.boxShadow = 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: CHARCOAL_L, display: 'flex', alignItems: 'center' }}
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Confirmar contraseña"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}18` }}
                  onBlur={e => { e.target.style.borderColor = CREAM_DARK; e.target.style.boxShadow = 'none' }}
                />
                <button
                  onClick={handleSavePassword}
                  disabled={savingPwd || !newPassword || !confirmPwd}
                  style={{ padding: '11px 16px', borderRadius: 12, background: theme.accent, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: savingPwd || !newPassword || !confirmPwd ? 0.45 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {savingPwd ? 'Actualizando…' : 'Cambiar contraseña'}
                </button>
              </div>
            </div>

            {/* Tema */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: CHARCOAL_L, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Tema de la plataforma</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {ADMIN_THEMES.map(t => {
                  const selected = theme.id === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => onThemeChange(t.id)}
                      style={{
                        borderRadius: 14, padding: '10px 12px',
                        border: selected ? `2px solid ${t.accent}` : `2px solid ${CREAM_DARK}`,
                        background: selected ? `${t.accent}08` : CREAM_LIGHT,
                        textAlign: 'left', cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                        {t.swatches.map((c, i) => (
                          <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
                        ))}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: CHARCOAL, margin: 0 }}>{t.name}</p>
                      {selected && (
                        <div style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={8} color="#fff" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px 20px', borderTop: `1px solid ${CREAM_DARK}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={onClose}
              style={{ padding: '12px 16px', borderRadius: 12, background: theme.accent, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Guardar cambios
            </button>
            <button
              onClick={onSignOut}
              style={{ padding: '10px 16px', borderRadius: 12, background: 'transparent', color: '#dc2626', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={13} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [restaurants, setRestaurants]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [toggling, setToggling]           = useState(null)
  const [changingPlan, setChangingPlan]   = useState(null)
  const [changingTheme, setChangingTheme] = useState(null)
  const [planFilter, setPlanFilter]     = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeNav, setActiveNav]       = useState('dashboard')
  const [notesOpen, setNotesOpen]       = useState(null)
  const [noteDraft, setNoteDraft]       = useState('')
  const [savingNotes, setSavingNotes]   = useState(null)
  const [period, setPeriod]             = useState('MENSUAL')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme]               = useState(loadTheme)

  const handleThemeChange = (id) => {
    const t = ADMIN_THEMES.find(t => t.id === id) ?? ADMIN_THEMES[0]
    setTheme(t)
    persistTheme(id)
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_get_all_restaurants')
    if (error) { toast.error(error.message); setLoading(false); return }
    setRestaurants(data || [])
    setLoading(false)
  }

  const handleToggle = async (id, current) => {
    setToggling(id)
    const { error } = await supabase.rpc('admin_set_restaurant_active', { p_restaurant_id: id, p_active: !current })
    if (error) { toast.error(error.message); setToggling(null); return }
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, active: !current } : r))
    toast.success(!current ? 'Restaurante activado' : 'Restaurante desactivado')
    setToggling(null)
  }

  const handleChangeTheme = async (id, newTheme) => {
    setChangingTheme(id)
    const { error } = await supabase.rpc('admin_set_restaurant_theme', { p_restaurant_id: id, p_theme: newTheme })
    if (error) { toast.error(error.message); setChangingTheme(null); return }
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, theme: newTheme } : r))
    toast.success(`Tema actualizado`)
    setChangingTheme(null)
  }

  const handleChangePlan = async (id, newPlan) => {
    setChangingPlan(id)
    const { error } = await supabase.rpc('admin_set_restaurant_plan', { p_restaurant_id: id, p_plan: newPlan })
    if (error) { toast.error(error.message); setChangingPlan(null); return }
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, plan: newPlan } : r))
    toast.success(`Plan actualizado a ${PLAN_LABEL[newPlan]}`)
    setChangingPlan(null)
  }

  const openNotes = (restaurant) => {
    setNotesOpen(current => current === restaurant.id ? null : restaurant.id)
    setNoteDraft(restaurant.admin_notes || '')
  }

  const saveNotes = async (restaurant) => {
    setSavingNotes(restaurant.id)
    const { error } = await supabase.rpc('admin_set_restaurant_notes', { p_restaurant_id: restaurant.id, p_notes: noteDraft })
    if (error) { toast.error(error.message); setSavingNotes(null); return }
    setRestaurants(prev => prev.map(item => item.id === restaurant.id ? { ...item, admin_notes: noteDraft.trim() } : item))
    setNotesOpen(null)
    setSavingNotes(null)
    toast.success('Nota privada guardada')
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const handleNavigation = (section) => {
    setActiveNav(section)
    if (section === 'nextly') return
    const target = section === 'dashboard' ? 'dashboard-top' : section === 'stats' ? 'statistics-section' : 'restaurants-section'
    requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const showPendingAccounts = (filter = 'needs_setup') => {
    setPlanFilter('all')
    setStatusFilter(filter)
    setActiveNav('restaurants')
    requestAnimationFrame(() => document.getElementById('restaurants-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const freeCount    = restaurants.filter(r => (r.plan || 'free') === 'free').length
  const proCount     = restaurants.filter(r => r.plan === 'pro').length
  const activeCount  = restaurants.filter(r => r.active).length
  const paidCount    = proCount
  const today        = new Date()
  const thisMonthCount = restaurants.filter(r => {
    const d = new Date(r.created_at)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).length

  const chartData = useMemo(() => buildChartData(restaurants, period), [restaurants, period])

  const donutData = useMemo(() => [
    { name: 'Free',    value: freeCount,    color: CREAM_DARK },
    { name: 'Pro',     value: proCount,     color: '#3b82f6' },
  ].filter(d => d.value > 0), [freeCount, proCount])

  const filtered = useMemo(() => restaurants
    .filter(r => planFilter === 'all' || (r.plan || 'free') === planFilter)
    .filter(r => {
      const complete = setupItems(r).every(item => item.ready)
      if (statusFilter === 'active') return r.active
      if (statusFilter === 'inactive') return !r.active
      if (statusFilter === 'ready') return complete
      if (statusFilter === 'needs_setup') return !complete
      if (statusFilter === 'missing_logo') return !r.has_logo
      if (statusFilter === 'missing_dishes') return Number(r.dish_count) === 0
      if (statusFilter === 'missing_reservations') return !r.has_reservations
      return true
    })
    .filter(r =>
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner_email?.toLowerCase().includes(search.toLowerCase())
    ), [restaurants, planFilter, statusFilter, search])

  const initial = (user?.email || 'A')[0].toUpperCase()

  const statCards = [
    {
      label: 'Restaurantes activos',
      value: activeCount,
      sub: `${restaurants.length} registrados`,
      icon: Store,
      iconBg: `${theme.accent}14`,
      iconColor: theme.accent,
    },
    {
      label: 'Nuevos este mes',
      value: thisMonthCount,
      sub: thisMonthCount ? 'Nuevos registros' : 'Sin cambios',
      icon: Users,
      iconBg: '#dbeafe',
      iconColor: '#1d4ed8',
    },
    {
      label: 'Planes Pro',
      value: paidCount,
      sub: paidCount ? 'Suscripciones activas' : 'Sin suscripciones',
      icon: Crown,
      iconBg: '#fff7ed',
      iconColor: '#c2410c',
    },
    {
      label: 'Ingreso mensual',
      value: `${proCount * 19} €`,
      sub: `${proCount} cuentas Pro · 19 €/mes`,
      icon: TrendingUp,
      iconBg: '#dcfce7',
      iconColor: '#15803d',
    },
  ]

  const pendingItems = [
    { label: 'Sin logo', count: restaurants.filter(r => !r.has_logo).length, hint: 'Completa la identidad visual', filter: 'missing_logo' },
    { label: 'Sin platos', count: restaurants.filter(r => Number(r.dish_count) === 0).length, hint: 'La carta todavía no está lista', filter: 'missing_dishes' },
    { label: 'Sin reservas', count: restaurants.filter(r => !r.has_reservations).length, hint: 'Activa WhatsApp o enlace de reserva', filter: 'missing_reservations' },
  ]

  // ── Shared style helpers ─────────────────────────────────────────────────────
  const card = {
    background: CREAM_LIGHT,
    border: `1px solid ${CREAM_DARK}`,
    borderRadius: 20,
    boxShadow: '0px 4px 16px rgba(27,28,28,0.05), 0px 1px 3px rgba(27,28,28,0.03)',
  }

  const labelStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: CHARCOAL_L,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  }

  const headingSerif = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    color: CHARCOAL,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: CREAM, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside
        className="admin-sidebar"
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 250,
          display: 'flex', flexDirection: 'column', alignItems: 'stretch',
          padding: '24px 14px', zIndex: 20, background: theme.sidebarBg,
        }}
      >
        {/* Logo */}
        <div
          data-mark={activeNav === 'nextly' ? 'N' : 'M'}
          style={{
            width: '100%', marginBottom: 30, background: 'transparent', display: 'flex', alignItems: 'center',
            justifyContent: 'flex-start', color: '#fff', fontWeight: 700, fontSize: 30,
            fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0, letterSpacing: '-0.04em', padding: '0 12px', position: 'relative',
          }}
        >
          {activeNav === 'nextly' ? 'Nextly' : 'MESSA'}
          <span style={{ position: 'absolute', top: 35, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 9, color: theme.accentLight, letterSpacing: '0.16em', fontWeight: 700 }}>{activeNav === 'nextly' ? 'SISTEMA DE RESERVAS' : 'CARTAS QUE CONECTAN'}</span>
        </div>

        {/* Selector de proyecto visible también en pantallas estrechas */}
        <button type="button" className="admin-project-switch"
          title={activeNav === 'nextly' ? 'Cambiar a MESSA' : 'Cambiar a Nextly'}
          aria-label={activeNav === 'nextly' ? 'Cambiar proyecto a MESSA' : 'Cambiar proyecto a Nextly'}
          onClick={() => handleNavigation(activeNav === 'nextly' ? 'dashboard' : 'nextly')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            borderRadius: 12, marginBottom: 18, padding: '12px',
            border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.12)',
            color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <ArrowLeftRight size={18} style={{ flexShrink: 0 }} />
          <span>{activeNav === 'nextly' ? 'Cambiar a MESSA' : 'Cambiar a Nextly'}</span>
        </button>
        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 5, flex: 1 }}>
          {(activeNav === 'nextly' ? [] : [
            { Icon: LayoutDashboard, tip: 'Panel de control', id: 'dashboard' },
            { Icon: Store,           tip: 'Restaurantes', id: 'restaurants' },
            { Icon: Users,           tip: 'Usuarios', id: 'users' },
            { Icon: BarChart2,       tip: 'Estadísticas', id: 'stats' },
          ]).map(({ Icon, tip, id }) => {
            const active = activeNav === id
            return (
            <button
              key={tip}
              title={tip}
              aria-current={active ? 'page' : undefined}
              onClick={() => handleNavigation(id)}
              style={{
                width: '100%', height: 42, padding: '0 12px', borderRadius: 11, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12,
                background: active ? theme.accent : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.68)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={17} /><span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: active ? 700 : 600 }}>{tip}</span>
            </button>
          )})}
        </nav>

        {/* Bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
          <button
            title="Ajustes"
            onClick={() => setSettingsOpen(true)}
            style={{
              width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12,
              background: 'transparent', color: 'rgba(255,255,255,0.4)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Settings size={17} /><span style={{ fontSize: 13, fontWeight: 600 }}>Configuración</span>
          </button>
          <button
            title="Mi perfil"
            onClick={() => setSettingsOpen(true)}
            style={{
              width: '100%', height: 42, padding: '0 8px', borderRadius: 10, border: `1px solid ${theme.accent}60`,
              cursor: 'pointer', background: theme.accent,
              color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'flex-start', gap: 10, fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{initial}</span><span style={{ fontSize: 12 }}>Administrador</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div className="admin-main" style={{ marginLeft: 250, flex: 1, minHeight: '100vh', background: CREAM }}>

        {/* Header */}
        <header
          style={{
            background: `${CREAM}f2`, backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${CREAM_DARK}`,
            padding: '14px 32px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
            boxShadow: '0 1px 8px rgba(27,28,28,0.04)',
          }}
        >
          <div>
            <h1 style={{ ...headingSerif, fontSize: 22, margin: 0 }}>{activeNav === 'nextly' ? 'Nextly · Superadmin' : 'Panel de Administración'}</h1>
            <p style={{ ...labelStyle, marginTop: 2, marginBottom: 0 }}>
              {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeNav !== 'nextly' && <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: CHARCOAL_L }} />
              <input
                type="text"
                placeholder="Buscar restaurante…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 30, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                  fontSize: 13, borderRadius: 12, border: `1px solid ${CREAM_DARK}`,
                  background: CREAM_LIGHT, color: CHARCOAL, outline: 'none',
                  width: 200, fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = theme.accent; e.target.style.boxShadow = `0 0 0 3px ${theme.accent}18` }}
                onBlur={e => { e.target.style.borderColor = CREAM_DARK; e.target.style.boxShadow = 'none' }}
              />
            </div>}
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: 10, background: theme.accent,
                border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700,
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {initial}
            </button>
          </div>
        </header>

        <main style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {activeNav === 'nextly' ? (
            <section aria-label="Panel Superadmin de Nextly" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ ...card, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h2 style={{ ...headingSerif, margin: 0, fontSize: 26 }}>Nextly</h2>
                    <p style={{ margin: '8px 0 0', color: CHARCOAL_L, fontSize: 13, maxWidth: 620 }}>
                      Consulta los negocios, las citas y las estadísticas de Nextly desde tu centro de administración.
                      Nextly mantiene su propio acceso de administrador; es posible que debas iniciar sesión allí.
                    </p>
                  </div>
                  <a href="https://nextly-app-eta.vercel.app/superadmin" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 11, padding: '11px 16px', fontSize: 13, fontWeight: 700, background: '#365CF5', color: '#fff', textDecoration: 'none' }}>
                    Abrir Nextly en otra pestaña <ArrowUpRight size={16} />
                  </a>
                </div>
                <p style={{ margin: '14px 0 0', fontSize: 12, color: CHARCOAL_L }}>
                  Si el navegador bloquea la vista integrada, utiliza el botón «Abrir Nextly en otra pestaña».
                  No se comparten datos ni contraseñas entre las dos aplicaciones.
                </p>
              </div>
              <div style={{ ...card, padding: 8, overflow: 'hidden', minHeight: 610 }}>
                <iframe title="Superadmin de Nextly" src="https://nextly-app-eta.vercel.app/superadmin"
                  referrerPolicy="no-referrer" style={{ display: 'block', width: '100%', height: 'min(78vh, 920px)', minHeight: 590, border: 0, borderRadius: 10, background: '#F7F9FD' }} />
              </div>
            </section>
          ) : (
          <>

          {/* ── WELCOME BANNER ── */}
          <section id="dashboard-top">
            <h2 style={{ ...headingSerif, fontSize: 28, margin: 0 }}>Panel de Control</h2>
            <p style={{ color: CHARCOAL_L, fontSize: 14, marginTop: 4, marginBottom: 0 }}>
              Bienvenido de nuevo. Aquí tienes el resumen de la plataforma.
            </p>
          </section>

          {/* ── STAT CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
            {statCards.map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
              <div key={label} style={{ ...card, padding: 18, minHeight: 128 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ padding: 8, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={17} style={{ color: iconColor }} />
                  </div>
                  <ArrowUpRight size={14} style={{ color: CHARCOAL_L, marginTop: 4 }} />
                </div>
                <p style={{ ...labelStyle, marginBottom: 4 }}>{label}</p>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em', color: CHARCOAL, margin: 0, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: CHARCOAL_L, marginTop: 6, marginBottom: 0 }}>{sub}</p>
              </div>
            ))}
          </div>

          <section style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ ...headingSerif, fontSize: 19, margin: 0 }}>Acciones pendientes</h2>
                <p style={{ fontSize: 12, color: CHARCOAL_L, margin: '3px 0 0' }}>Completa la configuración de tus restaurantes.</p>
              </div>
              <button type="button" onClick={() => showPendingAccounts()} style={{ border: `1px solid ${theme.accent}`, background: 'transparent', color: theme.accent, borderRadius: 9, padding: '8px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Ver pendientes</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {pendingItems.map(item => <button type="button" key={item.label} onClick={() => showPendingAccounts(item.filter)} style={{ textAlign: 'left', border: `1px solid ${CREAM_DARK}`, background: CREAM, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}><span style={{ display: 'block', fontSize: 18, fontWeight: 700, color: item.count ? CHARCOAL : '#15803d' }}>{item.count} {item.label.toLowerCase()}</span><span style={{ display: 'block', fontSize: 11, color: CHARCOAL_L, marginTop: 3 }}>{item.count ? item.hint : 'Todo correcto'}</span></button>)}
            </div>
          </section>

          {/* ── CHARTS ROW ── */}
          <div id="statistics-section" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}
            className="lg:grid-cols-3"
          >
            {/* Area chart */}
            <div style={{ ...card, padding: 24, gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ ...headingSerif, fontSize: 19, margin: 0 }}>Evolución de registros</h2>
                  <p style={{ fontSize: 12, color: CHARCOAL_L, marginTop: 2, marginBottom: 0 }}>Nuevos restaurantes por período</p>
                </div>
                <div style={{ display: 'flex', gap: 4, background: CREAM_DARK, borderRadius: 12, padding: 4 }}>
                  {['DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                        border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
                        transition: 'all 0.15s', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: period === p ? CREAM_LIGHT : 'transparent',
                        color: period === p ? theme.accent : CHARCOAL_L,
                        boxShadow: period === p ? '0 1px 4px rgba(27,28,28,0.08)' : 'none',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={theme.accent} stopOpacity={0.10} />
                      <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CREAM_DARK} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHARCOAL_L, fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: CHARCOAL_L, fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }} allowDecimals={false} width={22} />
                  <Tooltip content={<ChartTooltip accent={theme.accent} />} />
                  <Area
                    type="monotone" dataKey="Registros"
                    stroke={theme.accent} strokeWidth={2.5}
                    fill="url(#chartGrad)" dot={false}
                    activeDot={{ r: 5, fill: theme.accent, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>

          <div className="admin-bottom-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 0.8fr) minmax(0, 2.4fr)', gap: 16, alignItems: 'start' }}>
            {/* Donut + distribution */}
            <div style={{ ...card, padding: 24 }}>
              <h2 style={{ ...headingSerif, fontSize: 19, margin: 0 }}>Distribución</h2>
              <p style={{ fontSize: 12, color: CHARCOAL_L, marginTop: 2, marginBottom: 20 }}>Planes activos</p>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <PieChart width={150} height={150}>
                  <Pie
                    data={donutData.length > 0 ? donutData : [{ name: 'Sin datos', value: 1, color: CREAM_DARK }]}
                    cx={70} cy={70}
                    innerRadius={44} outerRadius={68}
                    paddingAngle={3} dataKey="value" strokeWidth={0}
                  >
                    {(donutData.length > 0 ? donutData : [{ color: CREAM_DARK }]).map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${CREAM_DARK}`, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                </PieChart>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Free',    count: freeCount,    color: '#9ca3af' },
                  { label: 'Pro',     count: proCount,     color: '#3b82f6' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: CHARCOAL_L }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: CHARCOAL }}>{item.count}</span>
                      <span style={{ fontSize: 11, color: CHARCOAL_L, width: 32, textAlign: 'right' }}>
                        {restaurants.length ? Math.round(item.count / restaurants.length * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}

                <div style={{ paddingTop: 12, marginTop: 4, borderTop: `1px solid ${CREAM_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: CHARCOAL_L }}>Ingreso estimado</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {proCount * 19}€/mes
                  </span>
                </div>
              </div>
            </div>

          {/* ── TABLE ── */}
          <div id="restaurants-section" style={{ ...card, overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${CREAM_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ ...headingSerif, fontSize: 19, margin: 0 }}>Últimos restaurantes</h2>
                <p style={{ fontSize: 11, color: CHARCOAL_L, marginTop: 2, marginBottom: 0 }}>
                  {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4, background: CREAM_DARK, borderRadius: 12, padding: 4 }}>
                  {['all', 'free', 'pro'].map(f => (
                    <button
                      key={f}
                      onClick={() => setPlanFilter(f)}
                      style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: planFilter === f ? CREAM_LIGHT : 'transparent',
                        color: planFilter === f ? theme.accent : CHARCOAL_L,
                        boxShadow: planFilter === f ? '0 1px 4px rgba(27,28,28,0.08)' : 'none',
                      }}
                    >
                      {f === 'all' ? 'Todos' : PLAN_LABEL[f]}
                    </button>
                  ))}
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filtrar estado de la cuenta" style={{ padding: '5px 10px', borderRadius: 10, border: `1px solid ${CREAM_DARK}`, background: CREAM_LIGHT, color: CHARCOAL, fontSize: 11, fontWeight: 700, outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <option value="all">Todos los estados</option>
                  <option value="needs_setup">Falta configurar</option>
                  <option value="missing_logo">Sin logo</option>
                  <option value="missing_dishes">Sin platos</option>
                  <option value="missing_reservations">Sin reservas</option>
                  <option value="ready">Configuración completa</option>
                  <option value="active">Carta activa</option>
                  <option value="inactive">Carta pausada</option>
                </select>
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `2px solid ${CREAM_DARK}`,
                    borderTopColor: theme.accent,
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <Store size={28} style={{ margin: '0 auto 8px', color: CREAM_DARK }} />
                <p style={{ fontSize: 13, color: CHARCOAL_L }}>No se encontraron restaurantes</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: CREAM }}>
                      {['Nombre', 'Email', 'Plan', 'Tema', 'Configuración', 'Estado', 'Fecha alta', 'Acciones'].map(h => (
                        <th
                          key={h}
                          style={{
                            ...labelStyle, textAlign: 'left',
                            padding: '12px 20px', whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => {
                      const rPlan = r.plan || 'free'
                      const badge = PLAN_BADGE[rPlan]
                      return (
                        <Fragment key={r.id}>
                        <tr
                          key={r.id}
                          style={{
                            borderTop: `1px solid ${CREAM_DARK}`,
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = CREAM}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Nombre */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 32, height: 32, borderRadius: 10,
                                  background: `${theme.accent}14`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: theme.accent, fontSize: 12, fontWeight: 700, flexShrink: 0,
                                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                              >
                                {(r.name || '?')[0].toUpperCase()}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: CHARCOAL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{r.name}</span>
                            </div>
                          </td>

                          {/* Email */}
                          <td style={{ padding: '14px 20px', fontSize: 13, color: CHARCOAL_L, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.owner_email}</td>

                          {/* Plan */}
                          <td style={{ padding: '14px 20px' }}>
                            <select
                              value={rPlan}
                              disabled={changingPlan === r.id}
                              onChange={e => handleChangePlan(r.id, e.target.value)}
                              style={{
                                fontSize: 11, fontWeight: 700, borderRadius: 8,
                                padding: '4px 10px', border: 'none', cursor: 'pointer',
                                background: badge.bg, color: badge.color, outline: 'none',
                                opacity: changingPlan === r.id ? 0.5 : 1,
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                              }}
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                            </select>
                          </td>

                          {/* Tema visual */}
                          <td style={{ padding: '14px 20px' }}>
                            <select
                              value={r.theme || 'default'}
                              disabled={changingTheme === r.id}
                              onChange={e => handleChangeTheme(r.id, e.target.value)}
                              style={{
                                fontSize: 11, fontWeight: 700, borderRadius: 8,
                                padding: '4px 10px', border: `1px solid ${CREAM_DARK}`, cursor: 'pointer',
                                background: CREAM_LIGHT, color: CHARCOAL, outline: 'none',
                                opacity: changingTheme === r.id ? 0.5 : 1,
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                              }}
                            >
                              <option value="default">Default (naranja)</option>
                              <option value="jungle">Jungle (verde dorado)</option>
                              <option value="maibacht">Maibacht (negro dorado)</option>
                            </select>
                          </td>

                          {/* Estado */}
                          <td style={{ padding: '14px 20px' }}><SetupStatus restaurant={r} accent={theme.accent} /></td>

                          {/* Estado */}
                          <td style={{ padding: '14px 20px' }}>
                            <span
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                                background: r.active ? '#dcfce7' : CREAM_DARK,
                                color: r.active ? '#15803d' : CHARCOAL_L,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.active ? '#16a34a' : '#9ca3af', flexShrink: 0 }} />
                              {r.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>

                          {/* Fecha */}
                          <td style={{ padding: '14px 20px', fontSize: 12, color: CHARCOAL_L, whiteSpace: 'nowrap' }}>
                            {new Date(r.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>

                          {/* Acciones */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <a href={`/carta/${r.slug}`} target="_blank" rel="noopener noreferrer" title={`Ver carta de ${r.name}`} style={{ minHeight: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0 9px', borderRadius: 8, color: theme.accent, background: `${theme.accent}12`, fontSize: 10, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}><Eye size={14} />Ver carta</a>
                              <button type="button" title="Copiar enlace" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/carta/${r.slug}`); toast.success('Enlace copiado') } catch { toast.error('No se ha podido copiar el enlace') } }} style={{ padding: '7px 8px', borderRadius: 8, border: `1px solid ${CREAM_DARK}`, background: CREAM_LIGHT, color: CHARCOAL, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Copiar</button>
                              <button type="button" aria-expanded={notesOpen === r.id} onClick={() => openNotes(r)} style={{ padding: '7px 8px', borderRadius: 8, border: `1px solid ${notesOpen === r.id ? theme.accent : CREAM_DARK}`, background: notesOpen === r.id ? `${theme.accent}12` : CREAM_LIGHT, color: notesOpen === r.id ? theme.accent : CHARCOAL, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Notas</button>
                              <button
                                onClick={() => handleToggle(r.id, r.active)}
                                disabled={toggling === r.id}
                                aria-label={r.active ? 'Pausar carta' : 'Activar carta'}
                                title={r.active ? 'Pausar carta' : 'Activar carta'}
                                style={{ position: 'relative', width: 38, height: 22, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'background 0.2s', background: r.active ? theme.accent : CREAM_DARK, opacity: toggling === r.id ? 0.5 : 1 }}
                              ><span style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transform: r.active ? 'translateX(19px)' : 'translateX(3px)', transition: 'transform 0.2s' }} /></button>
                            </div>
                          </td>
                        </tr>
                        {notesOpen === r.id && <tr style={{ background: CREAM }}><td colSpan={8} style={{ padding: '16px 20px 20px' }}><label htmlFor={`notes-${r.id}`} style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Notas privadas · solo para administrador</label><textarea id={`notes-${r.id}`} value={noteDraft} maxLength={2000} onChange={e => setNoteDraft(e.target.value)} placeholder="Ej.: Pendiente de enviar propuesta, llamar el lunes…" style={{ width: '100%', minHeight: 82, resize: 'vertical', boxSizing: 'border-box', borderRadius: 10, border: `1px solid ${CREAM_DARK}`, padding: 12, color: CHARCOAL, font: '13px Plus Jakarta Sans, sans-serif', outline: 'none' }} /><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}><span style={{ fontSize: 11, color: CHARCOAL_L }}>{noteDraft.length}/2000</span><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => setNotesOpen(null)} style={{ border: `1px solid ${CREAM_DARK}`, background: CREAM_LIGHT, color: CHARCOAL, borderRadius: 8, padding: '8px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button><button type="button" disabled={savingNotes === r.id} onClick={() => saveNotes(r)} style={{ border: 'none', background: theme.accent, color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: savingNotes === r.id ? .6 : 1 }}>{savingNotes === r.id ? 'Guardando…' : 'Guardar nota'}</button></div></div></td></tr>}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          </div>
          </>
          )}

        </main>
      </div>

      {/* ── SETTINGS MODAL ── */}
      {settingsOpen && (
        <SettingsModal
          user={user}
          onClose={() => setSettingsOpen(false)}
          onSignOut={handleSignOut}
          theme={theme}
          onThemeChange={handleThemeChange}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .lg\\:grid-cols-4 { grid-template-columns: repeat(2, 1fr); }
        .lg\\:grid-cols-3 { grid-template-columns: 1fr; }
        @media (min-width: 1024px) {
          .lg\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
          .lg\\:grid-cols-3 { grid-template-columns: 2fr 1fr; }
        }
        @media (max-width: 780px) {
          .admin-bottom-grid { grid-template-columns: 1fr !important; }
          .admin-sidebar { width: 64px !important; padding: 20px 0 !important; align-items: center !important; }
          .admin-sidebar > div:first-child { width: 40px !important; padding: 0 !important; font-size: 0 !important; background: var(--menu-accent, #a03b13) !important; border-radius: 12px; justify-content: center !important; }
          .admin-sidebar > div:first-child::before { content: attr(data-mark); font-size: 15px; }
          .admin-sidebar > div:first-child span, .admin-sidebar button span { display: none !important; }
          .admin-sidebar .admin-project-switch { width: 40px !important; height: 44px !important; padding: 0 !important; justify-content: center !important; margin-bottom: 18px !important; }
          .admin-sidebar .admin-project-switch span { display: none !important; }
          .admin-sidebar nav { align-items: center !important; }
          .admin-sidebar nav button { width: 40px !important; padding: 0 !important; justify-content: center !important; }
          .admin-sidebar > div:last-child { align-items: center !important; }
          .admin-sidebar > div:last-child button { width: 40px !important; padding: 0 !important; justify-content: center !important; }
          .admin-main { margin-left: 64px !important; }
        }
      `}</style>
    </div>
  )
}
