import { useState } from 'react'
import { LogOut, Menu, User } from 'lucide-react'
import { Button } from '@/shared/ui'
import { BRAND } from '@/shared/branding'
import { PerfilModal } from './PerfilModal'

export function Header({ onLogout, onToggleSidebar, user }) {
  const [perfilOpen, setPerfilOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 border-b border-accent-400/40 bg-accent-300/95 shadow-sm px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Mostrar u ocultar el menú"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-brand-600/30 bg-white/70 text-brand-600 transition-colors duration-200 hover:border-brand-600 hover:text-brand-800"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          )}

          <img
            src={BRAND.logoSrc}
            alt={BRAND.logoAlt}
            className="h-9 w-auto shrink-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPerfilOpen(true)}
            icon={User}
          >
            Perfil
          </Button>

          {onLogout && (
            <Button
              variant="danger"
              size="sm"
              onClick={onLogout}
              icon={LogOut}
            >
              Cerrar sesión
            </Button>
          )}
        </div>
      </div>

      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} user={user} />
    </header>
  )
}

export default Header
