import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogOut, KeyRound, Mail, BadgeCheck } from 'lucide-react'

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
    <div className="max-w-2xl space-y-4">
      {/* Info de cuenta */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Mi cuenta</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-amber-700 font-bold text-lg">
                {(user?.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">Miembro desde {joinDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-xl">
            <BadgeCheck size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Plan Gratuito</p>
              <p className="text-xs text-amber-600 mt-0.5">Acceso completo a todas las funcionalidades básicas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <KeyRound size={17} className="text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPassword || !newPassword}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-amber-100"
          >
            {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      {/* Cambiar email */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Mail size={17} className="text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Cambiar email</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5 ml-7">Recibirás un email de confirmación en la nueva dirección.</p>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nuevo email</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="nuevo@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={savingEmail || !newEmail.trim()}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-amber-100"
          >
            {savingEmail ? 'Enviando...' : 'Cambiar email'}
          </button>
        </form>
      </div>

      {/* Cerrar sesión */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-md shadow-red-100 w-full justify-center"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
