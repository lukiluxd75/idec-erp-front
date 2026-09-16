import { httpClient } from '@/core/http'
import { API_ENDPOINTS } from '@/core/config/endpoints.config'

export const chatbotApi = {
  sendMessage: (conversationId, message) =>
    httpClient.post(API_ENDPOINTS.CHATBOT.CHAT, { conversation_id: conversationId, message }),

  analyzeImage: (file, prompt, conversationId) => {
    const fd = new FormData()
    fd.append('image', file)
    if (prompt) fd.append('prompt', prompt)
    if (conversationId) fd.append('conversation_id', conversationId)
    return httpClient.post(API_ENDPOINTS.CHATBOT.VISION, fd)
  },

  submitFeedback: (messageId, feedback, comment) =>
    httpClient.post(API_ENDPOINTS.CHATBOT.FEEDBACK, { message_id: messageId, feedback, comment }),

  /** ---- Admin (chatbot.edit) ---- */

  listProcedures: () => httpClient.get(API_ENDPOINTS.CHATBOT.PROCEDURES),

  updateProcedure: (code, data) => httpClient.put(API_ENDPOINTS.CHATBOT.PROCEDURE(code), data),

  ingestDocument: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return httpClient.post(API_ENDPOINTS.CHATBOT.INGESTS, fd)
  },

  listFeedback: () => httpClient.get(API_ENDPOINTS.CHATBOT.FEEDBACK),

  reindexEmbeddings: () => httpClient.post(API_ENDPOINTS.CHATBOT.REINDEX_EMBEDDINGS, {}),
}
