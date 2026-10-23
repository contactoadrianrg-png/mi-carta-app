import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { requestPasswordReset } from '../lib/authActions'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, ArrowLeft, UtensilsCrossed } from 'lucide-react'
import './AuthPage.css'
import FeatureCarousel from '../components/auth/FeatureCarousel'

/* ── QR ilustración ─────────────────────────────────────────── */
function QRIllustration() {
  const dots = [
    [44,8],[52,8],[60,8],
    [44,16],[60,16],
    [48,24],[52,24],[60,24],
    [44,32],[52,32],
    [44,40],[48,40],[56,40],[60,40],
    // timing row
    [8,44],[16,44],[24,44],[32,44],[44,44],[52,44],[60,44],[68,44],[76,44],[84,44],[92,44],
    [8,52],[24,52],[32,52],[44,52],[52,52],[60,52],[76,52],[84,52],
    [8,60],[16,60],[32,60],[44,60],[52,60],[68,60],[76,60],[92,60],
    [8,68],[24,68],[44,68],[60,68],[68,68],[76,68],[84,68],
    [8,76],[16,76],[24,76],[32,76],[44,76],[52,76],[60,76],[84,76],[92,76],
    [8,84],[32,84],[44,84],[52,84],[68,84],[76,84],[84,84],
    [8,92],[16,92],[32,92],[44,92],[60,92],[68,92],[84,92],[92,92],
  ]
  return (
    <svg viewBox="0 0 108 108" width="96" height="96">
      <rect width="108" height="108" rx="10" fill="white"/>
      {/* Top-left finder */}
      <rect x="8" y="8" width="28" height="28" rx="4" fill="#1A1A1A"/>
      <rect x="12" y="12" width="20" height="20" rx="2" fill="white"/>
      <rect x="16" y="16" width="12" height="12" rx="1.5" fill="#1A1A1A"/>
      {/* Top-right finder */}
      <rect x="72" y="8" width="28" height="28" rx="4" fill="#1A1A1A"/>
      <rect x="76" y="12" width="20" height="20" rx="2" fill="white"/>
      <rect x="80" y="16" width="12" height="12" rx="1.5" fill="#1A1A1A"/>
      {/* Bottom-left finder */}
      <rect x="8" y="72" width="28" height="28" rx="4" fill="#1A1A1A"/>
      <rect x="12" y="76" width="20" height="20" rx="2" fill="white"/>
      <rect x="16" y="80" width="12" height="12" rx="1.5" fill="#1A1A1A"/>
      {/* Módulos de datos */}
      {dots.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="6" height="6" rx="1" fill="#1A1A1A"/>
      ))}
    </svg>
  )
}

