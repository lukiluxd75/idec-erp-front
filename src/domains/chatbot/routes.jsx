import ChatPage from './pages/ChatPage'
import ProceduresAdminPage from './pages/ProceduresAdminPage'
import IngestPage from './pages/IngestPage'
import FeedbackPage from './pages/FeedbackPage'

/**
 * Real routes for the chatbot domain. Registered in src/domains/index.js.
 */
export const chatbotRoutes = [
  { path: '/chatbot/chat', element: <ChatPage /> },
  { path: '/chatbot/procedures', element: <ProceduresAdminPage /> },
  { path: '/chatbot/ingest', element: <IngestPage /> },
  { path: '/chatbot/feedback', element: <FeedbackPage /> },
]
