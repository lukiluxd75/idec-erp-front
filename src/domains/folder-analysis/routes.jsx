import DocumentReviewPage from './pages/DocumentReviewPage'
import FolderAnalysisPage from './pages/FolderAnalysisPage'
import SavedFolderDataPage from './pages/SavedFolderDataPage'

/**
 * Routes for the folder analysis domain ("Analizador y extractor de datos de
 * carpetas", inside Herramientas OCR+IA). Registered in src/domains/index.js.
 */
export const folderAnalysisRoutes = [
  { path: '/folder-analysis', element: <FolderAnalysisPage />, wide: true },
  { path: '/folder-analysis/saved', element: <SavedFolderDataPage />, wide: true },
  { path: '/folder-analysis/documents/:id', element: <DocumentReviewPage />, wide: true },
]
