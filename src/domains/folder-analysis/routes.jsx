/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const DocumentReviewPage = lazy(() => import('./pages/DocumentReviewPage'))
const FolderAnalysisPage = lazy(() => import('./pages/FolderAnalysisPage'))
const FolderWorkbenchPage = lazy(() => import('./pages/FolderWorkbenchPage'))
const RegisteredFoldersPage = lazy(() => import('./pages/RegisteredFoldersPage'))
const SavedFolderDataPage = lazy(() => import('./pages/SavedFolderDataPage'))

/**
 * Routes for the folder analysis domain ("Analizador y extractor de datos de
 * carpetas", inside Herramientas OCR+IA). Registered in src/domains/index.js.
 */
export const folderAnalysisRoutes = [
  { path: '/folder-analysis', element: <FolderAnalysisPage />, wide: true },
  { path: '/folder-analysis/saved', element: <SavedFolderDataPage />, wide: true },
  { path: '/folder-analysis/folders', element: <RegisteredFoldersPage />, wide: true },
  { path: '/folder-analysis/folders/:id', element: <FolderWorkbenchPage />, wide: true },
  { path: '/folder-analysis/documents/:id', element: <DocumentReviewPage />, wide: true },
]
