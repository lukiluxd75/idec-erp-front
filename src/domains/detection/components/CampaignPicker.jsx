import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Plus } from 'lucide-react'
import { Button, Input, Modal, Select } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'

const NEW_CAMPAIGN_VALUE = '__new__'

/**
 * Campaign (quarter) picker for the detection start screen: a dropdown of
 * active campaigns plus a "+ Nueva campaña" quick-create modal. Selecting a
 * campaign sets `campaignId`, which the caller sends as `campaign_id` in the
 * detect-wms payload (see DetectChangesRequest.campaign_id on the backend).
 *
 * A campaign fixes its year_a/year_b for its whole life (engineer's call,
 * reverting an earlier decision) -- set once here at creation, `onChange`
 * fires with the full campaign object (not just its id) so the caller can
 * lock its own year selectors to it.
 */
export default function CampaignPicker({ campaignId, onChange, yearOptions = [] }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [yearA, setYearA] = useState('')
  const [yearB, setYearB] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  async function loadCampaigns(selectId) {
    setLoading(true)
    try {
      const list = await detectionApi.listCampaigns()
      const items = Array.isArray(list) ? list : []
      setCampaigns(items)
      if (selectId) {
        const selected = items.find((c) => c.id === selectId)
        onChange?.(selectId, selected || null)
      }
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las campañas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelectChange(event) {
    const value = event.target.value
    if (value === NEW_CAMPAIGN_VALUE) {
      setCreateOpen(true)
      return
    }
    if (!value) {
      onChange?.(null, null)
      return
    }
    const id = Number(value)
    onChange?.(id, campaigns.find((c) => c.id === id) || null)
  }

  function closeCreate() {
    setCreateOpen(false)
    setCode('')
    setName('')
    setYearA('')
    setYearB('')
    setPeriodStart('')
    setPeriodEnd('')
  }

  async function handleCreate() {
    if (!code.trim() || !name.trim()) {
      toast.warn('Complete código y nombre de la campaña.')
      return
    }
    if (!yearA || !yearB) {
      toast.warn('Elija los dos años que usará esta campaña.')
      return
    }
    setSaving(true)
    try {
      const created = await detectionApi.createCampaign({
        code: code.trim(),
        name: name.trim(),
        year_a: Number(yearA),
        year_b: Number(yearB),
        period_start: periodStart || null,
        period_end: periodEnd || null,
      })
      toast.success(`Campaña "${created.name}" creada.`)
      closeCreate()
      await loadCampaigns(created.id)
    } catch (err) {
      toast.error(err.message || 'No se pudo crear la campaña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Select
        label="Campaña"
        value={campaignId ?? ''}
        onChange={handleSelectChange}
        disabled={loading}
      >
        <option value="">Sin campaña</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} · {c.name}
          </option>
        ))}
        <option value={NEW_CAMPAIGN_VALUE}>+ Nueva campaña…</option>
      </Select>

      <Modal open={createOpen} onClose={closeCreate} title="Nueva campaña" icon={Plus}>
        <div className="space-y-3">
          <Input
            label="Código"
            placeholder="2026-Q4"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={30}
          />
          <Input
            label="Nombre"
            placeholder="Cuarto trimestre 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Años de comparación (quedan fijos para toda la campaña)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Año A" value={yearA} onChange={(e) => setYearA(e.target.value)}>
                <option value="">Elegir…</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
              <Select label="Año B" value={yearB} onChange={(e) => setYearB(e.target.value)}>
                <option value="">Elegir…</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Desde"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={closeCreate} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Crear y usar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
