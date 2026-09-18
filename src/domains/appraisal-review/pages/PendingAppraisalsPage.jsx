import { ClipboardCheck, Inbox, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { appraisalReviewApi } from '@/domains/appraisal-review/api/appraisalReview.api'
import { AppraisalSummaryCard } from '@/domains/appraisal-review/components/AppraisalSummaryCard'
import { Alert, Card, EmptyState, Input, SectionHeader, Spinner } from '@/shared/ui'

const MIN_SEARCH_LENGTH = 2
const DEBOUNCE_MS = 400

/**
 * Entry screen: by default shows the queue of appraisals sent for review (status
 * 'submitted'). Avalúos has its own separate login, so there is no automatic
 * notification when a form is created there — the search box looks up ANY appraisal by
 * form_number regardless of status, so the reviewer can pull one up directly.
 */
export default function PendingAppraisalsPage() {
  const [pending, setPending] = useState([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [pendingError, setPendingError] = useState(null)

  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [searchedOnce, setSearchedOnce] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    let alive = true
    appraisalReviewApi
      .listPending()
      .then((data) => alive && setPending(data))
      .catch((e) => alive && setPendingError(e.message))
      .finally(() => alive && setLoadingPending(false))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const trimmed = term.trim()
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setResults([])
      setSearchError(null)
      setSearchedOnce(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true)
      setSearchError(null)
      appraisalReviewApi
        .search(trimmed)
        .then((data) => setResults(data))
        .catch((e) => setSearchError(e.message))
        .finally(() => {
          setSearching(false)
          setSearchedOnce(true)
        })
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [term])

  const isSearching = term.trim().length >= MIN_SEARCH_LENGTH

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={ClipboardCheck}
        eyebrow="Revisión Avalúos"
        title="Formularios pendientes de revisión"
        subtitle="Enviados por el arquitecto desde el sistema de Avalúos."
      />

      <Input
        icon={Search}
        placeholder="Buscar por número de formulario (cualquier estado)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      <div className="mt-5">
        {isSearching ? (
          searching ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : searchError ? (
            <Alert type="error">{searchError}</Alert>
          ) : !searchedOnce ? null : results.length === 0 ? (
            <EmptyState icon={Search} title="Sin resultados" subtitle="No se encontró ningún formulario con ese número." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((a) => (
                <AppraisalSummaryCard key={a.id} appraisal={a} />
              ))}
            </div>
          )
        ) : loadingPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : pendingError ? (
          <Alert type="error">{pendingError}</Alert>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No hay formularios pendientes"
            subtitle="Cuando un arquitecto envíe un avalúo a revisión, va a aparecer acá. Mientras tanto, puede buscarlo por número arriba."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map((a) => (
              <AppraisalSummaryCard key={a.id} appraisal={a} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
