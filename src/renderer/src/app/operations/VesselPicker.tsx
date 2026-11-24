import type { ConsultationPicker } from '../../api/use-consultation-state'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import { usePagedPicker } from '../../api/use-paged-picker'
import { PagedPicker } from '../PagedPicker'
export function VesselPicker({
  context,
  value,
  onChange,
  disabled,
  retainedId,
  consultation,
  onMissing,
  historical = false,
}: {
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  consultation?: ConsultationPicker
  onMissing?: () => void
  retainedId?: string
  historical?: boolean
}) {
  const picker = usePagedPicker({
    context,
    owner: JSON.stringify(['vessels', historical, retainedId]),
    consultation,
    value,
    retainedId,
    onChange,
    onMissing,
    loadPage: (search, page) =>
      window.vessels.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25, selectableOnly: false },
      }),
    loadOne: (id) =>
      window.vessels.get({ context: { sessionId: context.sessionId }, query: { id } }),
    option: (v) => ({
      value: v.id,
      label: v.code + ' · ' + v.version.registeredName + (v.selectable ? '' : ' · Disattivata'),
      disabled: !v.selectable && v.id !== retainedId && !(historical && retainedId === undefined),
    }),
  })
  return (
    <PagedPicker
      {...picker}
      label="Nave"
      placeholder="Seleziona una nave"
      disabled={disabled}
      required
    />
  )
}
