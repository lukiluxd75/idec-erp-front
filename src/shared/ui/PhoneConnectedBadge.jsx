import { Smartphone } from 'lucide-react'
import { Badge } from './Badge'

/**
 * "Phone connected" indicator — always visible (not just when connected), so
 * the user can tell at a glance whether it's live or simply hasn't detected a
 * phone yet. Lit (green, pulsing) when another WebSocket connection of the
 * SAME account is open from a device detected as mobile (see
 * CapturesConnectionManager / ResolutionsConnectionManager on the backend,
 * and useCapturesUpdates / useResolutionsUpdates on the frontend); grey
 * otherwise. Only reflects live presence, not a session history.
 */
export function PhoneConnectedBadge({ connected }) {
  return (
    <div className="flex items-center gap-2 normal-case">
      <Smartphone size={14} className={`shrink-0 ${connected ? 'text-state-success' : 'text-slate-400'}`} />
      <Badge variant={connected ? 'success' : 'neutral'} dot dotPulse={connected}>
        {connected ? 'Celular conectado' : 'Celular no conectado'}
      </Badge>
    </div>
  )
}

export default PhoneConnectedBadge
