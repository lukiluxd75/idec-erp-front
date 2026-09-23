import { useEffect, useRef, useState } from 'react'
import { Bot } from 'lucide-react'
import { toast } from 'react-toastify'
import { Card, SectionHeader, Spinner } from '@/shared/ui'
import { chatbotApi } from '@/domains/chatbot/api/chatbot.api'
import { ChatMessageBubble } from '@/domains/chatbot/components/ChatMessageBubble'
import { ChatComposer } from '@/domains/chatbot/components/ChatComposer'

const GREETING = {
  role: 'assistant',
  content:
    '¡Buenos días! Bienvenido al servicio de atención virtual de la Dirección de Administración Geográfica y Catastro.',
}

const SUGGESTIONS = ['¿Qué puedes hacer?', '¿Qué áreas abarcas?', 'Contacto']

export default function ChatPage() {
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const attachImage = (file) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setSelectedImage(null)
    setImagePreview(null)
  }

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed && !selectedImage) return

    const userMessage = { role: 'user', content: trimmed, imagePreview }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const imageToSend = selectedImage
    removeImage()

    try {
      const response = imageToSend
        ? await chatbotApi.analyzeImage(imageToSend, trimmed, conversationId)
        : await chatbotApi.sendMessage(conversationId, trimmed)

      setConversationId(response.conversation_id)
      setMessages((prev) => [...prev, { id: response.message_id, role: 'assistant', content: response.response }])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (messageId, feedback, comment) => {
    try {
      await chatbotApi.submitFeedback(messageId, feedback, comment)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Card className="flex h-[calc(100dvh-8rem)] flex-col animate-card-in">
      <SectionHeader icon={Bot} eyebrow="Catastro" title="Asistente de Trámites" className="shrink-0" />

      <div className="flex-1 space-y-4 overflow-y-auto py-2">
        {messages.map((message, i) => (
          <ChatMessageBubble key={message.id || `local-${i}`} message={message} onFeedback={handleFeedback} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 pl-11 text-xs text-slate-400">
            <Spinner className="h-3.5 w-3.5" />
            {selectedImage ? 'Analizando imagen…' : 'Pensando…'}
          </div>
        )}

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pl-11">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-accent-300/60 bg-accent-50 px-3 py-1.5 text-xs font-medium text-accent-700 transition-colors hover:bg-accent-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-slate-100 pt-3">
        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          imagePreview={imagePreview}
          onAttachImage={attachImage}
          onRemoveImage={removeImage}
          loading={loading}
        />
      </div>
    </Card>
  )
}
