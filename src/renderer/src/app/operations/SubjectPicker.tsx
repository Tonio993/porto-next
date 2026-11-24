import type { ConsultationPicker } from '../../api/use-consultation-state'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import { usePagedPicker } from '../../api/use-paged-picker'
import { PagedPicker } from '../PagedPicker'
export function SubjectPicker({
  kind,
  context,
  value,
  onChange,
  disabled,
  consultation,
  historical = false,
  retainedId,
}: {
  kind: 'customer' | 'agency'
  context: ArchiveContextDto
  value: string | null
  onChange: (id: string | null) => void
  consultation?: ConsultationPicker
  historical?: boolean
  retainedId?: string | null
  disabled: boolean
}) {
  const api = kind === 'customer' ? window.customers : window.agencies
  const label = kind === 'customer' ? 'Cliente' : 'Agenzia'
  const picker = usePagedPicker({
    context,
    owner: JSON.stringify([kind, historical, retainedId]),
    consultation,
    value,
    retainedId,
    onChange,
    loadPage: (search, page) =>
      api.list({
        context: { sessionId: context.sessionId },
        query: { search, page, pageSize: 25, selectableOnly: !historical },
      }),
    loadOne: (id) => api.get({ context: { sessionId: context.sessionId }, query: { id } }),
    option: (s) => ({
      value: s.id,
      label: s.code + ' · ' + s.version.businessName + (s.selectable ? '' : ' · Disattivato'),
      disabled: !s.selectable && s.id !== retainedId && !(historical && retainedId === undefined),
    }),
  })
  return (
    <PagedPicker
      {...picker}
      label={
        label +
        (historical
          ? kind === 'customer'
            ? ' effettivo'
            : ' effettiva'
          : kind === 'customer'
            ? ' esplicito'
            : ' esplicita')
      }
      placeholder={historical ? 'Tutti' : 'Eredita dal livello superiore'}
      disabled={disabled}
      clearable
      clearLabel={
        'Rimuovi ' + label.toLowerCase() + (kind === 'customer' ? ' esplicito' : ' esplicita')
      }
      autoFocus={kind === 'customer'}
    />
  )
}
