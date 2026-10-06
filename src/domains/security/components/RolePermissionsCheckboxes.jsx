import { ACTIONS, ERP_MODULES } from '../data/moduleCatalog'

/** Permission matrix (modules × actions) for assigning permissions to a role. */
export function RolePermissionsCheckboxes({ permissions, onChange }) {
  const selected = permissions || []

  const hasPermission = (key) => selected.includes(key)

  const toggle = (key) => {
    onChange(hasPermission(key) ? selected.filter((code) => code !== key) : [...selected, key])
  }

  const moduleActionKeys = (module) => module.actions.map((action) => `${module.id}.${action.id}`)

  const setModuleAll = (module, enabled) => {
    const keys = moduleActionKeys(module)
    if (enabled) {
      const merged = new Set([...selected, ...keys])
      onChange([...merged])
    } else {
      onChange(selected.filter((code) => !keys.includes(code)))
    }
  }

  const moduleFullySelected = (module) =>
    module.actions.every((action) => hasPermission(`${module.id}.${action.id}`))

  const moduleHasAction = (module, actionId) =>
    module.actions.some((action) => action.id === actionId)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Módulo</th>
              {ACTIONS.map((action) => (
                <th key={action.id} className="px-3 py-2.5 text-center font-semibold">
                  {action.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-semibold">Todo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {ERP_MODULES.map((module) => {
              const allOn = moduleFullySelected(module)
              return (
                <tr key={module.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-800">{module.label}</p>
                    <p className="font-mono text-[10px] text-slate-400">{module.id}</p>
                  </td>
                  {ACTIONS.map((action) => {
                    const key = `${module.id}.${action.id}`
                    if (!moduleHasAction(module, action.id)) {
                      return (
                        <td key={key} className="px-3 py-2.5 text-center text-slate-200">
                          —
                        </td>
                      )
                    }
                    return (
                      <td key={key} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={hasPermission(key)}
                          onChange={() => toggle(key)}
                          aria-label={`${module.label} · ${action.label}`}
                          className="h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-400"
                        />
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={allOn}
                      onChange={() => setModuleAll(module, !allOn)}
                      aria-label={`Todos los permisos de ${module.label}`}
                      className="h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-400"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RolePermissionsCheckboxes
