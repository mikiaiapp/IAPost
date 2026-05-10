import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { History, Sparkles, Link2, CheckCircle2, XCircle, Clock, Copy } from 'lucide-react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import toast from 'react-hot-toast'
import api from '../lib/api'

dayjs.locale('es')

export default function HistoryPage() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data } = await api.get('/api/posts/?limit=50')
      return data
    },
  })

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'ready') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />
    return <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-brand-400" />
          Historial de posts
        </h1>
        <p className="text-slate-400 text-sm mt-1">{posts.length} posts generados</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-24 shimmer" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300">No hay posts todavía</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any, idx: number) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card-hover p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <StatusIcon status={post.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {post.economic_news_title || post.source_url || 'Post generado automáticamente'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">
                        {dayjs(post.created_at).format('D MMM YYYY [·] HH:mm')}
                      </span>
                      {post.post_type === 'manual' && (
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                          <Link2 className="w-3 h-3" /> URL
                        </span>
                      )}
                      {post.ai_model && (
                        <span className="text-xs text-slate-600">{post.ai_model}</span>
                      )}
                    </div>
                    {post.status === 'ready' && post.linkedin_post && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {post.linkedin_post.substring(0, 150)}...
                      </p>
                    )}
                    {post.status === 'failed' && (
                      <p className="text-xs text-red-400 mt-1">{post.error_message}</p>
                    )}
                  </div>
                </div>
                {post.status === 'ready' && post.linkedin_post && (
                  <CopyToClipboard
                    text={post.linkedin_post}
                    onCopy={() => toast.success('Post copiado')}
                  >
                    <button className="btn-secondary py-1.5 px-3 text-xs shrink-0 flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </CopyToClipboard>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
