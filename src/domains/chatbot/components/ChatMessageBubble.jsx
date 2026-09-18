import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ThumbsUp, ThumbsDown, Bot } from 'lucide-react'
import { Button, Input } from '@/shared/ui'
import { AuditResultCard } from './AuditResultCard'

const AUDIT_KEYS = ['estado', 'documentos_presentes', 'documentos_faltantes', 'observaciones']

function tryParseAuditResult(content) {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const data = JSON.parse(trimmed)
    if (AUDIT_KEYS.every((key) => key in data)) return data
  } catch {
    // No era el JSON de auditoría -- se muestra como Markdown normal.
  }
  return null
}

export function ChatMessageBubble({ message, onFeedback }) {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [sentFeedback, setSentFeedback] = useState(message.feedback || null)

  const isUser = message.role === 'user'
  const auditResult = !isUser ? tryParseAuditResult(message.content) : null

  const handleFeedback = (value) => {
    if (value === 'negative' && !showComment) {
      setShowComment(true)
      return
    }
    setSentFeedback(value)
    setShowComment(false)
    onFeedback?.(message.id, value, comment.trim() || undefined)
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          {message.imagePreview && (
            <img
              src={message.imagePreview}
              alt="Imagen adjunta"
              className="ml-auto max-h-48 rounded-xl border border-brand-800/20 object-cover"
            />
          )}
          <div className="rounded-2xl rounded-tr-none bg-brand-800 px-4 py-2.5 text-sm text-white shadow-sm">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600 ring-1 ring-accent-200">
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 max-w-[85%] flex-1 space-y-2">
        <div className="rounded-2xl rounded-tl-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
          {auditResult ? (
            <AuditResultCard result={auditResult} />
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.id && (
          <div className="flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={() => handleFeedback('positive')}
              aria-label="Respuesta útil"
              className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                sentFeedback === 'positive' ? 'bg-state-success/15 text-state-success' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFeedback('negative')}
              aria-label="Respuesta no útil"
              className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                sentFeedback === 'negative' ? 'bg-state-danger/15 text-state-danger' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showComment && (
          <div className="flex items-center gap-2 pl-1">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué estuvo mal? (opcional)"
              containerClassName="flex-1"
            />
            <Button size="sm" variant="secondary" onClick={() => handleFeedback('negative')}>
              Enviar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowComment(false)}>
              Omitir
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessageBubble
