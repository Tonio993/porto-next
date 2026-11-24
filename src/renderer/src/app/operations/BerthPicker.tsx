import type { ConsultationPicker } from '../../api/use-consultation-state'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import { usePagedPicker } from '../../api/use-paged-picker'
import { PagedPicker } from '../PagedPicker'
export function BerthPicker({
  context,
  portId,
  value,
  onChange,
  disabled,
  consultation,
  historical = false,
  retained,
}: {
  context: ArchiveContextDto
  portId: string
  value: string | null
  onChange: (value: string | null) => void
  consultation?: ConsultationPicker
  historical?: boolean
  retained?: { id: string; label: string; portId: string } | null
  disabled: boolean
}) {
  const original = retained?.portId === portId ? retained : null
  const picker = usePagedPicker({
    context,
    owner: JSON.stringify(['berths', portId, historical, original?.id, retained !== undefined]),
    consultation,
    value,
    retainedId: original?.id,
    onChange,
    loadPage: (search, page) =>
      window.berths.list({
        context: { sessionId: context.sessionId },
        query: { portId, search, page, pageSize: 25, selectableOnly: !historical },
      }),
    loadOne: async (id) => {
      const r = await window.berths.history({
        context: { sessionId: context.sessionId },
        query: { id, page: 1, pageSize: 1 },
      })
      return r.ok ? { ...r, value: r.value.berth } : r
    },
    option: (b) =>
      b.portId !== portId
        ? null
        : {
            value: b.id,
            label:
              b.id === original?.id
                ? original.label
                : b.code + ' · ' + b.version.name + (b.selectable ? '' : ' · Disattivata'),
            disabled:
              !b.selectable && b.id !== original?.id && !(historical && retained === undefined),
          },
  })
  return (
    <PagedPicker
      {...picker}
      label="Banchina (facoltativa)"
      placeholder={historical && retained === undefined ? 'Tutte le banchine' : 'Non specificata'}
      clearable
      disabled={disabled}
    />
  )
}
