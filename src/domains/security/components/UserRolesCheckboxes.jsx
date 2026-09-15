/**
 * Role checklist for assigning roles to a user (PermissionsPage) — unlike
 * RolePermissionsCheckboxes (which marks permissions inside ONE role), here several
 * roles are marked at once for the same user, all under the same area.
 */
export function UserRolesCheckboxes({ roles, roleIds, onChange }) {
  const hasRole = (id) => roleIds.includes(id)

  const toggle = (id) => {
    onChange(hasRole(id) ? roleIds.filter((r) => r !== id) : [...roleIds, id])
  }

  if (roles.length === 0) {
    return <p className="text-xs text-slate-400">No hay roles creados.</p>
  }

  return (
    <div className="flex max-h-32 min-w-[180px] flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
      {roles.map((role) => (
        <label key={role.id} className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={hasRole(role.id)}
            onChange={() => toggle(role.id)}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-accent-600 focus:ring-accent-400"
          />
          <span className="truncate">{role.nombre}</span>
        </label>
      ))}
    </div>
  )
}

export default UserRolesCheckboxes
