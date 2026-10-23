import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { requestPasswordReset } from '../lib/authActions'
import toast from 'react-hot-toast'
import FeatureCarousel from '../components/auth/FeatureCarousel'
import './AuthPage.css'

export default function AuthPage() {
  const location = useLocation()
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState(location.state?.authMode || 'welcome')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [sent, setSent] = useState(null)

  useEffect(() => {
    setMode(location.state?.authMode || 'welcome')
    setSent(null)
    setPassword('')
    setShowPassword(false)
  }, [location.key, location.state?.authMode])

  function showWelcome() {
    setMode('welcome')
    setSent(null)
    setPassword('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'register') {
        const data = await signUp(email, password)
        if (!data?.session) {
          setSent('register')
          setPassword('')
        } else {
          toast.success('¡Bienvenido a Messa!')
        }
      } else if (mode === 'forgot') {
        await requestPasswordReset(supabase.auth, email, window.location.origin)
        setSent('forgot')
      }
    } catch (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message)
    } finally {
      setLoading(false)
    }
  }

  const isWelcome = mode === 'welcome'
  const isForgot = mode === 'forgot'
  const isRegister = mode === 'register'

  return <main className="messa-register">
    <header className="messa-register-header">
      <Link to="/" className="messa-register-brand" aria-label="MESSA, inicio" onClick={showWelcome}>
        <img src="/messa-mark.svg" alt="" width="42" height="34" /><span>Messa</span>
      </Link>
    </header>
    <section className="messa-register-content" aria-labelledby="auth-title">
      {isWelcome ? <div className="messa-register-welcome">
        <h1 id="auth-title">Tu local,<br />siempre al día.</h1>
        <p className="messa-register-intro">Crea tu carta digital, destaca promociones y compártelo todo con un solo enlace.</p>
        <FeatureCarousel />
        <div className="messa-register-options">
          <button type="button" className="messa-register-submit" onClick={() => setMode('register')}>Crear cuenta gratis</button>
          <Link className="messa-register-demo" to="/carta/comeycalla-mp3s28ri/menu">Ver demo</Link>
        </div>
        <p className="messa-register-existing"><button type="button" onClick={() => setMode('login')}>Ya tengo una cuenta</button></p>
      </div> : sent ? <div role="status">
        <h1 id="auth-title">Revisa tu correo.</h1>
        <p className="messa-register-intro">{sent === 'register' ? 'Te hemos enviado un enlace para confirmar tu cuenta. Después podrás iniciar sesión.' : 'Te hemos enviado un enlace para restablecer tu contraseña.'}</p>
        {sent === 'register' ? <button type="button" className="messa-register-demo" onClick={() => { setSent(null); setMode('login') }}>Ir a iniciar sesión</button> : <button type="button" className="messa-register-submit" onClick={() => { setSent(null); setMode('login') }}>Volver a iniciar sesión</button>}
      </div> : <>
        <button type="button" className="messa-register-back" onClick={isForgot ? () => setMode('login') : showWelcome}><ArrowLeft size={18} aria-hidden="true" /> Volver</button>
        <h1 id="auth-title">{isRegister ? 'Crea tu cuenta.' : isForgot ? 'Recupera tu acceso.' : 'Bienvenido de nuevo.'}</h1>
        <p className="messa-register-intro">{isRegister ? 'El primer paso para crear la carta de tu restaurante.' : isForgot ? 'Te enviaremos un enlace para restablecer tu contraseña.' : 'Entra para gestionar tu restaurante.'}</p>
        <form onSubmit={handleSubmit} className="messa-register-form" aria-busy={loading}>
          <div className="messa-register-field">
            <label htmlFor="auth-email">Correo electrónico</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={event => setEmail(event.target.value)} required />
          </div>
          {!isForgot && <div className="messa-register-field">
            <label htmlFor="auth-password">Contraseña</label>
            <div className="messa-register-password">
              <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} minLength={isRegister ? 6 : undefined} aria-describedby={isRegister ? 'auth-password-hint' : undefined} required />
              <button type="button" className="messa-register-visibility" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}</button>
            </div>
            {isRegister && <p id="auth-password-hint" className="messa-register-hint">Mínimo 6 caracteres.</p>}
          </div>}
          {mode === 'login' && <button type="button" className="messa-register-forgot" onClick={() => setMode('forgot')}>¿Olvidaste tu contraseña?</button>}
          <button className="messa-register-submit" type="submit" disabled={loading}>{loading ? 'Un momento…' : isRegister ? 'Crear cuenta gratis' : isForgot ? 'Enviar enlace' : 'Iniciar sesión'}</button>
        </form>
        {isRegister && <p className="messa-register-existing">¿Ya tienes cuenta? <button type="button" onClick={() => setMode('login')}>Inicia sesión</button></p>}
        {mode === 'login' && <p className="messa-register-existing">¿Aún no tienes cuenta? <button type="button" onClick={() => setMode('register')}>Crear cuenta gratis</button></p>}
      </>}
    </section>
  </main>
}
