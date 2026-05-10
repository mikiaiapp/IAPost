import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, RefreshCw, Link2, Copy, Check, TrendingUp,
  Bot, Calendar, Image, Loader2, AlertCircle, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import api from '../lib/api'

dayjs.locale('es')

interface Post {
  id: number
  status: string
  post_type: string
  linkedin_post: string | null
  infographic_prompt: string | null
  economic_news_title: string | null
  economic_news_url: string | null
  ai_news_title: string | null
  ephemeris: string | null
  ai_provider: string | null
  ai_model: string | null
  error_message: string | null
  created_at: string
}

export default function DashboardPage() {
  const qc = useQueryClient()
  const [urlInput, setUrlInput] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>('post')
  const [copiedPost, setCopiedPost] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [editingPost, setEditingPost] = useState<string | null>(null)

  const { data: latestPost, isLoading, error } = useQuery<Post | null>({
    queryKey: ['latest-post'],
    queryFn: async () => {
      const { data } = await api.get('/api/posts/latest')
      return data
    },
    refetchInterval: (data) => {
      // Poll every 3s while generating
      if (!data || data?.status === 'generating' || data?.status === 'pending') return 3000
      return false
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => api.post('/api/posts/generate'),
    onSuccess: () => {
      toast.success('Generación iniciada. Esto puede tardar unos segundos...')
      qc.invalidateQueries({ queryKey: ['latest-post'] })
    },
    onError: () => toast.error('Error al iniciar la generación'),
  })

  const generateFromUrlMutation = useMutation({
    mutationFn: (url: string) => api.post('/api/posts/generate-url', { url }),
    onSuccess: () => {
      toast.success('Analizando URL...')
      setUrlInput('')
      qc.invalidateQueries({ queryKey: ['latest-post'] })
    },
    onError: () => toast.error('Error al analizar la URL'),
  })

  const updatePostMutation = useMutation({
    mutationFn: ({ id, linkedin_post }: { id: number; linkedin_post: string }) =>
      api.put(`/api/posts/${id}`, null, { params: { linkedin_post } }),
    onSuccess: () => {
      toast.success('Post guardado')
      qc.invalidateQueries({ queryKey: ['latest-post'] })
      setEditingPost(null)
    },
  })

  const isGenerating = latestPost?.status === 'generating' || latestPost?.status === 'pending'

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    generateFromUrlMutation.mutate(urlInput.trim())
  }

  const handleCopyPost = () => {
    setCopiedPost(true)
    toast.success('Post copiado al portapapeles')
    setTimeout(() => setCopiedPost(false), 2000)
  }

  const handleCopyPrompt = () => {
    setCopiedPrompt(true)
    toast.success('Prompt de infografía copiado')
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">{dayjs().format('dddd, D [de] MMMM [de] YYYY')}</p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || isGenerating}
          className="btn-primary flex items-center gap-2"
        >
          {isGenerating || generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? 'Generando...' : 'Generar hoy'}
        </button>
      </div>

      {/* URL Input */}
      <div className="glass-card p-5">
        <h2 className="section-title mb-4">
          <Link2 className="w-5 h-5 text-brand-400" />
          Analizar URL
        </h2>
        <form onSubmit={handleUrlSubmit} className="flex gap-3">
          <input
            type="url"
            className="input-field flex-1"
            placeholder="https://www.expansion.com/..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary px-4 whitespace-nowrap flex items-center gap-2"
            disabled={generateFromUrlMutation.isPending || !urlInput.trim()}
          >
            {generateFromUrlMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Analizar
          </button>
        </form>
      </div>

      {/* Status / Loading */}
      {isLoading && (
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      )}

      {/* Generating state */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-6 gradient-border"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-600/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-brand-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Generando contenido con IA...</h3>
                <p className="text-sm text-slate-400">Extrayendo noticias y creando tu post de LinkedIn</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-600 to-purple-600 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {latestPost?.status === 'failed' && (
        <div className="glass-card p-5 border-red-500/20">
          <div className="flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-red-400">Error en la generación</h3>
              <p className="text-sm text-slate-400 mt-1">{latestPost.error_message || 'Error desconocido'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Post ready */}
      {latestPost?.status === 'ready' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Metadata bar */}
          <div className="glass-card px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="badge-success">✅ Listo</span>
            <span className="text-slate-400">
              {dayjs(latestPost.created_at).format('HH:mm')}
            </span>
            {latestPost.ai_model && (
              <span className="badge-info">🤖 {latestPost.ai_provider} / {latestPost.ai_model}</span>
            )}
            {latestPost.post_type === 'manual' && (
              <span className="badge-warning">🔗 Manual URL</span>
            )}
          </div>

          {/* Sources */}
          {latestPost.economic_news_title && (
            <div className="glass-card p-5 space-y-3">
              <h2 className="section-title">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Fuentes
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="badge-success shrink-0">📊</span>
                  <div>
                    <p className="text-slate-200 font-medium">{latestPost.economic_news_title}</p>
                    {latestPost.economic_news_url && (
                      <a href={latestPost.economic_news_url} target="_blank" rel="noopener noreferrer"
                        className="text-brand-400 text-xs hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink className="w-3 h-3" /> Ver fuente
                      </a>
                    )}
                  </div>
                </div>
                {latestPost.ai_news_title && (
                  <div className="flex items-start gap-2">
                    <span className="badge-info shrink-0">🤖</span>
                    <p className="text-slate-200 font-medium">{latestPost.ai_news_title}</p>
                  </div>
                )}
                {latestPost.ephemeris && (
                  <div className="flex items-start gap-2">
                    <span className="badge-warning shrink-0">📅</span>
                    <p className="text-slate-300">{latestPost.ephemeris}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LinkedIn Post */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">
                <Bot className="w-5 h-5 text-blue-400" />
                Post LinkedIn
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpandedSection(s => s === 'post' ? null : 'post')}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {expandedSection === 'post' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <CopyToClipboard text={latestPost.linkedin_post || ''} onCopy={handleCopyPost}>
                  <button className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5">
                    {copiedPost ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPost ? 'Copiado' : 'Copiar'}
                  </button>
                </CopyToClipboard>
              </div>
            </div>

            <AnimatePresence>
              {expandedSection === 'post' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {editingPost !== null ? (
                    <div className="space-y-3">
                      <textarea
                        className="input-field post-textarea font-mono text-sm w-full"
                        value={editingPost}
                        onChange={e => setEditingPost(e.target.value)}
                        rows={20}
                      />
                      <div className="flex gap-2">
                        <button
                          className="btn-primary py-2 px-4 text-sm"
                          onClick={() => updatePostMutation.mutate({ id: latestPost.id, linkedin_post: editingPost })}
                          disabled={updatePostMutation.isPending}
                        >
                          {updatePostMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                        </button>
                        <button className="btn-secondary py-2 px-4 text-sm" onClick={() => setEditingPost(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <pre className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed font-sans bg-surface-800/50 rounded-xl p-4">
                        {latestPost.linkedin_post}
                      </pre>
                      <button
                        className="btn-secondary py-2 px-4 text-sm"
                        onClick={() => setEditingPost(latestPost.linkedin_post || '')}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Infographic Prompt */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">
                <Image className="w-5 h-5 text-purple-400" />
                Prompt Infografía 3:4
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpandedSection(s => s === 'prompt' ? null : 'prompt')}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {expandedSection === 'prompt' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <CopyToClipboard text={latestPost.infographic_prompt || ''} onCopy={handleCopyPrompt}>
                  <button className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5">
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPrompt ? 'Copiado' : 'Copiar'}
                  </button>
                </CopyToClipboard>
              </div>
            </div>

            <AnimatePresence>
              {expandedSection === 'prompt' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <pre className="whitespace-pre-wrap text-slate-300 text-sm leading-relaxed font-mono bg-surface-800/50 rounded-xl p-4 text-xs">
                    {latestPost.infographic_prompt}
                  </pre>
                  <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                    <Image className="w-3 h-3" />
                    Copia este prompt en Nano Banana 2 o cualquier generador de imágenes para crear la infografía 3:4
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* No post yet */}
      {!isLoading && !isGenerating && (!latestPost || latestPost.status === 'failed') && !error && (
        <div className="glass-card p-12 text-center">
          <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300">Sin contenido hoy</h3>
          <p className="text-slate-500 text-sm mt-2 mb-6">
            Genera tu primer post o pega una URL para analizar
          </p>
          <button onClick={() => generateMutation.mutate()} className="btn-primary">
            <Sparkles className="w-4 h-4" /> Generar ahora
          </button>
        </div>
      )}
    </div>
  )
}
