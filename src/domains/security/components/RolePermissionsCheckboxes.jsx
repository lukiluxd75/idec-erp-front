import { ERP_MODULES } from '../data/moduleCatalog'

/**
 * Permission checklist grouped by ERP module. This is the only way to assign permissions
 * to a role — always chosen from existing modules, never free text.
 */
export function RolePermissionsCheckboxes({ permissions, onChange }) {
  const hasPermission = (key) => permissions.includes(key)

  const toggle = (key) => {
    onChange(hasPermission(key) ? permissions.filter((p) => p !== key) : [...permissions, key])
  }

  return (
    <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-3">
      {ERP_MODULES.map((module) => (
        <div key={module.id} className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            {module.label}
          </p>
          <div className="flex flex-wrap gap-3">
            {module.actions.map((action) => {
              const key = `${module.id}.${action.id}`
              return (
                <label key={key} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasPermission(key)}
                    onChange={() => toggle(key)}
                    className="h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-400"
                  />
                  {action.label}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default RolePermissionsCheckboxes
