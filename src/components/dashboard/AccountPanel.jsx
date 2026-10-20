import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogOut, KeyRound, Mail, BadgeCheck, UserRound, ChevronRight } from 'lucide-react'

export default function AccountPanel() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) { toast.error(error.message); return }
    toast.success('Contraseña actualizada')
    setNewPassword('')
  }

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setSavingEmail(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setSavingEmail(false)
    if (error) { toast.error(error.message); return }
    toast.success('Te hemos enviado un email de confirmación a la nueva dirección')
    setNewEmail('')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <section className="md-account">
      <header className="md-account-intro"><p>MI PERFIL</p><h2>Tu cuenta Messa</h2><span>Gestiona tus datos y la seguridad de tu acceso.</span></header>
      <div className="md-account-card md-account-identity">
        <span className="md-account-avatar">{(user?.email || '?')[0].toUpperCase()}</span>
        <div><strong>{user?.email}</strong><span>Miembro desde {joinDate}</span></div>
        <UserRound className="md-account-identity-icon" size={20} />
      </div>
      <div className="md-account-plan"><BadgeCheck size={21} /><div><strong>Plan Gratuito</strong><span>Todo lo esencial para tener tu carta online.</span></div><ChevronRight size={20} /></div>

      <section className="md-account-card md-account-section">
        <div className="md-account-heading"><span><KeyRound size={20} /></span><div><h3>Contraseña</h3><p>Protege el acceso a tu panel.</p></div></div>
        <form onSubmit={handleChangePassword} className="md-account-form">
          <label>Nueva contraseña<div className="md-account-input"><input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
          <button type="submit" disabled={savingPassword || !newPassword} className="md-account-submit">{savingPassword ? 'Guardando...' : 'Actualizar contraseña'}</button>
        </form>
      </section>

      <section className="md-account-card md-account-section">
        <div className="md-account-heading"><span><Mail size={20} /></span><div><h3>Email</h3><p>Te enviaremos un correo de confirmación.</p></div></div>
        <form onSubmit={handleChangeEmail} className="md-account-form">
          <label>Nuevo email<input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" placeholder="nuevo@email.com" autoComplete="email" /></label>
          <button type="submit" disabled={savingEmail || !newEmail.trim()} className="md-account-submit">{savingEmail ? 'Enviando...' : 'Cambiar email'}</button>
        </form>
      </section>

      <button type="button" onClick={handleSignOut} className="md-account-logout"><LogOut size={18} />Cerrar sesión</button>
    </section>
  )
}
