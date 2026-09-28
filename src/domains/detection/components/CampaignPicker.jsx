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
 */
export default function CampaignPicker({ campaignId, onChange }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  async function loadCampaigns(selectId) {
    setLoading(true)
    try {
      const list = await detectionApi.listCampaigns()
      setCampaigns(Array.isArray(list) ? list : [])
      if (selectId) onChange?.(selectId)
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
    onChange?.(value ? Number(value) : null)
  }

  function closeCreate() {
    setCreateOpen(false)
    setCode('')
    setName('')
    setPeriodStart('')
    setPeriodEnd('')
  }

  async function handleCreate() {
    if (!code.trim() || !name.trim()) {
      toast.warn('Complete código y nombre de la campaña.')
      return
    }
    setSaving(true)
    try {
      const created = await detectionApi.createCampaign({
        code: code.trim(),
        name: name.trim(),
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
