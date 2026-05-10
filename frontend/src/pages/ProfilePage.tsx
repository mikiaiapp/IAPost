import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, ShieldCheck, QrCode, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function ProfilePage() {
  const [fullName, setFullName] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [setup2FA, setSetup2FA] = useState<{ secret: string; qr_code_base64: string } | null>(null)
  const [loading2FA, setLoading2FA] = useState(false)
  const [disableCode, setDisableCode] = useState('')

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/api/users/me')).data,
  })

  const updateMutation = useMutation({
    mutationFn: () => api.put('/api/users/me', { full_name: fullName }),
    onSuccess: () => { toast.success('Perfil actualizado'); refetch() },
    onError: () => toast.error('Error al actualizar'),
  })

  const start2FA = async () => {
    setLoading2FA(true)
    try {
      const { data } = await api.get('/api/auth/2fa/setup')
      setSetup2FA(data)
    } catch { toast.error('Error al configurar 2FA') }
    finally { setLoading2FA(false) }
  }

  const confirm2FA = async () => {
    if (!setup2FA) return
    setLoading2FA(true)
    try {
      await api.post('/api/auth/2fa/confirm', { totp_code: totpCode, secret: setup2FA.secret })
      toast.success('2FA activado correctamente')
      setSetup2FA(null)
      setTotpCode('')
      refetch()
    } catch { toast.error('Código incorrecto') }
    finally { setLoading2FA(false) }
  }

  const disable2FA = async () => {
    setLoading2FA(true)
    try {
      await api.post('/api/auth/2fa/disable', { totp_code: disableCode })
      toast.success('2FA desactivado')
      setDisableCode('')
      refetch()
    } catch { toast.error('Código incorrecto') }
    finally { setLoading2FA(false) }
  }

  if (isLoading) return <div className="glass-card p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-400" /></div>

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <User className="w-6 h-6 text-brand-400" /> Perfil
      </h1>

      {/* Profile info */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="section-title">Información personal</h2>
        <div>
          <label className="label">Username</label>
          <p className="text-slate-300 bg-surface-800 rounded-xl px-4 py-3 text-sm">@{profile?.username}</p>
        </div>
        <div>
          <label className="label">Email</label>
          <p className="text-slate-300 bg-surface-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            {profile?.email}
            {profile?.is_verified && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          </p>
        </div>
        <div>
          <label className="label">Nombre completo</label>
          <input
            type="text"
            className="input-field"
            placeholder={profile?.full_name || 'Tu nombre'}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => updateMutation.mutate()}
          disabled={!fullName || updateMutation.isPending}
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
        </button>
      </div>

      {/* 2FA */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="section-title"><ShieldCheck className="w-5 h-5 text-emerald-400" /> Autenticación en dos factores</h2>

        {profile?.totp_enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge-success">✅ 2FA activo</span>
              <span className="text-sm text-slate-400">Tu cuenta está protegida con Google Authenticator</span>
            </div>
            <div>
              <label className="label">Código para desactivar</label>
              <div className="flex gap-3">
                <input type="text" className="input-field font-mono text-center tracking-widest" maxLength={6}
                  placeholder="000000" value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))} />
                <button className="btn-danger px-4 whitespace-nowrap" onClick={disable2FA} disabled={disableCode.length !== 6 || loading2FA}>
                  {loading2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desactivar'}
                </button>
              </div>
            </div>
          </div>
        ) : !setup2FA ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Protege tu cuenta con Google Authenticator u otra app TOTP.</p>
            <button className="btn-primary flex items-center gap-2" onClick={start2FA} disabled={loading2FA}>
              {loading2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Activar 2FA
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-sm text-slate-300">1. Escanea este QR con Google Authenticator:</p>
            <div className="flex justify-center">
              <img src={`data:image/png;base64,${setup2FA.qr_code_base64}`} alt="QR 2FA"
                className="w-48 h-48 rounded-xl border-4 border-white/10 bg-white p-2" />
            </div>
            <div className="bg-surface-800 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Clave manual:</p>
              <p className="font-mono text-sm text-slate-300 break-all">{setup2FA.secret}</p>
            </div>
            <div>
              <label className="label">2. Introduce el código para confirmar</label>
              <div className="flex gap-3">
                <input type="text" className="input-field font-mono text-center text-xl tracking-widest"
                  maxLength={6} placeholder="000000" value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} autoFocus />
                <button className="btn-primary px-4" onClick={confirm2FA} disabled={totpCode.length !== 6 || loading2FA}>
                  {loading2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
            <button className="btn-secondary text-sm" onClick={() => setSetup2FA(null)}>Cancelar</button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
