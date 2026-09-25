import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/hooks/useAuth'
import { DOMAIN_SECTIONS, getVisibleNavChildren } from '@/shared/nav'

/**
 * Domain entry screen: redirects straight to the module's first accessible function.
 * The contextual sidebar (app/layout/Sidebar) is the only navigation between a
 * module's functions — this page never renders a function picker of its own.
 */
export function DomainHome() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const domain = DOMAIN_SECTIONS.find((section) => section.path === pathname)

  if (!domain) return null

  const visibleChildren = getVisibleNavChildren(user?.permisos, domain.children)

  if (visibleChildren.length === 0) return null

  return <Navigate to={visibleChildren[0].path} replace />
}

export default DomainHome
