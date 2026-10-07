import { useCallback, useEffect, useState } from 'react'
import { MessageSquareWarning, Search, ThumbsDown, ThumbsUp, GraduationCap } from 'lucide-react'
import { Alert, Badge, Card, EmptyState, Input, SectionHeader, Spinner } from '@/shared/ui'
import { chatbotApi } from '@/domains/chatbot/api/chatbot.api'
import { toast } from 'react-toastify'

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
  const [learningStates, setLearningStates] = useState({})
  const [ruleTexts, setRuleTexts] = useState({})

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

  const handleLearn = async (id) => {
    const text = ruleTexts[id]
    if (!text?.trim()) return

    setLearningStates((prev) => ({ ...prev, [id]: true }))
    try {
      await chatbotApi.learnFromFeedback(text)
      toast.success('Regla aprendida exitosamente')
      setRuleTexts((prev) => ({ ...prev, [id]: '' }))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLearningStates((prev) => ({ ...prev, [id]: false }))
    }
  }

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
        <div className="space-y-4">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <Badge variant={m.feedback === 'positive' ? 'success' : 'danger'} dot>
                  {m.feedback === 'positive' ? (
                    <ThumbsUp className="h-3.5 w-3.5" />
                  ) : (
                    <ThumbsDown className="h-3.5 w-3.5" />
                  )}
                  {m.feedback === 'positive' ? 'Útil' : 'No útil'}
                </Badge>
                <span className="text-xs font-medium text-slate-400">{formatDate(m.created_at)}</span>
              </div>
              
              <div className="space-y-3">
                {m.user_message && (
                  <div className="rounded-xl bg-accent-50 p-3">
                    <p className="text-xs font-semibold text-accent-700 mb-1">El usuario preguntó:</p>
                    <p className="text-sm text-slate-800">{m.user_message}</p>
                  </div>
                )}
                
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">El asistente respondió:</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.content}</p>
                </div>

                {m.feedback_comment && (
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Comentario del usuario:</p>
                    <p className="text-sm text-slate-800">{m.feedback_comment}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" /> Educar al Asistente
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input 
                    placeholder="Ej. 'Si el usuario pregunta X, responder Y'"
                    value={ruleTexts[m.id] || ''}
                    onChange={(e) => setRuleTexts(prev => ({ ...prev, [m.id]: e.target.value }))}
                    containerClassName="min-w-0 flex-1"
                    className="text-sm"
                  />
                  <button 
                    onClick={() => handleLearn(m.id)}
                    disabled={!ruleTexts[m.id]?.trim() || learningStates[m.id]}
                    className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    {learningStates[m.id] ? <Spinner className="h-4 w-4" /> : 'Guardar Regla'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
