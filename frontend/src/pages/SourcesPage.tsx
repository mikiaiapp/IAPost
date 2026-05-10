import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Globe, Plus, Trash2, CheckCircle, XCircle, Clock,
  FlaskConical, TrendingUp, Bot, Calendar, Loader2, Edit2
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

const CATEGORIES = [
  { value: 'economics', label: 'Economía', icon: TrendingUp, color: 'text-emerald-400' },
  { value: 'ai', label: 'Inteligencia Artificial', icon: Bot, color: 'text-blue-400' },
  { value: 'ephemeris', label: 'Efemérides', icon: Calendar, color: 'text-amber-400' },
  { value: 'general', label: 'General', icon: Globe, color: 'text-slate-400' },
]

export default function SourcesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', url: '', source_type: 'rss', category: 'economics' })
  const [testingId, setTestingId] = useState<number | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => (await api.get('/api/sources/')).data,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/sources/', form),
    onSuccess: () => {
      toast.success('Fuente añadida')
      qc.invalidateQueries({ queryKey: ['sources'] })
      setShowForm(false)
      setForm({ name: '', url: '', source_type: 'rss', category: 'economics' })
    },
    onError: () => toast.error('Error al añadir fuente'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/sources/${id}`),
    onSuccess: () => {
      toast.success('Fuente eliminada')
      qc.invalidateQueries({ queryKey: ['sources'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.put(`/api/sources/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  })

  const testSource = async (id: number) => {
    setTestingId(id)
    try {
      const { data } = await api.post(`/api/sources/${id}/test`)
      if (data.ok) toast.success(data.message)
      else toast.error(data.message)
      qc.invalidateQueries({ queryKey: ['sources'] })
    } catch {
      toast.error('Error al probar la fuente')
    } finally {
      setTestingId(null)
    }
  }

  const filtered = filterCat === 'all' ? sources : sources.filter((s: any) => s.category === filterCat)

  const grouped = CATEGORIES.reduce((acc: any, cat) => {
    acc[cat.value] = filtered.filter((s: any) => s.category === cat.value)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-brand-400" />
            Fuentes de noticias
          </h1>
          <p className="text-slate-400 text-sm mt-1">{sources.length} fuentes configuradas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Añadir fuente
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 space-y-4"
        >
          <h2 className="section-title">Nueva fuente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input type="text" className="input-field" placeholder="El Economista" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input-field" value={form.source_type}
                onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}>
                <option value="rss">RSS Feed</option>
                <option value="url">URL directa</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">URL</label>
              <input type="url" className="input-field" placeholder="https://..." value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="input-field" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || !form.url}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Añadir'}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </motion.div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('all')} className={`badge transition-all ${filterCat === 'all' ? 'badge-info' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
          Todas
        </button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilterCat(c.value)}
            className={`badge transition-all ${filterCat === c.value ? 'badge-info' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Sources grouped by category */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="glass-card h-16 shimmer" />)}</div>
      ) : (
        CATEGORIES.map(cat => {
          const items = grouped[cat.value] || []
          if (filterCat !== 'all' && filterCat !== cat.value) return null
          if (items.length === 0) return null
          const Icon = cat.icon
          return (
            <div key={cat.value} className="space-y-2">
              <h2 className={`section-title ${cat.color}`}>
                <Icon className="w-4 h-4" />
                {cat.label}
              </h2>
              {items.map((source: any, idx: number) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`glass-card p-4 flex items-center gap-4 ${!source.is_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{source.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{source.url}</p>
                    {source.last_test_message && (
                      <p className={`text-xs mt-1 ${source.last_test_status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {source.last_test_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Test status icon */}
                    {source.last_test_status === 'ok' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {source.last_test_status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}

                    {/* Test button */}
                    <button
                      onClick={() => testSource(source.id)}
                      disabled={testingId === source.id}
                      className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                      title="Probar fuente"
                    >
                      {testingId === source.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                      Test
                    </button>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleMutation.mutate({ id: source.id, is_active: !source.is_active })}
                      className={`w-8 h-4 rounded-full transition-all ${source.is_active ? 'bg-brand-600' : 'bg-surface-600'}`}
                      title={source.is_active ? 'Desactivar' : 'Activar'}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${source.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>

                    {/* Delete */}
                    <button onClick={() => deleteMutation.mutate(source.id)} className="btn-danger p-1.5" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
