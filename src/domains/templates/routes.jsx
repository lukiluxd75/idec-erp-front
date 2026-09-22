import TemplatesCatalogPage from './pages/TemplatesCatalogPage'
import VariablesPage from './pages/VariablesPage'
import CitesPage from './pages/CitesPage'
import DocumentsPage from './pages/DocumentsPage'

export const templatesRoutes = [
  { path: '/templates/catalog', element: <TemplatesCatalogPage /> },
  { path: '/templates/variables', element: <VariablesPage /> },
  { path: '/templates/cites', element: <CitesPage /> },
  { path: '/templates/documents', element: <DocumentsPage /> },
]