/* ── Mockup SVG ─────────────────────────────────────────────── */
function PhoneMockupSVG({ className = '' }) {
  return (
    <svg viewBox="0 0 210 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={`drop-shadow-2xl w-full ${className}`}>
      <rect x="6" y="6" width="198" height="368" rx="30" fill="black" fillOpacity="0.07"/>
      <rect x="2" y="2" width="196" height="356" rx="28" fill="white" stroke="#E2E8F0" strokeWidth="1.5"/>
      <rect x="8" y="14" width="184" height="332" rx="22" fill="#FFF8F2"/>
      <rect x="76" y="10" width="48" height="9" rx="4.5" fill="#CBD5E1"/>
      {/* Header naranja */}
      <rect x="8" y="14" width="184" height="52" rx="22" fill="#FF6B35"/>
      <rect x="8" y="44" width="184" height="22" fill="#FF6B35"/>
      <text x="105" y="38" textAnchor="middle" fill="white" fontFamily="system-ui,sans-serif" fontSize="9" fontWeight="700">🍽️  Tu restaurante</text>
      <text x="105" y="52" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontFamily="system-ui,sans-serif" fontSize="7">Carta digital • messa.app</text>
      {/* Pills categorías */}
      <rect x="12" y="74" width="52" height="17" rx="8.5" fill="#FF6B35"/>
      <text x="38" y="86.5" textAnchor="middle" fill="white" fontFamily="system-ui,sans-serif" fontSize="7.5" fontWeight="600">Entrantes</text>
      <rect x="70" y="74" width="44" height="17" rx="8.5" fill="#FFEEE5" stroke="#FF6B35" strokeWidth="0.6"/>
      <text x="92" y="86.5" textAnchor="middle" fill="#FF6B35" fontFamily="system-ui,sans-serif" fontSize="7.5">Pastas</text>
      <rect x="120" y="74" width="40" height="17" rx="8.5" fill="#FFEEE5" stroke="#FF6B35" strokeWidth="0.6"/>
      <text x="140" y="86.5" textAnchor="middle" fill="#FF6B35" fontFamily="system-ui,sans-serif" fontSize="7.5">Postres</text>
      <rect x="166" y="74" width="26" height="17" rx="8.5" fill="#FFEEE5" stroke="#FF6B35" strokeWidth="0.6"/>
      <text x="179" y="86.5" textAnchor="middle" fill="#FF6B35" fontFamily="system-ui,sans-serif" fontSize="7.5">+2</text>
      {/* Tarjeta 1 */}
      <rect x="12" y="100" width="86" height="88" rx="13" fill="white" stroke="#F1F5F9" strokeWidth="1"/>
      <rect x="12" y="100" width="86" height="52" rx="13" fill="#FFE8D9"/>
      <rect x="12" y="138" width="86" height="14" fill="#FFE8D9"/>
      <text x="55" y="128" textAnchor="middle" fontSize="22">🥗</text>
      <text x="55" y="151" textAnchor="middle" fill="#1A1A1A" fontFamily="system-ui,sans-serif" fontSize="8" fontWeight="600">Bruschetta</text>
      <text x="55" y="163" textAnchor="middle" fill="#FF6B35" fontFamily="system-ui,sans-serif" fontSize="9" fontWeight="700">6.50€</text>
      <text x="55" y="175" textAnchor="middle" fill="#9CA3AF" fontFamily="system-ui,sans-serif" fontSize="6.5">Tomate, albahaca</text>
      {/* Tarjeta 2 */}
      <rect x="106" y="100" width="86" height="88" rx="13" fill="white" stroke="#F1F5F9" strokeWidth="1"/>
      <rect x="106" y="100" width="86" height="52" rx="13" fill="#FFE8D9"/>
      <rect x="106" y="138" width="86" height="14" fill="#FFE8D9"/>
      <text x="149" y="128" textAnchor="middle" fontSize="22">🍝</text>
      <text x="149" y="151" textAnchor="middle" fill="#1A1A1A" fontFamily="system-ui,sans-serif" fontSize="8" fontWeight="600">Carbonara</text>
      <text x="149" y="163" textAnchor="middle" fill="#FF6B35" fontFamily="system-ui,sans-serif" fontSize="9" fontWeight="700">12.90€</text>
      <text x="149" y="175" textAnchor="middle" fill="#9CA3AF" fontFamily="system-ui,sans-serif" fontSize="6.5">Pasta, huevo</text>
      {/* Tarjeta 3 */}
      <rect x="12" y="196" width="86" height="88" rx="13" fill="white" stroke="#F1F5F9" strokeWidth="1"/>
      <rect x="12" y="196" width="86" height="52" rx="13" fill="#FFE8D9"/>
      <rect x="12" y="234" width="86" height="14" fill="#FFE8D9"/>
      <text x="55" y="224" textAnchor="middle" fontSize="22">🍕</text>
      <text x="55" y="247" textAnchor="middle" fill="#1A1A1A" fontFamily="system-ui,sans-serif" fontSize="8" fontWeight="600">Margherita</text>
      <text x="55" y="259" textAnchor="middle" fill="#FF6B35" fontFamily="system-ui,sans-serif" fontSize="9" fontWeight="700">10.50€</text>
      <text x="55" y="271" textAnchor="middle" fill="#9CA3AF" fontFamily="system-ui,sans-serif" fontSize="6.5">Tomate, mozzarella</text>
      {/* Tarjeta 4 */}
      <rect x="106" y="196" width="86" height="88" rx="13" fill="white" stroke="#F1F5F9" strokeWidth="1"/>
      <rect x="106" y="196" width="86" height="52" rx="13" fill="#FFE8D9"/>
      <rect x="106" y="234" width="86" height="14" fill="#FFE8D9"/>
      <text x="149" y="224" textAnchor="middle" fontSize="22">🍮</text>
      <text x="149" y="247" textAnchor="middle" fill="#1A1A1A" fontFamily="system-ui,sans-serif" fontSize="8" fontWeight="600">Tiramisú</text>
      <text x="149" y="259" textAnchor="middle" fill="#FF6B35" fontFamily="system-ui,sans-serif" fontSize="9" fontWeight="700">5.90€</text>
      <text x="149" y="271" textAnchor="middle" fill="#9CA3AF" fontFamily="system-ui,sans-serif" fontSize="6.5">Mascarpone</text>
      {/* Barra inferior */}
      <rect x="12" y="296" width="180" height="32" rx="10" fill="#FF6B35"/>
      <text x="28" y="316" fill="white" fontFamily="system-ui,sans-serif" fontSize="8" fontWeight="600">Bruschetta · 6,50€</text>
      <rect x="152" y="303" width="34" height="18" rx="6" fill="rgba(255,255,255,0.25)"/>
      <text x="169" y="315" textAnchor="middle" fill="white" fontFamily="system-ui,sans-serif" fontSize="7" fontWeight="700">Ver →</text>
      <rect x="84" y="346" width="42" height="4" rx="2" fill="#E2E8F0"/>
    </svg>
  )
}

