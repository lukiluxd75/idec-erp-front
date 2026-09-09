/**
 * Checklist de roles a asignar a un usuario (PermisosPage) — a diferencia de
 * RolPermisosCheckboxes (que marca permisos dentro de UN rol), acá se marcan varios
 * roles a la vez para el mismo usuario, todos bajo la misma área.
 */
export function UsuarioRolesCheckboxes({ roles, rolIds, onChange }) {
  const tieneRol = (id) => rolIds.includes(id)

  const toggle = (id) => {
    onChange(tieneRol(id) ? rolIds.filter((r) => r !== id) : [...rolIds, id])
  }

  if (roles.length === 0) {
    return <p className="text-xs text-slate-400">No hay roles creados.</p>
  }

  return (
    <div className="flex max-h-32 min-w-[180px] flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
      {roles.map((rol) => (
        <label key={rol.id} className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={tieneRol(rol.id)}
            onChange={() => toggle(rol.id)}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-accent-600 focus:ring-accent-400"
          />
          <span className="truncate">{rol.nombre}</span>
        </label>
      ))}
    </div>
  )
}

export default UsuarioRolesCheckboxes
