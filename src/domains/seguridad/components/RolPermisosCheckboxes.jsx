import { MODULOS_ERP, ACCIONES } from '../data/catalogoModulos'

/**
 * Checklist de permisos agrupado por módulo del ERP. Es la única forma de asignar
 * permisos a un rol — siempre se elige de los módulos que ya existen, nunca texto libre.
 */
export function RolPermisosCheckboxes({ permisos, onChange }) {
  const tienePermiso = (clave) => permisos.includes(clave)

  const toggle = (clave) => {
    onChange(tienePermiso(clave) ? permisos.filter((p) => p !== clave) : [...permisos, clave])
  }

  return (
    <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-3">
      {MODULOS_ERP.map((modulo) => (
        <div key={modulo.id} className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            {modulo.label}
          </p>
          <div className="flex flex-wrap gap-3">
            {ACCIONES.map((accion) => {
              const clave = `${modulo.id}.${accion.id}`
              return (
                <label key={clave} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={tienePermiso(clave)}
                    onChange={() => toggle(clave)}
                    className="h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-400"
                  />
                  {accion.label}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default RolPermisosCheckboxes
