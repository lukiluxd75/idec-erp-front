import { useState } from 'react'
import { LogOut, Menu, User } from 'lucide-react'
import { BRAND } from '@/shared/branding'
import { ENV } from '@/core/config/env.config'
import { PerfilModal } from './PerfilModal'

/**
 * Barra superior del ERP: ancha, alineada y con acciones de usuario compactas.
 */
export function Header({ onLogout, onToggleSidebar, user }) {
  const [perfilOpen, setPerfilOpen] = useState(false)
  const displayName = user?.username || 'Usuario'
  const initial = String(displayName).charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/92 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {onToggleSidebar ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Mostrar u ocultar el menú"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : (
            <span className="hidden h-10 w-10 shrink-0 sm:block" aria-hidden="true" />
          )}

          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={BRAND.logoSrc}
              alt={BRAND.logoAlt}
              className="h-8 w-auto shrink-0 sm:h-9"
            />
            <div className="hidden min-w-0 border-l border-slate-200 pl-2.5 sm:block">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-accent-600">
                {ENV.ORGANIZATION}
              </p>
              <p className="truncate text-sm font-bold text-slate-900">{ENV.APP_NAME}</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setPerfilOpen(true)}
            className="flex max-w-[220px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-2.5"
            aria-label="Abrir perfil"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-800 text-xs font-bold text-white">
              {initial}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-xs font-bold text-slate-900">{displayName}</span>
              <span className="block text-[10px] font-medium text-slate-500">Perfil</span>
            </span>
            <User className="h-4 w-4 shrink-0 text-slate-400 sm:hidden" aria-hidden="true" />
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="flex h-10 items-center gap-2 rounded-xl border border-state-danger/25 bg-white px-2.5 text-state-danger transition-colors hover:border-state-danger/40 hover:bg-state-danger/5 sm:px-3"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden text-xs font-semibold sm:inline">Cerrar sesión</span>
            </button>
          )}
        </div>
      </div>

      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} user={user} />
    </header>
  )
}

export default Header
