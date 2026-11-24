import type { ConsultationPicker } from '../../api/use-consultation-state'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import { usePagedPicker } from '../../api/use-paged-picker'
import { PagedPicker } from '../PagedPicker'
export function CatalogPicker({
  context,
  value,
  onChange,
  disabled,
  consultation,
  historical = false,
  retainedId,
  required = !historical,
}: {
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  retainedId?: string | null
  consultation?: ConsultationPicker
  historical?: boolean
  disabled: boolean
  required?: boolean
}) {
  const picker = usePagedPicker({
    context,
    owner: JSON.stringify(['catalog', historical, retainedId]),
    consultation,
    value,
    retainedId,
    onChange,
    loadPage: (search, page) =>
      window.catalog.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25, status: historical ? 'ALL' : 'ACTIVE' },
      }),
    loadOne: (id) =>
      window.catalog.get({ context: { sessionId: context.sessionId }, query: { id } }),
    option: (s) => ({
      value: s.id,
      label: s.description + (s.status === 'ACTIVE' ? '' : ' · Disattivato'),
      disabled:
        s.status !== 'ACTIVE' && s.id !== retainedId && !(historical && retainedId === undefined),
    }),
  })
  return (
    <PagedPicker
      {...picker}
      label="Tipo di prestazione"
      required={required}
      placeholder={required ? 'Seleziona un tipo' : 'Tutti i tipi'}
      clearable={!required}
      clearLabel="Rimuovi filtro tipo di prestazione"
      disabled={disabled}
    />
  )
}
