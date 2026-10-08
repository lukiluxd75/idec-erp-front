import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, Sun, User } from 'lucide-react'
import { BRAND } from '@/shared/branding'
import { ENV } from '@/core/config/env.config'
import { ProfileModal } from './ProfileModal'

const THEME_STORAGE_KEY = 'idec-erp.theme'

function storedDarkTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
  } catch {
    return false
  }
}

/** ERP top bar: wide, aligned, with compact user actions. */
export function Header({ onLogout, onToggleSidebar, user }) {
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkTheme, setDarkTheme] = useState(storedDarkTheme)
  const displayName = user?.username || 'Usuario'
  const initial = String(displayName).charAt(0).toUpperCase()

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkTheme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, darkTheme ? 'dark' : 'light')
    } catch {
      /* Ignore unavailable storage; the theme remains active for this session. */
    }
  }, [darkTheme])

  const toggleTheme = () => setDarkTheme((enabled) => !enabled)

  return (
    <header className="liquid-glass-bar sticky top-0 z-20 border-b">
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

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Ir al inicio"
            className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
          >
            <img
              src={BRAND.logoSrc}
              alt={BRAND.logoAlt}
              className="h-8 w-auto shrink-0 sm:h-9"
            />
            <div className="hidden min-w-0 border-l border-slate-200 pl-2.5 text-left sm:block">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-accent-600">
                {ENV.ORGANIZATION}
              </p>
              <p className="truncate text-sm font-bold text-slate-900">{ENV.APP_NAME}</p>
            </div>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={darkTheme ? 'Activar tema claro' : 'Activar tema oscuro'}
            aria-pressed={darkTheme}
            title={darkTheme ? 'Tema claro' : 'Tema oscuro'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
          >
            {darkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
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

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} user={user} />
    </header>
  )
}

export default Header
