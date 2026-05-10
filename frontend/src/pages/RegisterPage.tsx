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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white">
      {/* Soft background decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-50 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-slate-900 items-center justify-center mb-6 shadow-2xl shadow-slate-200">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">IAPost</h1>
          <p className="text-slate-500 mt-2 font-medium tracking-wide uppercase text-xs">Join the Network</p>
        </div>

        <div className="glass-card p-10 shadow-2xl shadow-slate-200/50 border-white/50">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Crear Cuenta</h2>
            <p className="text-slate-500 text-sm">Empieza tu viaje con inteligencia artificial</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="label text-slate-700">Nombre Completo</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Miki Fernandez" 
                value={form.full_name} 
                onChange={set('full_name')} 
              />
            </div>
            <div className="space-y-1">
              <label className="label text-slate-700">Nombre de Usuario</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="miki_ai" 
                value={form.username} 
                onChange={set('username')} 
                required 
                minLength={3} 
              />
            </div>
            <div className="space-y-1">
              <label className="label text-slate-700">Email Profesional</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="tu@empresa.com" 
                value={form.email} 
                onChange={set('email')} 
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="label text-slate-700">Contraseña</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={form.password} 
                onChange={set('password')} 
                required 
                minLength={8} 
              />
            </div>

            <button 
              type="submit" 
              className="btn-creative w-full py-5 mt-6" 
              disabled={loading}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-6 h-6 animate-spin" />}
                Registrarme Ahora
              </span>
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-black underline decoration-brand-600/30 underline-offset-4">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
