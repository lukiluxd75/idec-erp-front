import DataTable from '@/shared/ui/DataTable'
import { useMemo, useState } from 'react'
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  Card,
  SectionHeader,
  Button,
  IconButton,
  EmptyState,
  ConfirmDialog,
  Alert,
  Spinner,
  Input,
} from '@/shared/ui'
import { useSecurityData, securityActions } from '../data/securityStore'
import { AreaFormModal } from '../components/AreaFormModal'

/** Organizational areas catalog. */
export default function AreasPage() {
  const { areas, users, loading, error } = useSecurityData()
  const [editingArea, setEditingArea] = useState(undefined)
  const [modalToken, setModalToken] = useState(0)
  const [areaToDelete, setAreaToDelete] = useState(null)
  const [search, setSearch] = useState('')

  const openAreaModal = (area) => {
    setEditingArea(area)
    setModalToken((token) => token + 1)
  }

  const usersInArea = (areaId) => users.filter((user) => user.areaId === areaId).length

  const handleDeleteArea = async (area) => {
    try {
      await securityActions.deleteArea(area.id)
      toast.info(`Área "${area.nombre}" eliminada.`)
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el área.')
    }
  }

  const filteredAreas = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return areas
    return areas.filter((area) => area.nombre?.toLowerCase().includes(term))
  }, [areas, search])

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Spinner /> Cargando áreas…
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Alert type="error" title="No se pudieron cargar las áreas" message={error.message} />
      </Card>
    )
  }

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader icon={Building2} eyebrow="Seguridad" title="Áreas" className="flex-1" />
          <Button size="sm" icon={Plus} onClick={() => openAreaModal(null)}>
            Nueva área
          </Button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Unidades organizacionales. Cada asignación de roles a un usuario requiere un área.
        </p>

        {areas.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Todavía no hay áreas"
            subtitle="Cree la primera (por ejemplo Catastro). Luego cree roles y asígnelos en Usuarios."
            className="mt-6"
          />
        ) : (
          <>
            <div className="mt-4">
              <Input
                icon={Search}
                placeholder="Buscar área por nombre…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {filteredAreas.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Ningún área coincide con la búsqueda"
                className="py-12"
              />
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/70">
                <DataTable>
<table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Usuarios</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAreas.map((area) => {
                      const count = usersInArea(area.id)
                      return (
                        <tr key={area.id} className="bg-white/60">
                          <td className="px-4 py-3 font-semibold text-slate-800">{area.nombre}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {count === 0
                              ? 'Ninguno'
                              : count === 1
                                ? '1 usuario'
                                : `${count} usuarios`}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <IconButton
                                icon={Pencil}
                                onClick={() => openAreaModal(area)}
                                aria-label={`Editar ${area.nombre}`}
                              />
                              <IconButton
                                icon={Trash2}
                                tone="danger"
                                onClick={() => setAreaToDelete(area)}
                                aria-label={`Eliminar ${area.nombre}`}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
</DataTable>
              </div>
            )}
          </>
        )}
      </Card>

      <AreaFormModal
        key={modalToken}
        open={editingArea !== undefined}
        onClose={() => setEditingArea(undefined)}
        area={editingArea || undefined}
      />

      <ConfirmDialog
        open={areaToDelete !== null}
        onClose={() => setAreaToDelete(null)}
        onConfirm={() => handleDeleteArea(areaToDelete)}
        title="Eliminar área"
        message={
          areaToDelete
            ? (() => {
                const n = usersInArea(areaToDelete.id)
                const impact =
                  n === 0
                    ? 'No hay usuarios asignados a esta área.'
                    : n === 1
                      ? '1 usuario quedará sin área.'
                      : `${n} usuarios quedarán sin área.`
                return `Se eliminará el área "${areaToDelete.nombre}". ${impact}`
              })()
            : ''
        }
      />
    </>
  )
}
