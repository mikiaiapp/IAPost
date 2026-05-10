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
          <p className="text-slate-500 mt-2 font-medium">LinkedIn Intelligence Hub</p>
        </div>

        <div className="glass-card p-10 shadow-2xl shadow-slate-200/50 border-white/50">
          {!requires2FA ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h2>
                <p className="text-slate-500 text-sm">Ingresa tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="label text-slate-700">Email Corporativo</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="label text-slate-700 mb-0">Contraseña</label>
                    <Link to="/forgot-password" size="sm" className="text-xs text-brand-600 hover:text-brand-700 font-bold">
                      ¿Olvidaste la clave?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="input-field pr-12"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-600"
                    >
                      {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-creative w-full group py-5"
                  disabled={loading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Iniciar Sesión"}
                    {!loading && <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>&rarr;</motion.span>}
                  </span>
                </button>
              </form>

              <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                <p className="text-slate-500 text-sm">
                  ¿Aún no tienes cuenta?{' '}
                  <Link to="/register" className="text-brand-600 hover:text-brand-700 font-black decoration-brand-600/30 decoration-2 underline-offset-4 underline">
                    Regístrate gratis
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-10">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl shadow-emerald-100">
                  <ShieldCheck className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Verificación 2FA</h2>
                <p className="text-slate-500 text-sm mt-2">Introduce el código de 6 dígitos de tu app</p>
              </div>

              <form onSubmit={handle2FA} className="space-y-8">
                <input
                  type="text"
                  className="input-field text-center text-4xl tracking-[0.4em] font-black py-6 bg-slate-50 border-slate-100"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
                <div className="space-y-4">
                  <button type="submit" className="btn-creative w-full py-5" disabled={loading || totpCode.length !== 6}>
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verificar e Ingresar"}
                  </button>
                  <button type="button" className="w-full text-slate-400 font-bold text-sm py-2 hover:text-slate-600 transition-colors" onClick={() => setRequires2FA(false)}>
                    Cancelar y Volver
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
