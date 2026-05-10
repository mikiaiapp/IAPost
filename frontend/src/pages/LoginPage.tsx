import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [tempToken, setTempToken] = useState('')
  const [userId, setUserId] = useState<number>(0)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const form = new FormData()
      form.append('username', email)
      form.append('password', password)
      const { data } = await api.post('/api/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (data.requires_2fa) {
        setTempToken(data.access_token)
        setUserId(data.user_id)
        setRequires2FA(true)
        toast('Introduce tu código 2FA', { icon: '🔐' })
      } else {
        setAuth(data.access_token, { id: data.user_id, username: data.username, email, is_verified: data.is_verified })
        toast.success(`¡Bienvenido, ${data.username}!`)
        navigate('/')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/verify-2fa', {
        user_id: userId,
        totp_code: totpCode,
        temp_token: tempToken,
      })
      setAuth(data.access_token, { id: data.user_id, username: data.username, email, is_verified: data.is_verified })
      toast.success('Autenticación completada')
      navigate('/')
    } catch {
      toast.error('Código 2FA incorrecto')
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
            Intelligent Content Architecture
          </p>
        </div>

        <div className="glass-card p-8 backdrop-blur-2xl border-white/10 shadow-2xl relative overflow-hidden group">
          {/* Subtle light effect on hover */}
          <div className="absolute -inset-full h-[200%] w-[200%] rotate-45 bg-gradient-to-r from-transparent via-white/5 to-transparent transition-all duration-1000 group-hover:translate-x-full" />

          {!requires2FA ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white">Bienvenido</h2>
                <p className="text-slate-400 text-sm">Inicia sesión para gestionar tus publicaciones</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="label text-xs uppercase tracking-widest opacity-60">Correo Electrónico</label>
                  <div className="relative">
                    <input
                      type="email"
                      className="input-field bg-white/5 border-white/5 focus:bg-white/10"
                      placeholder="nombre@ejemplo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="label text-xs uppercase tracking-widest opacity-60">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="input-field bg-white/5 border-white/5 focus:bg-white/10 pr-12"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link to="/forgot-password" size="sm" className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">
                    ¿Olvidaste la contraseña?
                  </Link>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary w-full py-4 text-lg shadow-xl shadow-brand-600/30 group relative overflow-hidden"
                  disabled={loading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar al Sistema"}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <p className="text-slate-500 text-sm">
                  ¿No tienes una cuenta?{' '}
                  <Link to="/register" className="text-white hover:text-brand-400 font-bold transition-colors">
                    Crea una ahora
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
                  <ShieldCheck className="w-8 h-8 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Seguridad Activa</h2>
                <p className="text-slate-400 text-sm mt-1">Introduce el código de tu autenticador</p>
              </div>

              <form onSubmit={handle2FA} className="space-y-6">
                <input
                  type="text"
                  className="input-field text-center text-3xl tracking-[0.5em] font-mono py-5 bg-brand-500/5 border-brand-500/20 focus:border-brand-500/50"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
                <div className="space-y-3">
                  <button type="submit" className="btn-primary w-full py-4 shadow-xl shadow-brand-600/30" disabled={loading || totpCode.length !== 6}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar Identidad"}
                  </button>
                  <button type="button" className="btn-secondary w-full py-4 opacity-70 hover:opacity-100" onClick={() => setRequires2FA(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-600 text-[10px] uppercase tracking-[0.2em] mt-10">
          IAPost Platform &copy; 2026 &bull; Secure Environment
        </p>
      </motion.div>
    </div>
  )
}
