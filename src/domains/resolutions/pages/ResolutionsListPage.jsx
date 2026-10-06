import { FileText, FolderOpen, ScanLine, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { StatusBadge } from '@/domains/resolutions/components/StatusBadge'
import { useResolutionsUpdates } from '@/domains/resolutions/utils/useResolutionsUpdates'
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PhoneConnectedBadge,
  SectionHeader,
  Spinner,
} from '@/shared/ui'

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function ResolutionsListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [phoneConnected, setPhoneConnected] = useState(false)
  // La resolucion que el usuario pidio borrar, a la espera de confirmar.
  const [porEliminar, setPorEliminar] = useState(null)

  const loadList = useCallback((showFullSpinner) => {
    if (showFullSpinner) setLoading(true)
    setError(null)
    return resolutionsApi
      .list()
      .then((data) => setItems(data))
      .catch((e) => setError(e.message))
      .finally(() => {
        if (showFullSpinner) setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadList(true)
  }, [loadList])

  useResolutionsUpdates(useCallback(() => loadList(false), [loadList]), setPhoneConnected)
  useEffect(() => {
    const interval = setInterval(() => loadList(false), 10000)
    return () => clearInterval(interval)
  }, [loadList])

  const eliminar = async (resolucion) => {
    try {
      await resolutionsApi.remove(resolucion.resolution_id)
      setItems((prev) => prev.filter((i) => i.resolution_id !== resolucion.resolution_id))
      toast.success('Resolución eliminada.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={FolderOpen}
        eyebrow="Lector OCR de Resoluciones P.H."
        title="Mis resoluciones"
        subtitle="Escanee desde el celular o la PC. Aquí extrae la tabla de superficies y genera el excel."
        actions={
          <Button icon={ScanLine} onClick={() => navigate('/resolutions/new')}>
            Escanear
          </Button>
        }
      />
      <div className="-mt-3 mb-4">
        <PhoneConnectedBadge connected={phoneConnected} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Todavía no hay resoluciones"
          subtitle="Toque 'Escanear' arriba, desde el celular o la PC, para crear la primera."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((r) => (
            <div
              key={r.resolution_id}
              className="relative flex h-full items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-xs transition hover:border-accent-300 hover:bg-white hover:shadow-md"
            >
              <Link
                to={`/resolutions/${r.resolution_id}`}
                className="absolute inset-0 rounded-2xl"
                aria-label={`Abrir ${r.name}`}
              />
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-200">
                <FileText className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-slate-900">{r.name}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  N° {r.resolution_number} · {r.total_pages}{' '}
                  {r.total_pages === 1 ? 'página' : 'páginas'}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">{formatDate(r.created_at)}</p>
                  <IconButton
                    icon={Trash2}
                    tone="danger"
                    title="Eliminar resolución"
                    aria-label={`Eliminar ${r.name}`}
                    className="relative z-10"
                    onClick={() => setPorEliminar(r)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(porEliminar)}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => eliminar(porEliminar)}
        title="Eliminar resolución"
        message={
          porEliminar
            ? `Se eliminará "${porEliminar.name}" (N° ${porEliminar.resolution_number}) con sus páginas escaneadas y la tabla de superficies.`
            : ''
        }
        confirmLabel="Eliminar"
      />
    </Card>
  )
}
