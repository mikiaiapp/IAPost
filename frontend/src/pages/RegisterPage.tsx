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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs for visual impact */}
      <div className="bg-glow">
        <div className="blob blob-blue" />
        <div className="blob blob-purple" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-indigo-600 items-center justify-center mb-6 shadow-2xl shadow-brand-500/40 relative"
          >
            <Zap className="w-10 h-10 text-white fill-white/10" />
            <div className="absolute inset-0 rounded-3xl bg-white/20 blur-xl -z-10 animate-pulse" />
          </motion.div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
            IAPost
          </h1>
          <p className="text-slate-400 mt-2 font-medium tracking-wide uppercase text-xs opacity-70">
            Join the Intelligent Network
          </p>
        </div>

        <div className="glass-card p-8 backdrop-blur-2xl border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Nueva Cuenta</h2>
            <p className="text-slate-400 text-sm">Empieza a automatizar tu presencia en LinkedIn</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="label text-xs uppercase tracking-widest opacity-60">Nombre completo</label>
              <input 
                type="text" 
                className="input-field bg-white/5 border-white/5 focus:bg-white/10" 
                placeholder="Nombre Apellido" 
                value={form.full_name} 
                onChange={set('full_name')} 
              />
            </div>
            <div className="space-y-1">
              <label className="label text-xs uppercase tracking-widest opacity-60">Nombre de usuario</label>
              <input 
                type="text" 
                className="input-field bg-white/5 border-white/5 focus:bg-white/10" 
                placeholder="usuario123" 
                value={form.username} 
                onChange={set('username')} 
                required 
                minLength={3} 
              />
            </div>
            <div className="space-y-1">
              <label className="label text-xs uppercase tracking-widest opacity-60">Email corporativo</label>
              <input 
                type="email" 
                className="input-field bg-white/5 border-white/5 focus:bg-white/10" 
                placeholder="tu@email.com" 
                value={form.email} 
                onChange={set('email')} 
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="label text-xs uppercase tracking-widest opacity-60">Contraseña</label>
              <input 
                type="password" 
                className="input-field bg-white/5 border-white/5 focus:bg-white/10" 
                placeholder="Mínimo 8 caracteres" 
                value={form.password} 
                onChange={set('password')} 
                required 
                minLength={8} 
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary w-full py-4 mt-4 shadow-xl shadow-brand-600/30 group relative overflow-hidden" 
              disabled={loading}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Crear cuenta
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-slate-500 text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-white hover:text-brand-400 font-bold transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-[10px] uppercase tracking-[0.2em] mt-10">
          Secure Registration &bull; IAPost Engine
        </p>
      </motion.div>
    </div>
  )
}
