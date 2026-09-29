import { GisBackdrop } from '@/shared/layout'
import { LoginForm } from '@/auth/components'
import { BRAND } from '@/shared/branding'
import { ENV } from '@/core/config/env.config'

export function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <GisBackdrop />

      <div className="w-full max-w-sm animate-card-in">
        <div className="liquid-glass-panel rounded-3xl p-8 sm:p-9">
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src={BRAND.logoSrc}
              alt={BRAND.logoAlt}
              className="mb-5 h-16 w-auto drop-shadow-[0_3px_8px_rgba(38,21,74,0.25)]"
            />
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-accent-600">
              {ENV.ORGANIZATION}
            </p>
            <h1 className="text-2xl font-extrabold uppercase tracking-wide text-slate-900">
              {ENV.APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Inicie sesión con su usuario y contraseña
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  )
}

export default LoginPage