/* ── Página principal ───────────────────────────────────────── */
export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()

  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)

  // La pestaña sigue a la ruta: /register abre registro y /login abre acceso.
  // Solo reacciona al cambio de pathname, así que no interfiere con el modo
  // "olvidé mi contraseña", que no navega.
  useEffect(() => {
    setMode(location.pathname === '/register' ? 'register' : 'login')
    setForgotSent(false)
  }, [location.pathname])

  const switchMode = (m) => {
    setMode(m)
    setForgotSent(false)
    navigate(m === 'login' ? '/login' : '/register', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'register') {
        const data = await signUp(email, password)
        if (!data?.session) {
          toast.success('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.')
          setMode('login')
          setLoading(false)
          return
        }
        toast.success('¡Bienvenido a Messa!')
      } else if (mode === 'forgot') {
        await requestPasswordReset(supabase.auth, email, window.location.origin)
        setForgotSent(true)
      }
    } catch (err) {
      toast.error(err.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const isForgot = mode === 'forgot'

  if (mode === 'register') {
    return <main className="messa-register">
      <header className="messa-register-header">
        <Link to="/" className="messa-register-brand" aria-label="MESSA, inicio">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>MESSA</span>
        </Link>

      </header>
      <section className="messa-register-content" aria-labelledby="register-title">
        {registrationOpen ? <>
        <button type="button" className="messa-register-back" onClick={() => setRegistrationOpen(false)}><ArrowLeft size={18} aria-hidden="true" /> Volver</button>
        <h1 id="register-title">Crea tu cuenta.</h1>
        <p className="messa-register-intro">El primer paso para crear la carta de tu restaurante.</p>
        <form onSubmit={handleSubmit} className="messa-register-form" aria-busy={loading}>
          <div className="messa-register-field">
            <label htmlFor="register-email">Correo electrónico</label>
            <input id="register-email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={event => setEmail(event.target.value)} required />
          </div>
          <div className="messa-register-field">
            <label htmlFor="register-password">Contraseña</label>
            <div className="messa-register-password">
              <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={6} aria-describedby="register-password-hint" required />
              <button type="button" className="messa-register-visibility" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
            <p id="register-password-hint" className="messa-register-hint">Mínimo 6 caracteres.</p>
          </div>
          <button className="messa-register-submit" type="submit" disabled={loading}>{loading ? 'Creando cuenta…' : 'Crear cuenta gratis'}</button>
        </form>
        <p className="messa-register-existing">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        </> : <div className="messa-register-welcome">
          <h1 id="register-title">Tu local,<br />siempre al día.</h1>
          <p className="messa-register-intro">Tu carta, tus promociones y tus enlaces en un solo lugar.</p>
          <FeatureCarousel />
          <div className="messa-register-options">
            <button type="button" className="messa-register-submit" onClick={() => setRegistrationOpen(true)}>Crear cuenta gratis</button>
            <Link className="messa-register-demo" to="/carta/comeycalla-mp3s28ri/menu">Ver demo</Link>
          </div>
          <p className="messa-register-existing"><Link to="/login">Ya tengo una cuenta</Link></p>
        </div>}
      </section>
    </main>
  }

  return (
    <div style={{ backgroundColor: '#FFF8F2', minHeight: '100vh' }}>

      {/* ── Contenedor principal ── */}
      <div className="max-w-6xl mx-auto px-5 lg:px-12 pt-8 lg:pt-14 pb-0">

        {/* ══ HERO: 2 columnas desktop / 1 columna móvil ══ */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-center mb-10 lg:mb-14">

          {/* ── Columna izquierda ── */}
          <div className="relative -mx-5 lg:mx-0 overflow-hidden lg:overflow-visible">

            {/* Fondo fotográfico — solo móvil.
                Banda inferior de 85vw: a ancho completo la foto cae justo por los cuencos,
                que ocupan el 43 % inferior del original (941×1672). */}
            <img
              src="/hero-mobile.webp"
              alt=""
              aria-hidden="true"
              className="lg:hidden pointer-events-none absolute inset-x-0 bottom-0 w-full h-[85vw] object-cover object-[center_bottom]"
            />

            {/* Fundido crema sobre el borde superior de la foto, para que no se vea el corte */}
            <div
              className="lg:hidden pointer-events-none absolute inset-x-0 bottom-0 h-[85vw]"
              style={{ background: 'linear-gradient(to bottom, #FFF8F2 0%, rgba(255,248,242,0) 24%)' }}
              aria-hidden="true"
            />

            <div className="relative px-5 pt-2 pb-[calc(85vw+28px)] text-center lg:px-0 lg:pt-0 lg:pb-0 lg:text-left">
            {/* Logo */}
            <div className="flex items-center justify-center lg:justify-start gap-2.5 mb-7">
              <div className="w-10 h-10 bg-[#FF6B35] rounded-xl flex items-center justify-center shadow-md shadow-[#FF6B35]/30">
                <UtensilsCrossed size={20} className="text-white" />
              </div>
              <span className="font-bold text-[#1A1A1A] text-xl tracking-tight">Messa</span>
            </div>

            {/* Título */}
            <h1 className="text-[32px] sm:text-[36px] lg:text-[48px] font-bold text-[#1A1A1A] leading-[1.15] tracking-tight mb-4">
              Tu local,<br />
              <span className="text-[#FF6B35]">siempre al día.</span>
            </h1>

            {/* Subtítulo */}
            <p className="text-gray-500 text-[16px] lg:text-[18px] leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Muestra tus platos, actualiza precios y comparte la carta con un QR.
              Tus clientes la consultan desde su móvil, sin descargar aplicaciones.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3">
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-[15px] font-semibold text-[#1A1A1A] bg-white border border-gray-200 hover:border-[#FF6B35]/40 hover:text-[#FF6B35] shadow-sm transition-colors"
              >
                Ver carta de ejemplo
              </a>
              <button
                type="button"
                onClick={() => {
                  switchMode('register')
                  document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-[15px] font-semibold text-white bg-[#FF6B35] hover:bg-[#F25C25] shadow-lg shadow-[#FF6B35]/30 transition-colors"
              >
                Crear mi carta
                <ArrowRight size={17} />
              </button>
            </div>

            {/* Pie */}
            <p className="text-xs text-gray-500 mt-5">
              Sin instalar nada · Actualiza cuando quieras · Comparte por QR
            </p>
            </div>
          </div>

          {/* ── Columna derecha — solo desktop ── */}
          <div className="hidden lg:flex items-center justify-center relative">
            {/* Blob decorativo */}
            <div
              className="absolute rounded-full"
              style={{ width: 340, height: 340, background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)' }}
            />

            {/* Teléfono */}
            <div className="relative z-10" style={{ width: 230 }}>
              <PhoneMockupSVG />
            </div>

            {/* Tarjeta QR flotante */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-20">
              <QRIllustration />
              <p className="text-[10px] text-gray-400 text-center mt-2 leading-tight">
                Escanea para<br />ver la carta
              </p>
              <p className="text-xs text-[#FF6B35] font-bold text-center mt-1">messa.app</p>
            </div>
          </div>
        </div>

        {/* Ancla de scroll del CTA "Crear mi carta" */}
        <div id="registro" className="scroll-mt-6" />

        {/* ══ FORMULARIO — debajo de las 2 columnas ══ */}
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl shadow-black/8 p-6 mb-6">

          {/* Tabs */}
          {!isForgot && (
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
              {[
                { id: 'login', label: 'Iniciar sesión' },
                { id: 'register', label: 'Registrarse' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => switchMode(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    mode === id ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <User size={13} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Cabecera forgot */}
          {isForgot && (
            <div className="mb-5">
              <button
                onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
              >
                <ArrowLeft size={15} /> Volver
              </button>
              <h2 className="text-lg font-bold text-[#1A1A1A]">¿Olvidaste tu contraseña?</h2>
              <p className="text-sm text-gray-400 mt-1">Te enviaremos un enlace para restablecerla.</p>
            </div>
          )}

          {/* Email enviado */}
          {forgotSent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <p className="font-semibold text-[#1A1A1A]">Email enviado</p>
              <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                Revisa tu bandeja de entrada para restablecer tu contraseña.
              </p>
              <button onClick={() => switchMode('login')} className="mt-5 text-[#FF6B35] text-sm font-medium hover:underline">
                Volver al login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full pl-10 pr-4 h-[50px] rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/40 focus:border-[#FF6B35] focus:bg-white transition-all text-sm"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Contraseña */}
              {!isForgot && (
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-11 h-[50px] rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/40 focus:border-[#FF6B35] focus:bg-white transition-all text-sm"
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Recuérdame + olvidé contraseña */}
              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setRememberMe(v => !v)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        rememberMe ? 'bg-[#FF6B35] border-[#FF6B35]' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {rememberMe && (
                        <svg viewBox="0 0 10 8" width="10" height="8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">Recuérdame</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setForgotSent(false) }}
                    className="text-sm text-[#FF6B35] font-medium hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {/* Botón principal */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e55a24] active:bg-[#cc4f1e] text-white font-bold h-[52px] rounded-xl transition-colors disabled:opacity-60 shadow-lg shadow-[#FF6B35]/25 text-base mt-1"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta gratis' : 'Enviar enlace'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {mode === 'register' && (
                <p className="text-xs text-gray-400 text-center mt-1">
                  Al registrarte aceptas los términos de uso.
                </p>
              )}
            </form>
          )}
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-gray-400 pb-8">
          Sin permanencia · Cancela cuando quieras · Soporte cercano
        </p>
      </div>

      {/* ── Mockup asomando desde abajo — solo móvil ── */}
      <div className="lg:hidden overflow-hidden" style={{ height: 240 }}>
        <div style={{ width: 270, margin: '0 auto' }}>
          <PhoneMockupSVG />
        </div>
      </div>
    </div>
  )
}
