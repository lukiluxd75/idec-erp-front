/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProceduresAdminPage = lazy(() => import('./pages/ProceduresAdminPage'))
const IngestPage = lazy(() => import('./pages/IngestPage'))
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'))

/** Real routes for the chatbot domain. */
export const chatbotRoutes = [
  { path: '/chatbot/chat', element: <ChatPage /> },
  { path: '/chatbot/procedures', element: <ProceduresAdminPage /> },
  { path: '/chatbot/ingest', element: <IngestPage /> },
  { path: '/chatbot/feedback', element: <FeedbackPage /> },
]
