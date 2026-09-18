import { useCallback, useEffect, useState } from 'react'
import { MessageSquareWarning, Search, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Alert, Badge, Card, EmptyState, Input, SectionHeader, Spinner } from '@/shared/ui'
import { chatbotApi } from '@/domains/chatbot/api/chatbot.api'

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ''
  }
}

export default function FeedbackPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return chatbotApi
      .listFeedback()
      .then((data) => setItems(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = items.filter((m) => m.content.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={MessageSquareWarning}
        eyebrow="Asistente de Trámites"
        title="Retroalimentación de ciudadanos"
        subtitle="Respuestas del asistente que recibieron un voto de los usuarios."
        actions={
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en el contenido…"
            icon={Search}
            containerClassName="w-64"
          />
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title="Todavía no hay retroalimentación" />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant={m.feedback === 'positive' ? 'success' : 'danger'} dot>
                  {m.feedback === 'positive' ? (
                    <ThumbsUp className="h-3.5 w-3.5" />
                  ) : (
                    <ThumbsDown className="h-3.5 w-3.5" />
                  )}
                  {m.feedback === 'positive' ? 'Útil' : 'No útil'}
                </Badge>
                <span className="text-xs text-slate-400">{formatDate(m.created_at)}</span>
              </div>
              <p className="text-sm text-slate-700">{m.content}</p>
              {m.feedback_comment && (
                <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                  <span className="font-semibold">Comentario: </span>
                  {m.feedback_comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
