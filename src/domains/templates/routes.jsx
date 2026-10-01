/* eslint-disable react-refresh/only-export-components -- este archivo
   exporta metadatos de rutas, no componentes: las paginas lazy de abajo no
   son fronteras de Fast Refresh. Misma excusa que en
   domains/cadastralviewer/routes.jsx. */
import { lazy } from 'react'

const TemplatesCatalogPage = lazy(() => import('./pages/TemplatesCatalogPage'))
const VariablesPage = lazy(() => import('./pages/VariablesPage'))
const CitesPage = lazy(() => import('./pages/CitesPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))

export const templatesRoutes = [
  { path: '/templates/catalog', element: <TemplatesCatalogPage /> },
  { path: '/templates/variables', element: <VariablesPage /> },
  { path: '/templates/cites', element: <CitesPage /> },
  { path: '/templates/documents', element: <DocumentsPage /> },
]
