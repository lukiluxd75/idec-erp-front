import { ArrowLeft, ClipboardCheck, MessageSquareWarning, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { appraisalReviewApi } from '@/domains/appraisal-review/api/appraisalReview.api'
import { AppraisalReadOnlyDetails } from '@/domains/appraisal-review/components/AppraisalReadOnlyDetails'
import { ObservationsEditor } from '@/domains/appraisal-review/components/ObservationsEditor'
import { Alert, Button, Card, ConfirmDialog, SectionHeader, Spinner } from '@/shared/ui'

export default function AppraisalReviewPage() {
  const { formNumber } = useParams()
  const navigate = useNavigate()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [observations, setObservations] = useState([])
  const [confirming, setConfirming] = useState(null) // 'observations' | 'migrate' | null
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    appraisalReviewApi
      .getDetail(formNumber)
      .then((data) => alive && setDetail(data))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [formNumber])

  const hasObservations = observations.some((o) => o.trim() !== '')

  const submitObservations = async () => {
    setSubmitting(true)
    try {
      await appraisalReviewApi.sendObservations(
        formNumber,
        observations.map((o) => o.trim()).filter(Boolean),
      )
      toast.success('Observaciones enviadas a Avalúos.')
      navigate('/appraisal-review')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitMigration = async () => {
    setSubmitting(true)
    try {
      await appraisalReviewApi.migrate(formNumber)
      toast.success('Formulario aprobado y migrado al ERP.')
      navigate('/appraisal-review')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="animate-card-in">
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      </Card>
    )
  }
  if (error) {
    return (
      <Card className="animate-card-in">
        <Alert type="error">{error}</Alert>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="animate-card-in">
        <Link
          to="/appraisal-review"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-500"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <SectionHeader
          icon={ClipboardCheck}
          eyebrow={`N° ${detail.form_number}`}
          title={detail.property.address}
          subtitle={`Estado en Avalúos: ${detail.status_name}`}
        />
      </Card>

      <AppraisalReadOnlyDetails
        owner={detail.owner}
        property={detail.property}
        constructionUnits={detail.construction_units}
      />

      <Card className="animate-card-in">
        <SectionHeader
          icon={MessageSquareWarning}
          eyebrow="Revisión"
          title="Observaciones"
          subtitle="Los datos no se modifican — solo se registran observaciones punto por punto."
        />
        <ObservationsEditor observations={observations} onChange={setObservations} />

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="warning"
            icon={MessageSquareWarning}
            disabled={!hasObservations || submitting}
            onClick={() => setConfirming('observations')}
          >
            Reenviar observaciones
          </Button>
          <Button
            icon={UploadCloud}
            disabled={hasObservations || submitting}
            loading={submitting}
            onClick={() => setConfirming('migrate')}
          >
            Migrar
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirming === 'observations'}
        onClose={() => setConfirming(null)}
        onConfirm={submitObservations}
        title="¿Reenviar observaciones?"
        message="El formulario volverá a Avalúos marcado como 'Requiere corrección' junto con las observaciones ingresadas."
        confirmLabel="Reenviar"
        confirmVariant="warning"
      />
      <ConfirmDialog
        open={confirming === 'migrate'}
        onClose={() => setConfirming(null)}
        onConfirm={submitMigration}
        title="¿Migrar este formulario?"
        message="Se guardará una copia en la BD del ERP y el formulario quedará marcado como 'Aprobado' en Avalúos."
        confirmLabel="Migrar"
        confirmVariant="primary"
      />
    </div>
  )
}
