import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import logo from '../assets/logo.png'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (password.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Contraseña actualizada correctamente')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message || 'No se ha podido actualizar la contraseña. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Messa" className="rounded-2xl shadow-lg mx-auto mb-3" style={{ height: 80, width: 'auto' }} />
          <h1 className="text-3xl font-bold text-gray-900">Messa</h1>
          <p className="text-gray-500 mt-1">Tu carta digital en segundos</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Nueva contraseña</h2>
          <p className="text-sm text-gray-400 mb-6">Elige una nueva contraseña para tu cuenta.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar contraseña</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 mt-2 shadow-md shadow-amber-200"
            >
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
