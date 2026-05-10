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
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 items-center justify-center mb-4 shadow-xl shadow-brand-600/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">IAPost</h1>
          <p className="text-slate-400 mt-1">LinkedIn Content Generator</p>
        </div>

        <div className="glass-card p-8">
          {!requires2FA ? (
            <>
              <h2 className="text-xl font-semibold text-slate-100 mb-6">Iniciar sesión</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="input-field pr-12"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Iniciar sesión
                </button>
              </form>
              <p className="text-center text-slate-400 text-sm mt-6">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                  Regístrate
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <ShieldCheck className="w-12 h-12 text-brand-400 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-slate-100">Verificación 2FA</h2>
                <p className="text-slate-400 text-sm mt-1">Introduce el código de Google Authenticator</p>
              </div>
              <form onSubmit={handle2FA} className="space-y-4">
                <input
                  type="text"
                  className="input-field text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading || totpCode.length !== 6}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Verificar
                </button>
                <button type="button" className="btn-secondary w-full" onClick={() => setRequires2FA(false)}>
                  Volver
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
