import type { ConsultationPicker } from '../../api/use-consultation-state'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import { usePagedPicker } from '../../api/use-paged-picker'
import { PagedPicker } from '../PagedPicker'
export function PortPicker({
  context,
  value,
  onChange,
  disabled,
  label = 'Porto',
  retainedId,
  consultation,
  onMissing,
  historical = false,
  clearable = false,
  placeholder,
}: {
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  label?: string
  consultation?: ConsultationPicker
  onMissing?: () => void
  retainedId?: string
  historical?: boolean
  clearable?: boolean
  placeholder?: string
}) {
  const picker = usePagedPicker({
    context,
    owner: JSON.stringify(['ports', historical, retainedId]),
    consultation,
    value,
    retainedId,
    onChange,
    onMissing,
    loadPage: (search, page) =>
      window.ports.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25 },
      }),
    loadOne: (id) => window.ports.get({ context: { sessionId: context.sessionId }, query: { id } }),
    option: (p) => ({
      value: p.id,
      label: p.code + ' · ' + p.version.name + (p.status === 'INACTIVE' ? ' · Disattivato' : ''),
      disabled:
        p.status !== 'ACTIVE' && p.id !== retainedId && !(historical && retainedId === undefined),
    }),
  })
  return (
    <PagedPicker
      {...picker}
      label={label}
      placeholder={placeholder ?? (clearable ? 'Tutti i porti' : 'Seleziona un porto')}
      disabled={disabled}
      clearable={clearable}
      required={!clearable}
    />
  )
}
