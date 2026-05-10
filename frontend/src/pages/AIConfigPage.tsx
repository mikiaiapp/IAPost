import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Cpu, Key, CheckCircle, XCircle, Loader2, FlaskConical,
  ChevronDown, Plus, Trash2, Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    color: 'from-blue-600 to-cyan-500',
    description: 'Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash',
    placeholder: 'AIza...',
    docs: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'groq',
    name: 'Groq',
    color: 'from-orange-500 to-rose-500',
    description: 'LLaMA 3.3 70B, Mixtral, Gemma',
    placeholder: 'gsk_...',
    docs: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    color: 'from-violet-600 to-purple-500',
    description: 'Acceso a 100+ modelos (Claude, GPT-4, etc.)',
    placeholder: 'sk-or-...',
    docs: 'https://openrouter.ai/keys',
  },
]

export default function AIConfigPage() {
  const qc = useQueryClient()
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [models, setModels] = useState<Record<string, any[]>>({})
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({})
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  const { data: savedKeys = [] } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: async () => (await api.get('/api/ai/keys')).data,
  })

  const saveMutation = useMutation({
    mutationFn: ({ provider, api_key }: { provider: string; api_key: string }) =>
      api.post('/api/ai/keys', { provider, api_key }),
    onSuccess: (_, { provider }) => {
      toast.success(`Clave de ${provider} guardada`)
      qc.invalidateQueries({ queryKey: ['ai-keys'] })
      setApiKeys(k => ({ ...k, [provider]: '' }))
    },
    onError: () => toast.error('Error al guardar la clave'),
  })

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => api.delete(`/api/ai/keys/${provider}`),
    onSuccess: () => {
      toast.success('Clave eliminada')
      qc.invalidateQueries({ queryKey: ['ai-keys'] })
    },
  })

  const setPreferredModel = useMutation({
    mutationFn: ({ provider, model_id }: { provider: string; model_id: string }) =>
      api.put(`/api/ai/keys/${provider}/preferred-model`, null, { params: { model_id } }),
    onSuccess: () => {
      toast.success('Modelo preferido guardado')
      qc.invalidateQueries({ queryKey: ['ai-keys'] })
    },
  })

  const testProvider = async (provider: string) => {
    setTestingProvider(provider)
    try {
      const { data } = await api.post(`/api/ai/keys/${provider}/test`)
      if (data.is_valid) toast.success(data.message)
      else toast.error(data.message)
      qc.invalidateQueries({ queryKey: ['ai-keys'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al probar la clave')
    } finally {
      setTestingProvider(null)
    }
  }

  const loadModels = async (provider: string) => {
    setLoadingModels(l => ({ ...l, [provider]: true }))
    try {
      const { data } = await api.get(`/api/ai/models/${provider}`)
      setModels(m => ({ ...m, [provider]: data.models }))
    } catch {
      toast.error('Error al cargar modelos')
    } finally {
      setLoadingModels(l => ({ ...l, [provider]: false }))
    }
  }

  const getKeyStatus = (provider: string) => savedKeys.find((k: any) => k.provider === provider)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-6 h-6 text-brand-400" />
          Configuración de IA
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Tus claves API están cifradas con Fernet y nunca se envían a terceros
        </p>
      </div>

      <div className="grid gap-4">
        {PROVIDERS.map(provider => {
          const keyStatus = getKeyStatus(provider.id)
          const isExpanded = expandedProvider === provider.id
          const providerModels = models[provider.id] || []

          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-5 flex items-center gap-4 cursor-pointer hover:bg-white/3 transition-colors"
                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shrink-0`}>
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-100">{provider.name}</h3>
                    {keyStatus?.has_key && (
                      keyStatus.is_valid === true ? (
                        <span className="badge-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Activo
                        </span>
                      ) : keyStatus.is_valid === false ? (
                        <span className="badge-error flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Error
                        </span>
                      ) : (
                        <span className="badge-warning">Sin verificar</span>
                      )
                    )}
                    {!keyStatus?.has_key && (
                      <span className="badge bg-surface-700 text-slate-500 border border-white/5">Sin configurar</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{provider.description}</p>
                  {keyStatus?.preferred_model && (
                    <p className="text-xs text-brand-400 mt-1 flex items-center gap-1">
                      <Star className="w-3 h-3" /> {keyStatus.preferred_model}
                    </p>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  className="border-t border-white/10 p-5 space-y-4"
                >
                  {/* API Key input */}
                  <div>
                    <label className="label">API Key</label>
                    <div className="flex gap-3">
                      <input
                        type="password"
                        className="input-field font-mono text-sm"
                        placeholder={provider.placeholder}
                        value={apiKeys[provider.id] || ''}
                        onChange={e => setApiKeys(k => ({ ...k, [provider.id]: e.target.value }))}
                      />
                      <button
                        className="btn-primary px-4 whitespace-nowrap flex items-center gap-2"
                        onClick={() => saveMutation.mutate({ provider: provider.id, api_key: apiKeys[provider.id] || '' })}
                        disabled={!apiKeys[provider.id] || saveMutation.isPending}
                      >
                        <Plus className="w-4 h-4" /> Guardar
                      </button>
                    </div>
                    <a href={provider.docs} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-400 hover:text-brand-300 mt-1.5 inline-block">
                      Obtener clave API →
                    </a>
                  </div>

                  {/* Actions */}
                  {keyStatus?.has_key && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
                        onClick={() => testProvider(provider.id)}
                        disabled={testingProvider === provider.id}
                      >
                        {testingProvider === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                        Probar conexión
                      </button>
                      <button
                        className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
                        onClick={() => { loadModels(provider.id); }}
                        disabled={loadingModels[provider.id]}
                      >
                        {loadingModels[provider.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                        Ver modelos
                      </button>
                      <button
                        className="btn-danger py-2 px-4 text-sm flex items-center gap-2"
                        onClick={() => deleteMutation.mutate(provider.id)}
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar clave
                      </button>
                    </div>
                  )}

                  {/* Validation message */}
                  {keyStatus?.validation_message && (
                    <p className={`text-sm ${keyStatus.is_valid ? 'text-emerald-400' : 'text-red-400'}`}>
                      {keyStatus.validation_message}
                    </p>
                  )}

                  {/* Models list */}
                  {providerModels.length > 0 && (
                    <div>
                      <p className="label">Modelos disponibles - selecciona el preferido</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {providerModels.map((model: any) => (
                          <button
                            key={model.id}
                            onClick={() => setPreferredModel.mutate({ provider: provider.id, model_id: model.id })}
                            className={`text-left p-3 rounded-xl text-sm transition-all border ${
                              keyStatus?.preferred_model === model.id
                                ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                                : 'bg-white/3 border-white/5 text-slate-300 hover:bg-white/8'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {keyStatus?.preferred_model === model.id && <Star className="w-3 h-3 text-brand-400 shrink-0" />}
                              <span className="font-mono text-xs truncate">{model.id}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Info box */}
      <div className="glass-card p-5">
        <h3 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" /> Seguridad de claves
        </h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>🔐 Todas las claves se almacenan cifradas con <strong className="text-slate-300">Fernet (AES-128-CBC)</strong></li>
          <li>🔒 Nunca se muestran en texto plano después de guardarse</li>
          <li>🤖 La app selecciona automáticamente el modelo más eficiente antes de cada tarea</li>
          <li>✅ Puedes configurar múltiples proveedores como fallback</li>
        </ul>
      </div>
    </div>
  )
}
