import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/register', form)
      toast.success('Cuenta creada. Revisa tu email para verificarla.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 items-center justify-center mb-4 shadow-xl shadow-brand-600/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">IAPost</h1>
          <p className="text-slate-400 mt-1">Crea tu cuenta gratuita</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Registrarse</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre completo (opcional)</label>
              <input type="text" className="input-field" placeholder="Nombre Apellido" value={form.full_name} onChange={set('full_name')} />
            </div>
            <div>
              <label className="label">Nombre de usuario</label>
              <input type="text" className="input-field" placeholder="usuario123" value={form.username} onChange={set('username')} required minLength={3} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" placeholder="tu@email.com" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input type="password" className="input-field" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} required minLength={8} />
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear cuenta
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Iniciar sesión</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
